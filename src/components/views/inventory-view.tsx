'use client'

import React, { useState } from 'react'
import { useApp } from '../app-context'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, CheckCircle2, Trash2, AlertTriangle, Package, ArrowUpDown, Pencil, ChefHat, UtensilsCrossed, CalendarDays, MapPin, X, ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

function getDaysUntilExpiry(dateStr: string) {
  const now = new Date()
  const expiry = new Date(dateStr)
  const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

function toDateInputValue(isoStr: string | null) {
  if (!isoStr) return ''
  return isoStr.split('T')[0]
}

function parseAllergens(allergens: string | null): string[] {
  if (!allergens) return []
  try {
    const parsed = JSON.parse(allergens)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

type FilterLocation = 'all' | 'fridge' | 'pantry' | 'freezer'
type SortBy = 'expiry' | 'name' | 'added'
type ConsumeType = 'individual' | 'recipe'

const locationOptions = [
  { value: 'fridge' as const, label: 'Nevera', emoji: '🧊', color: 'border-blue-300 bg-blue-50 text-blue-700' },
  { value: 'pantry' as const, label: 'Despensa', emoji: '🏪', color: 'border-amber-300 bg-amber-50 text-amber-700' },
  { value: 'freezer' as const, label: 'Congelador', emoji: '❄️', color: 'border-cyan-300 bg-cyan-50 text-cyan-700' },
]

const ALLERGEN_EMOJIS: Record<string, string> = {
  'gluten': '🌾',
  'lactosa': '🥛',
  'frutos secos': '🥜',
  'huevos': '🥚',
  'soja': '🫘',
  'pescado': '🐟',
  'mariscos': '🦐',
  'mostaza': '🟡',
  'apio': '🥬',
  'sesamo': '⚪',
  'sulfitos': '🧪',
  'moluscos': '🐚',
  'dairy': '🥛',
  'eggs': '🥚',
  'nuts': '🥜',
  'peanuts': '🥜',
  'fish': '🐟',
  'shellfish': '🦐',
  'soy': '🫘',
  'wheat': '🌾',
  'milk': '🥛',
  'celery': '🥬',
  'mustard': '🟡',
  'lupin': '🌸',
  'molluscs': '🐚',
}

function getAllergenEmoji(allergen: string): string {
  const lower = allergen.toLowerCase()
  for (const [key, emoji] of Object.entries(ALLERGEN_EMOJIS)) {
    if (lower.includes(key)) return emoji
  }
  return '⚠️'
}

export function InventoryView() {
  const { inventory, refreshAll } = useApp()
  const [search, setSearch] = useState('')
  const [filterLocation, setFilterLocation] = useState<FilterLocation>('all')
  const [sortBy, setSortBy] = useState<SortBy>('expiry')

  // Dialog states
  const [consumeDialog, setConsumeDialog] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)
  const [editDialog, setEditDialog] = useState<string | null>(null)
  const [allergenDialog, setAllergenDialog] = useState<string | null>(null)

  // Consume form state
  const [consumeType, setConsumeType] = useState<ConsumeType>('individual')
  const [recipeName, setRecipeName] = useState('')

  // Edit form state
  const [editQuantity, setEditQuantity] = useState('1')
  const [editLocation, setEditLocation] = useState<'fridge' | 'pantry' | 'freezer'>('fridge')
  const [editExpiration, setEditExpiration] = useState('')

  const activeItems = inventory.filter(i => !i.consumed)

  // Check items with allergens
  const itemsWithAllergens = activeItems.filter(i => {
    const allergens = parseAllergens(i.product.allergens)
    return allergens.length > 0
  })

  const filtered = activeItems
    .filter(item => {
      if (filterLocation !== 'all' && item.location !== filterLocation) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          item.product.name.toLowerCase().includes(q) ||
          (item.product.brand && item.product.brand.toLowerCase().includes(q)) ||
          (item.product.category && item.product.category.toLowerCase().includes(q))
        )
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'expiry':
          if (!a.expirationDate) return 1
          if (!b.expirationDate) return -1
          return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()
        case 'name':
          return a.product.name.localeCompare(b.product.name)
        case 'added':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
        default:
          return 0
      }
    })

  // Open consume dialog
  const openConsumeDialog = (itemId: string) => {
    setConsumeType('individual')
    setRecipeName('')
    setConsumeDialog(itemId)
  }

  // Open edit dialog
  const openEditDialog = (item: typeof activeItems[0]) => {
    setEditQuantity(String(item.quantity))
    setEditLocation(item.location)
    setEditExpiration(toDateInputValue(item.expirationDate))
    setEditDialog(item.id)
  }

  // Handle consume
  const handleConsume = async () => {
    if (!consumeDialog) return
    if (consumeType === 'recipe' && !recipeName.trim()) {
      toast.error('Indica el nombre de la receta')
      return
    }

    try {
      const res = await fetch(`/api/inventory/${consumeDialog}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumed: true,
          consumedAs: consumeType,
          recipeName: consumeType === 'recipe' ? recipeName.trim() : null,
        }),
      })
      if (res.ok) {
        toast.success(consumeType === 'recipe'
          ? `Consumido como parte de "${recipeName}"`
          : 'Producto marcado como consumido'
        )
        refreshAll()
      } else {
        toast.error('Error al actualizar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setConsumeDialog(null)
    }
  }

  // Handle edit
  const handleEdit = async () => {
    if (!editDialog) return
    try {
      const res = await fetch(`/api/inventory/${editDialog}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: parseInt(editQuantity) || 1,
          location: editLocation,
          expirationDate: editExpiration || null,
        }),
      })
      if (res.ok) {
        toast.success('Producto actualizado')
        refreshAll()
      } else {
        toast.error('Error al actualizar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setEditDialog(null)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!deleteDialog) return
    try {
      const res = await fetch(`/api/inventory/${deleteDialog}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Producto eliminado del inventario')
        refreshAll()
      } else {
        toast.error('Error al eliminar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setDeleteDialog(null)
    }
  }

  const locationLabels: Record<string, { label: string; emoji: string }> = {
    fridge: { label: 'Nevera', emoji: '🧊' },
    pantry: { label: 'Despensa', emoji: '🏪' },
    freezer: { label: 'Congelador', emoji: '❄️' },
  }

  const getCategoryStats = () => {
    const stats: Record<string, number> = {}
    activeItems.forEach(item => {
      const cat = item.product.category || 'Otros'
      stats[cat] = (stats[cat] || 0) + item.quantity
    })
    return Object.entries(stats).sort((a, b) => b[1] - a[1])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeItems.length} productos activos</p>
        </div>
        <div className="flex items-center gap-2">
          {itemsWithAllergens.length > 0 && (
            <Badge variant="outline" className="text-xs font-normal border-orange-300 text-orange-600">
              <ShieldAlert className="w-3 h-3 mr-1" />
              {itemsWithAllergens.length} con alérgenos
            </Badge>
          )}
          <Badge variant="outline" className="text-xs font-normal">
            <Package className="w-3 h-3 mr-1" />
            {activeItems.reduce((acc, i) => acc + i.quantity, 0)} unidades
          </Badge>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterLocation} onValueChange={(v) => setFilterLocation(v as FilterLocation)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Ubicación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="fridge">🧊 Nevera</SelectItem>
            <SelectItem value="pantry">🏪 Despensa</SelectItem>
            <SelectItem value="freezer">❄️ Congelador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
          <SelectTrigger className="w-auto flex-1">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expiry">Por caducidad</SelectItem>
            <SelectItem value="name">Por nombre</SelectItem>
            <SelectItem value="added">Por fecha añadido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category Stats */}
      {activeItems.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {getCategoryStats().slice(0, 6).map(([cat, count]) => (
            <Badge key={cat} variant="secondary" className="whitespace-nowrap text-xs">
              {cat} ({count})
            </Badge>
          ))}
        </div>
      )}

      {/* Items List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-5xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold text-gray-700">
              {search || filterLocation !== 'all' ? 'No hay resultados' : 'Inventario vacío'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {search || filterLocation !== 'all'
                ? 'Prueba con otros filtros de búsqueda'
                : 'Escanea productos para añadirlos a tu inventario'}
            </p>
          </motion.div>
        )}

        {filtered.map((item, index) => {
          const days = item.expirationDate ? getDaysUntilExpiry(item.expirationDate) : null
          const isExpired = days !== null && days < 0
          const isUrgent = days !== null && days >= 0 && days <= 2
          const loc = locationLabels[item.location]
          const allergens = parseAllergens(item.product.allergens)

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className={`overflow-hidden ${isExpired ? 'border-red-200' : isUrgent ? 'border-amber-200' : allergens.length > 0 ? 'border-orange-100' : ''}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Product Image */}
                    {item.product.imageUrl ? (
                      <img src={item.product.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                        📦
                      </div>
                    )}

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm truncate">{item.product.name}</p>
                        {allergens.length > 0 && (
                          <button
                            onClick={() => setAllergenDialog(item.id)}
                            className="flex-shrink-0"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-orange-500 hover:text-orange-600" />
                          </button>
                        )}
                        {isExpired && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {item.product.brand || 'Sin marca'} · {item.quantity} {loc.emoji} {loc.label}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {item.expirationDate && (
                          <Badge
                            variant={isExpired ? 'destructive' : isUrgent ? 'destructive' : 'outline'}
                            className={`text-[10px] ${!isExpired && !isUrgent ? 'text-gray-500' : ''}`}
                          >
                            {isExpired ? `Caducado hace ${Math.abs(days)}d` : days === 0 ? 'Caduca hoy' : `Caduca en ${days}d`}
                          </Badge>
                        )}
                        {item.product.nutritionGrade && (
                          <Badge className={`text-[10px] ${
                            item.product.nutritionGrade === 'a' || item.product.nutritionGrade === 'b'
                              ? 'bg-green-100 text-green-700'
                              : item.product.nutritionGrade === 'c'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {item.product.nutritionGrade.toUpperCase()}
                          </Badge>
                        )}
                        {allergens.length > 0 && (
                          <Badge className="text-[10px] bg-orange-100 text-orange-700 cursor-pointer hover:bg-orange-200"
                            onClick={() => setAllergenDialog(item.id)}>
                            {allergens.slice(0, 2).map(a => getAllergenEmoji(a)).join(' ')} +{allergens.length}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <div className="flex gap-0.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConsumeDialog(item.id)}
                          className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Marcar como consumido"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(item)}
                          className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                          title="Editar producto"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteDialog(item.id)}
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {item.expirationDate && (
                    <p className="text-[10px] text-gray-400 mt-1.5 ml-[68px]">
                      Caducidad: {formatDate(item.expirationDate)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* ===== ALLERGEN DETAIL DIALOG ===== */}
      <Dialog open={!!allergenDialog} onOpenChange={(open) => { if (!open) setAllergenDialog(null) }}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-orange-500" />
              Información de Alérgenos
            </DialogTitle>
            <DialogDescription>
              Revisa los alérgenos detectados en este producto antes de consumirlo.
            </DialogDescription>
          </DialogHeader>

          {allergenDialog && (() => {
            const item = activeItems.find(i => i.id === allergenDialog)
            if (!item) return null
            const allergens = parseAllergens(item.product.allergens)
            return (
              <div className="space-y-4 mt-2">
                {/* Product Info */}
                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                  {item.product.imageUrl ? (
                    <img src={item.product.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-lg">📦</div>
                  )}
                  <div>
                    <p className="font-semibold text-sm">{item.product.name}</p>
                    <p className="text-xs text-gray-500">{item.product.brand || 'Sin marca'}</p>
                  </div>
                </div>

                {/* Allergens List */}
                {allergens.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Alérgenos detectados:</p>
                    <div className="space-y-1.5">
                      {allergens.map((allergen, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-100">
                          <span className="text-lg">{getAllergenEmoji(allergen)}</span>
                          <span className="text-sm font-medium text-red-700 capitalize">{allergen}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <span className="text-3xl">✅</span>
                    <p className="text-sm text-green-600 mt-2 font-medium">No se detectaron alérgenos</p>
                  </div>
                )}

                {/* Raw allergens text */}
                {item.product.allergensTags && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Texto original de alérgenos:</p>
                    <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                      {item.product.allergensTags}
                    </p>
                  </div>
                )}

                {/* Warning */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-700">
                    <strong>Aviso:</strong> La información de alérgenos se obtiene de Open Food Facts.
                    Siempre verifica el etiquetado del producto antes de consumirlo, especialmente si tienes alergias graves.
                  </p>
                </div>

                <Button onClick={() => setAllergenDialog(null)} className="w-full">
                  Entendido
                </Button>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ===== CONSUME DIALOG ===== */}
      <Dialog open={!!consumeDialog} onOpenChange={(open) => { if (!open) setConsumeDialog(null) }}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>¿Consumiste este producto?</DialogTitle>
            <DialogDescription>
              Se registrará la fecha de consumo y dejará de aparecer en tu inventario activo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Consumption Type */}
            <div>
              <Label className="text-sm font-medium text-gray-700">¿Cómo lo consumiste?</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => setConsumeType('individual')}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    consumeType === 'individual'
                      ? 'border-green-400 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <UtensilsCrossed className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs font-medium block">Individual</span>
                  <span className="text-[10px] opacity-70">Directamente</span>
                </button>
                <button
                  onClick={() => setConsumeType('recipe')}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    consumeType === 'recipe'
                      ? 'border-purple-400 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <ChefHat className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs font-medium block">En receta</span>
                  <span className="text-[10px] opacity-70">Como ingrediente</span>
                </button>
              </div>
            </div>

            {/* Recipe name (only if recipe) */}
            <AnimatePresence>
              {consumeType === 'recipe' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Label className="text-sm font-medium text-gray-700">Nombre de la receta</Label>
                  <Input
                    placeholder="Ej: Tortilla de patatas"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    className="mt-1.5"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-3 mt-2">
              <Button onClick={() => setConsumeDialog(null)} variant="outline" className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleConsume}
                className={`flex-1 ${consumeType === 'recipe' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {consumeType === 'recipe' ? 'Consumido en receta' : 'Consumido'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT DIALOG ===== */}
      <Dialog open={!!editDialog} onOpenChange={(open) => { if (!open) setEditDialog(null) }}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
            <DialogDescription>
              Modifica los datos del producto en tu inventario.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Quantity */}
            <div>
              <Label className="text-sm font-medium text-gray-700">Cantidad</Label>
              <div className="flex items-center gap-3 mt-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setEditQuantity(String(Math.max(1, parseInt(editQuantity) - 1)))}
                  className="w-10 h-10 rounded-full"
                >
                  -
                </Button>
                <Input
                  type="number"
                  min="1"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className="w-20 text-center text-lg font-bold"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setEditQuantity(String(parseInt(editQuantity) + 1))}
                  className="w-10 h-10 rounded-full"
                >
                  +
                </Button>
              </div>
            </div>

            {/* Location */}
            <div>
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Ubicación
              </Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {locationOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setEditLocation(opt.value)}
                    className={`p-2.5 rounded-xl border-2 transition-all text-center ${
                      editLocation === opt.value ? opt.color : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg block">{opt.emoji}</span>
                    <span className="text-[10px] font-medium mt-0.5 block">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Expiration Date */}
            <div>
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                Fecha de caducidad
              </Label>
              <Input
                type="date"
                value={editExpiration}
                onChange={(e) => setEditExpiration(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div className="flex gap-3 mt-2">
              <Button onClick={() => setEditDialog(null)} variant="outline" className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleEdit}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Guardar cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE DIALOG ===== */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(null) }}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>¿Eliminar este producto?</DialogTitle>
            <DialogDescription>
              Si lo tiraste a la basura, considera registrarlo como desperdicio para tus estadísticas.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            <Button onClick={() => setDeleteDialog(null)} variant="outline">
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              className="bg-red-500 hover:bg-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar del inventario
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
