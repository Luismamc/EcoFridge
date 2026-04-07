'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useApp, type Product } from '../app-context'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Search, Plus, CalendarDays, MapPin, Loader2, CheckCircle2, X, ShieldAlert, Receipt, ImageIcon, ChevronRight, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'

type Step = 'scan' | 'product-found' | 'add-details' | 'ticket-scan' | 'ticket-results'

function parseAllergens(allergens: string | null): string[] {
  if (!allergens) return []
  try {
    const parsed = JSON.parse(allergens)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const ALLERGEN_EMOJIS: Record<string, string> = {
  'gluten': '🌾', 'lactosa': '🥛', 'frutos secos': '🥜', 'huevos': '🥚',
  'soja': '🫘', 'pescado': '🐟', 'mariscos': '🦐', 'mostaza': '🟡',
  'apio': '🥬', 'sesamo': '⚪', 'sulfitos': '🧪', 'moluscos': '🐚',
  'dairy': '🥛', 'eggs': '🥚', 'nuts': '🥜', 'peanuts': '🥜',
  'fish': '🐟', 'shellfish': '🦐', 'soy': '🫘', 'wheat': '🌾',
  'milk': '🥛', 'celery': '🥬', 'mustard': '🟡', 'lupin': '🌸', 'molluscs': '🐚',
}

function getAllergenEmoji(allergen: string): string {
  const lower = allergen.toLowerCase()
  for (const [key, emoji] of Object.entries(ALLERGEN_EMOJIS)) {
    if (lower.includes(key)) return emoji
  }
  return '⚠️'
}

interface TicketProduct {
  id: string
  barcode: string
  name: string
  brand: string | null
  category: string | null
  imageUrl: string | null
  quantity: number
  newProduct: boolean
}

export function ScannerView() {
  const { refreshInventory } = useApp()
  const [step, setStep] = useState<Step>('scan')
  const [barcode, setBarcode] = useState('')
  const [product, setProduct] = useState<Product | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [expirationDate, setExpirationDate] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [location, setLocation] = useState<'fridge' | 'pantry' | 'freezer'>('fridge')
  const [manualName, setManualName] = useState('')
  const [manualBrand, setManualBrand] = useState('')
  const [manualCategory, setManualCategory] = useState('')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraActive, setCameraActive] = useState(false)

  // Ticket scanning state
  const [ticketImage, setTicketImage] = useState<string | null>(null)
  const [ticketProducts, setTicketProducts] = useState<TicketProduct[]>([])
  const [isScanningTicket, setIsScanningTicket] = useState(false)
  const [ticketChecked, setTicketChecked] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ticketCameraRef = useRef<HTMLVideoElement>(null)
  const [ticketCameraActive, setTicketCameraActive] = useState(false)
  const ticketCameraStreamRef = useRef<MediaStream | null>(null)

  const lookupBarcode = async (code: string) => {
    if (!code.trim()) return
    setIsSearching(true)
    try {
      const res = await fetch(`/api/barcode/lookup?barcode=${encodeURIComponent(code.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setProduct(data)
        setStep('product-found')
        toast.success('Producto encontrado')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Producto no encontrado')
      }
    } catch {
      toast.error('Error de conexión. Verifica tu internet.')
    } finally {
      setIsSearching(false)
    }
  }

  const addToInventory = async () => {
    try {
      let productId = product?.id

      if (showManualEntry && !productId) {
        const manualBarcode = `MANUAL-${Date.now()}`
        const res = await fetch('/api/barcode/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            barcode: manualBarcode,
            name: manualName,
            brand: manualBrand || null,
            category: manualCategory || null,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          productId = data.id
        } else {
          toast.error('Error al crear el producto')
          return
        }
      }

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity: parseInt(quantity) || 1,
          location,
          expirationDate: expirationDate || null,
        }),
      })

      if (res.ok) {
        toast.success('Producto añadido al inventario')
        resetForm()
        refreshInventory()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al añadir')
      }
    } catch {
      toast.error('Error de conexión')
    }
  }

  const resetForm = () => {
    setStep('scan')
    setBarcode('')
    setProduct(null)
    setExpirationDate('')
    setQuantity('1')
    setLocation('fridge')
    setManualName('')
    setManualBrand('')
    setManualCategory('')
    setShowManualEntry(false)
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
      setCameraActive(false)
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
      stopTicketCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      setCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      toast.error('No se pudo acceder a la cámara')
    }
  }

  const handleManualSubmit = () => {
    if (!manualName.trim()) {
      toast.error('El nombre del producto es obligatorio')
      return
    }
    setProduct({
      id: '',
      barcode: `MANUAL-${Date.now()}`,
      name: manualName,
      brand: manualBrand || null,
      category: manualCategory || null,
      imageUrl: null,
      quantity: null,
      nutritionGrade: null,
      ingredients: null,
      allergens: null,
      allergensTags: null,
    })
    setShowManualEntry(true)
    setStep('add-details')
  }

  // ===== TICKET SCANNING =====
  const stopTicketCamera = () => {
    if (ticketCameraStreamRef.current) {
      ticketCameraStreamRef.current.getTracks().forEach(track => track.stop())
      ticketCameraStreamRef.current = null
      setTicketCameraActive(false)
    }
  }

  const startTicketCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      ticketCameraStreamRef.current = stream
      setTicketCameraActive(true)
      if (ticketCameraRef.current) {
        ticketCameraRef.current.srcObject = stream
      }
    } catch {
      toast.error('No se pudo acceder a la cámara')
    }
  }

  const captureTicketPhoto = () => {
    if (!ticketCameraRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = ticketCameraRef.current.videoWidth || 1280
    canvas.height = ticketCameraRef.current.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(ticketCameraRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setTicketImage(dataUrl)
    stopTicketCamera()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setTicketImage(dataUrl)
    }
    reader.readAsDataURL(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const scanTicket = async () => {
    if (!ticketImage) return
    setIsScanningTicket(true)
    try {
      const res = await fetch('/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: ticketImage }),
      })

      if (res.ok) {
        const data = await res.json()
        setTicketProducts(data.products || [])
        setTicketChecked(
          (data.products || []).reduce((acc: Record<string, boolean>, p: TicketProduct) => {
            acc[p.id] = true
            return acc
          }, {})
        )
        setStep('ticket-results')
        toast.success(`${data.products?.length || 0} productos encontrados en el ticket`)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al analizar el ticket')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setIsScanningTicket(false)
    }
  }

  const addTicketProductsToInventory = async () => {
    const selectedProducts = ticketProducts.filter(p => ticketChecked[p.id])
    if (selectedProducts.length === 0) {
      toast.error('Selecciona al menos un producto')
      return
    }

    try {
      const res = await fetch('/api/inventory/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedProducts.map(p => ({
            productId: p.id,
            quantity: p.quantity || 1,
            location,
            expirationDate: expirationDate || null,
          })),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || 'Productos añadidos al inventario')
        resetTicketState()
        refreshInventory()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al añadir productos')
      }
    } catch {
      toast.error('Error de conexión')
    }
  }

  const resetTicketState = () => {
    setStep('scan')
    setTicketImage(null)
    setTicketProducts([])
    setTicketChecked({})
    stopTicketCamera()
  }

  const toggleTicketProduct = (id: string) => {
    setTicketChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const locationOptions = [
    { value: 'fridge' as const, label: 'Nevera', emoji: '🧊', color: 'border-blue-300 bg-blue-50 text-blue-700' },
    { value: 'pantry' as const, label: 'Despensa', emoji: '🏪', color: 'border-amber-300 bg-amber-50 text-amber-700' },
    { value: 'freezer' as const, label: 'Congelador', emoji: '❄️', color: 'border-cyan-300 bg-cyan-50 text-cyan-700' },
  ]

  const selectedTicketCount = ticketProducts.filter(p => ticketChecked[p.id]).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Escanear Producto</h1>
        <p className="text-sm text-gray-500 mt-1">Escanea código de barras, ticket de compra o añade manualmente</p>
      </div>

      <AnimatePresence mode="wait">
        {/* Step: Scan (Main) */}
        {step === 'scan' && (
          <motion.div
            key="scan"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => { setStep('ticket-scan'); setLocation('fridge') }}
                className="h-24 flex-col gap-2 rounded-xl border-2 hover:border-purple-300 hover:bg-purple-50 p-4"
              >
                <Receipt className="w-8 h-8 text-purple-500" />
                <div className="text-left">
                  <span className="text-sm font-semibold text-gray-800 block">Escanear ticket</span>
                  <span className="text-[10px] text-gray-500">Foto del ticket de compra</span>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={startCamera}
                className="h-24 flex-col gap-2 rounded-xl border-2 hover:border-green-300 hover:bg-green-50 p-4"
              >
                <Camera className="w-8 h-8 text-green-500" />
                <div className="text-left">
                  <span className="text-sm font-semibold text-gray-800 block">Escanear código</span>
                  <span className="text-[10px] text-gray-500">Código de barras</span>
                </div>
              </Button>
            </div>

            {/* Camera Section (for barcode) */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {cameraActive ? (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-64 h-24 border-2 border-white rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
                      </div>
                    </div>
                    <Button
                      onClick={stopCamera}
                      className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 rounded-full p-2"
                      size="icon"
                    >
                      <X className="w-4 h-4 text-white" />
                    </Button>
                  </div>
                ) : (
                  <div className="h-24 bg-gray-50 flex flex-col items-center justify-center text-gray-400">
                    <Camera className="w-8 h-8 mb-1" />
                    <span className="text-xs">Cámara desactivada</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual Barcode Input */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div>
                  <Label htmlFor="barcode" className="text-sm font-medium text-gray-700">
                    O introduce el código manualmente
                  </Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      id="barcode"
                      placeholder="Ej: 8410296001016"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && lookupBarcode(barcode)}
                    />
                    <Button
                      onClick={() => lookupBarcode(barcode)}
                      disabled={isSearching || !barcode.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSearching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">o añadir manualmente</span>
                  </div>
                </div>

                {/* Manual Product Entry */}
                <div className="space-y-2">
                  <Input
                    placeholder="Nombre del producto *"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Marca"
                      value={manualBrand}
                      onChange={(e) => setManualBrand(e.target.value)}
                    />
                    <Input
                      placeholder="Categoría"
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleManualSubmit}
                    disabled={!manualName.trim()}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Añadir producto manual
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step: Product Found */}
        {step === 'product-found' && product && (
          <motion.div
            key="found"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-green-100 flex items-center justify-center text-3xl flex-shrink-0">
                      ✓
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900">{product.name}</h3>
                    {product.brand && <p className="text-sm text-gray-600">{product.brand}</p>}
                    {product.category && (
                      <Badge variant="secondary" className="mt-1">{product.category}</Badge>
                    )}
                    {product.nutritionGrade && (
                      <div className="mt-1">
                        <Badge className={
                          product.nutritionGrade === 'a' || product.nutritionGrade === 'b'
                            ? 'bg-green-500'
                            : product.nutritionGrade === 'c'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }>
                          Nutriscore: {product.nutritionGrade.toUpperCase()}
                        </Badge>
                      </div>
                    )}
                    {/* Allergen Display */}
                    {(() => {
                      const allergens = parseAllergens(product.allergens)
                      if (allergens.length > 0) {
                        return (
                          <div className="mt-2 flex items-center gap-1.5 p-2 bg-orange-100 rounded-lg border border-orange-200">
                            <ShieldAlert className="w-4 h-4 text-orange-500 flex-shrink-0" />
                            <div className="flex flex-wrap gap-1">
                              {allergens.slice(0, 3).map((a, i) => (
                                <Badge key={i} className="text-[9px] bg-orange-200 text-orange-800 border-0">
                                  {getAllergenEmoji(a)} {a}
                                </Badge>
                              ))}
                              {allergens.length > 3 && (
                                <Badge className="text-[9px] bg-orange-200 text-orange-800 border-0">
                                  +{allergens.length - 3} más
                                </Badge>
                              )}
                            </div>
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={() => setStep('add-details')} className="w-full bg-green-600 hover:bg-green-700 h-12 text-base font-semibold">
              <CalendarDays className="w-5 h-5 mr-2" />
              Añadir fecha y ubicación
            </Button>
            <Button onClick={resetForm} variant="outline" className="w-full">
              Cancelar
            </Button>
          </motion.div>
        )}

        {/* Step: Add Details */}
        {step === 'add-details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Product Summary */}
            {product && (
              <Card>
                <CardContent className="p-3 flex items-center gap-3">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
                      📦
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.brand || 'Producto manual'}</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4 space-y-4">
                {/* Expiration Date */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Fecha de caducidad
                  </Label>
                  <Input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-gray-400 mt-1">Te avisaremos 2 días antes</p>
                </div>

                {/* Quantity */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Cantidad</Label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(String(Math.max(1, parseInt(quantity) - 1)))}
                      className="w-10 h-10 rounded-full"
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-20 text-center text-lg font-bold"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(String(parseInt(quantity) + 1))}
                      className="w-10 h-10 rounded-full"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Ubicación
                  </Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {locationOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setLocation(opt.value)}
                        className={`p-3 rounded-xl border-2 transition-all text-center ${
                          location === opt.value ? opt.color : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-xl block">{opt.emoji}</span>
                        <span className="text-xs font-medium mt-1 block">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={addToInventory}
              className="w-full bg-green-600 hover:bg-green-700 h-12 text-base font-semibold"
            >
              <Plus className="w-5 h-5 mr-2" />
              Añadir al inventario
            </Button>
            <Button onClick={() => setStep(product && product.id ? 'product-found' : 'scan')} variant="outline" className="w-full">
              Volver
            </Button>
          </motion.div>
        )}

        {/* Step: Ticket Scan */}
        {step === 'ticket-scan' && (
          <motion.div
            key="ticket-scan"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <Card className="border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold text-gray-800">Escanear Ticket de Compra</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Toma una foto al ticket de compra o selecciona una imagen de tu galería. La IA identificará los productos automáticamente.
                </p>

                {/* Camera or Image Preview */}
                {ticketCameraActive ? (
                  <div className="relative rounded-xl overflow-hidden mb-3">
                    <video
                      ref={ticketCameraRef}
                      autoPlay
                      playsInline
                      className="w-full h-72 object-cover"
                    />
                    <div className="absolute inset-0 flex items-end justify-center pb-4">
                      <Button
                        onClick={captureTicketPhoto}
                        className="bg-white text-gray-800 hover:bg-gray-100 rounded-full w-16 h-16 shadow-xl"
                        size="icon"
                      >
                        <Camera className="w-8 h-8" />
                      </Button>
                    </div>
                    <Button
                      onClick={stopTicketCamera}
                      className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 rounded-full p-2"
                      size="icon"
                    >
                      <X className="w-4 h-4 text-white" />
                    </Button>
                  </div>
                ) : ticketImage ? (
                  <div className="relative rounded-xl overflow-hidden mb-3">
                    <img src={ticketImage} alt="Ticket" className="w-full h-72 object-contain bg-gray-100" />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <Button
                        onClick={() => setTicketImage(null)}
                        className="bg-black/50 hover:bg-black/70 rounded-full p-2"
                        size="icon"
                      >
                        <X className="w-4 h-4 text-white" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 mb-3">
                    <button
                      onClick={startTicketCamera}
                      className="w-full p-6 bg-purple-50 border-2 border-dashed border-purple-200 rounded-xl flex flex-col items-center gap-2 hover:bg-purple-100 transition-colors"
                    >
                      <Camera className="w-10 h-10 text-purple-400" />
                      <span className="text-sm font-medium text-purple-600">Tomar foto al ticket</span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center gap-2 hover:bg-gray-100 transition-colors"
                    >
                      <ImageIcon className="w-10 h-10 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">Seleccionar de galería</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Default location for all ticket products */}
                <div className="mt-3">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Ubicación para todos los productos
                  </Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {locationOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setLocation(opt.value)}
                        className={`p-2.5 rounded-xl border-2 transition-all text-center ${
                          location === opt.value ? opt.color : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-lg block">{opt.emoji}</span>
                        <span className="text-[10px] font-medium mt-0.5 block">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Default expiration */}
                <div className="mt-3">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Fecha de caducidad (opcional)
                  </Label>
                  <Input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-gray-400 mt-1">Se aplicará a todos los productos del ticket</p>
                </div>

                {/* Scan button */}
                <Button
                  onClick={scanTicket}
                  disabled={!ticketImage || isScanningTicket}
                  className="w-full mt-4 bg-purple-600 hover:bg-purple-700 h-12 text-base font-semibold"
                >
                  {isScanningTicket ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analizando ticket...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Analizar ticket con IA
                    </>
                  )}
                </Button>

                <Button onClick={resetTicketState} variant="outline" className="w-full">
                  Volver al escáner
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step: Ticket Results */}
        {step === 'ticket-results' && (
          <motion.div
            key="ticket-results"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold text-gray-800">
                    {ticketProducts.length} productos encontrados
                  </h3>
                </div>
                <p className="text-sm text-gray-500">
                  Selecciona los productos que quieres añadir a tu inventario.
                </p>
              </CardContent>
            </Card>

            {/* Product list from ticket */}
            <Card>
              <CardContent className="p-3 space-y-2">
                {ticketProducts.map((prod, index) => (
                  <motion.button
                    key={prod.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => toggleTicketProduct(prod.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      ticketChecked[prod.id]
                        ? 'border-purple-300 bg-purple-50'
                        : 'border-gray-200 bg-white opacity-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                      ticketChecked[prod.id] ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                    }`}>
                      {ticketChecked[prod.id] && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{prod.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">Cantidad: {prod.quantity}</span>
                        {prod.category && (
                          <Badge variant="secondary" className="text-[9px]">{prod.category}</Badge>
                        )}
                        {prod.newProduct && (
                          <Badge className="text-[9px] bg-green-100 text-green-700 border-0">Nuevo</Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${ticketChecked[prod.id] ? 'text-purple-500' : 'text-gray-300'}`} />
                  </motion.button>
                ))}
              </CardContent>
            </Card>

            {/* Summary and add button */}
            <div className="flex items-center justify-between px-1">
              <span className="text-sm text-gray-500">
                {selectedTicketCount} de {ticketProducts.length} seleccionados
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const all: Record<string, boolean> = {}
                  ticketProducts.forEach(p => { all[p.id] = true })
                  setTicketChecked(all)
                }}
                className="text-xs"
              >
                Seleccionar todos
              </Button>
            </div>

            <Button
              onClick={addTicketProductsToInventory}
              disabled={selectedTicketCount === 0}
              className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-base font-semibold"
            >
              <Plus className="w-5 h-5 mr-2" />
              Añadir {selectedTicketCount} producto{selectedTicketCount !== 1 ? 's' : ''} al inventario
            </Button>
            <Button onClick={resetTicketState} variant="outline" className="w-full">
              Volver
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
