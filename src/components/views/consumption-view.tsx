'use client'

import React, { useState } from 'react'
import { useApp } from '../app-context'
import { motion } from 'framer-motion'
import { CheckCircle, ChefHat, UtensilsCrossed, CalendarDays, Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short'
  })
}

type FilterType = 'all' | 'individual' | 'recipe'

export function ConsumptionView() {
  const { consumptionLogs, refreshConsumptionLogs } = useApp()
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  const filtered = consumptionLogs
    .filter(log => {
      if (filterType !== 'all' && log.consumedAs !== filterType) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          log.product.name.toLowerCase().includes(q) ||
          (log.product.brand && log.product.brand.toLowerCase().includes(q)) ||
          (log.recipeName && log.recipeName.toLowerCase().includes(q))
        )
      }
      return true
    })

  const individualCount = consumptionLogs.filter(l => l.consumedAs === 'individual').reduce((a, l) => a + l.quantity, 0)
  const recipeCount = consumptionLogs.filter(l => l.consumedAs === 'recipe').reduce((a, l) => a + l.quantity, 0)
  const totalQuantity = consumptionLogs.reduce((a, l) => a + l.quantity, 0)

  // Group consumed items by recipe name
  const recipeGroups: Record<string, { items: typeof consumptionLogs; totalQty: number }> = {}
  consumptionLogs.filter(l => l.consumedAs === 'recipe' && l.recipeName).forEach(log => {
    const key = log.recipeName!
    if (!recipeGroups[key]) recipeGroups[key] = { items: [], totalQty: 0 }
    recipeGroups[key].items.push(log)
    recipeGroups[key].totalQty += log.quantity
  })

  // Group by date
  const groupedByDate: Record<string, typeof consumptionLogs> = {}
  filtered.forEach(log => {
    const dateKey = log.consumedAt.split('T')[0]
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = []
    groupedByDate[dateKey].push(log)
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historial de Consumo</h1>
        <p className="text-sm text-gray-500 mt-0.5">Registro de todos los productos consumidos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-green-50 border-0">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-green-700">{totalQuantity}</p>
            <p className="text-[10px] text-gray-600">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-0">
          <CardContent className="p-3 text-center">
            <UtensilsCrossed className="w-4 h-4 text-blue-500 mx-auto mb-0.5" />
            <p className="text-xl font-bold text-blue-700">{individualCount}</p>
            <p className="text-[10px] text-gray-600">Individual</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-0">
          <CardContent className="p-3 text-center">
            <ChefHat className="w-4 h-4 text-purple-500 mx-auto mb-0.5" />
            <p className="text-xl font-bold text-purple-700">{recipeCount}</p>
            <p className="text-[10px] text-gray-600">En receta</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar producto o receta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
          <SelectTrigger className="w-36">
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="individual">🍽️ Individual</SelectItem>
            <SelectItem value="recipe">👨‍🍳 En receta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Recipe Summary */}
      {filterType !== 'individual' && Object.keys(recipeGroups).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <ChefHat className="w-4 h-4 text-purple-500" />
              Productos consumidos por receta
            </h3>
            <div className="space-y-2">
              {Object.entries(recipeGroups)
                .sort((a, b) => b[1].totalQty - a[1].totalQty)
                .map(([recipe, data]) => (
                  <div key={recipe} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 flex-1 truncate">{recipe}</span>
                    <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700">
                      {data.totalQty} uds · {data.items.length} productos
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consumption Log grouped by date */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-5xl mb-3">🍽️</div>
            <h3 className="text-lg font-semibold text-gray-700">Sin registros de consumo</h3>
            <p className="text-sm text-gray-500 mt-1">
              Cuando consumas productos del inventario, aparecerán aquí
            </p>
          </motion.div>
        ) : (
          Object.entries(groupedByDate)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([dateKey, logs]) => (
              <div key={dateKey} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    {formatDate(dateKey)}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    ({logs.reduce((a, l) => a + l.quantity, 0)} uds)
                  </span>
                </div>
                {logs.map((log, idx) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <Card className="border-green-100">
                      <CardContent className="p-3 flex items-center gap-3">
                        {log.product.imageUrl ? (
                          <img src={log.product.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 opacity-80" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center text-lg flex-shrink-0">
                            {log.consumedAs === 'recipe' ? '👨‍🍳' : '✅'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{log.product.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {log.product.brand || 'Sin marca'} · {log.quantity} ud{log.quantity > 1 ? 's' : ''}
                          </p>
                          {log.consumedAs === 'recipe' && log.recipeName && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <ChefHat className="w-3 h-3 text-purple-500" />
                              <span className="text-[10px] text-purple-600 font-medium truncate">{log.recipeName}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0 gap-1">
                          <Badge
                            className={`text-[10px] ${
                              log.consumedAs === 'recipe'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {log.consumedAs === 'recipe' ? 'Receta' : 'Individual'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ))
        )}
      </div>
    </div>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}
