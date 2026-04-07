'use client'

import React, { useState } from 'react'
import { useApp } from '../app-context'
import { motion } from 'framer-motion'
import { Trash2, AlertTriangle, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

const wasteReasons = [
  { value: 'expired', label: 'Caducado', emoji: '⏰', color: 'text-red-600' },
  { value: 'spoiled', label: 'Estropeado', emoji: '🦠', color: 'text-orange-600' },
  { value: 'excess', label: 'Sobrante', emoji: '📦', color: 'text-amber-600' },
  { value: 'taste', label: 'No me gustó', emoji: '😏', color: 'text-gray-600' },
  { value: 'other', label: 'Otro', emoji: '❓', color: 'text-gray-600' },
]

export function WasteView() {
  const { wasteLogs, inventory, refreshAll } = useApp()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedQuantity, setSelectedQuantity] = useState('1')
  const [selectedReason, setSelectedReason] = useState('')
  const [selectedNotes, setSelectedNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeItems = inventory.filter(i => !i.consumed)

  const handleLogWaste = async () => {
    if (!selectedProductId) {
      toast.error('Selecciona un producto')
      return
    }
    if (!selectedReason) {
      toast.error('Indica el motivo')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          quantity: parseInt(selectedQuantity) || 1,
          reason: selectedReason,
          notes: selectedNotes || null,
        }),
      })

      if (res.ok) {
        toast.success('Desperdicio registrado correctamente')
        setShowAddDialog(false)
        resetForm()
        refreshAll()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al registrar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedProductId('')
    setSelectedQuantity('1')
    setSelectedReason('')
    setSelectedNotes('')
  }

  const getReasonLabel = (reason: string) => {
    const found = wasteReasons.find(r => r.value === reason)
    return found ? `${found.emoji} ${found.label}` : reason || 'Sin motivo'
  }

  const getStats = () => {
    const totalQuantity = wasteLogs.reduce((acc, w) => acc + w.quantity, 0)
    const byReason: Record<string, number> = {}
    wasteLogs.forEach(w => {
      const reason = w.reason || 'Sin motivo'
      byReason[reason] = (byReason[reason] || 0) + w.quantity
    })
    return { totalQuantity, byReason }
  }

  const stats = getStats()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registro de Desperdicio</h1>
          <p className="text-sm text-gray-500 mt-0.5">Lleva control de los alimentos tirados</p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-red-500 hover:bg-red-600 rounded-full px-4"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Registrar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-red-50 border-0">
          <CardContent className="p-4 text-center">
            <Trash2 className="w-6 h-6 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-700">{stats.totalQuantity}</p>
            <p className="text-xs text-gray-600">Total desperdiciados</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-0">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-700">{wasteLogs.length}</p>
            <p className="text-xs text-gray-600">Registros</p>
          </CardContent>
        </Card>
      </div>

      {/* Waste by Reason */}
      {Object.keys(stats.byReason).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Por motivo</h3>
            <div className="space-y-2">
              {Object.entries(stats.byReason)
                .sort((a, b) => b[1] - a[1])
                .map(([reason, count]) => {
                  const maxCount = Math.max(...Object.values(stats.byReason))
                  const percentage = (count / maxCount) * 100
                  return (
                    <div key={reason} className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-24 truncate">{getReasonLabel(reason)}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-red-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-8 text-right">{count}</span>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waste Log List */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-gray-900">Historial</h2>

        {wasteLogs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-6xl mb-4">♻️</div>
            <h3 className="text-lg font-semibold text-gray-700">¡Genial, cero desperdicios!</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
              No tienes registros de alimentos tirados. ¡Sigue así!
            </p>
          </motion.div>
        ) : (
          wasteLogs.map((log, index) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className="border-red-100">
                <CardContent className="p-3 flex items-center gap-3">
                  {log.product.imageUrl ? (
                    <img src={log.product.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 opacity-75" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-lg flex-shrink-0">
                      🗑️
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{log.product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{log.quantity} ud.</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-red-500">{getReasonLabel(log.reason || '')}</span>
                    </div>
                    {log.notes && (
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">{log.notes}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-gray-400">{formatDate(log.discardedAt)}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Waste Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Registrar alimento tirado</DialogTitle>
            <DialogDescription>
              Registra los alimentos que has tenido que desechar para mejorar tus hábitos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Product Selection */}
            <div>
              <Label className="text-sm font-medium">Producto</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {activeItems.map((item) => (
                    <SelectItem key={item.id} value={item.product.id}>
                      {item.product.name} {item.product.brand ? `(${item.product.brand})` : ''} - {item.quantity} uds
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div>
              <Label className="text-sm font-medium">Cantidad</Label>
              <Input
                type="number"
                min="1"
                value={selectedQuantity}
                onChange={(e) => setSelectedQuantity(e.target.value)}
                className="mt-1.5"
              />
            </div>

            {/* Reason */}
            <div>
              <Label className="text-sm font-medium">Motivo</Label>
              <Select value={selectedReason} onValueChange={setSelectedReason}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecciona el motivo" />
                </SelectTrigger>
                <SelectContent>
                  {wasteReasons.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.emoji} {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-sm font-medium">Notas (opcional)</Label>
              <Textarea
                placeholder="Añade algún comentario..."
                value={selectedNotes}
                onChange={(e) => setSelectedNotes(e.target.value)}
                className="mt-1.5"
                rows={2}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleLogWaste}
                disabled={isSubmitting}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                Registrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
