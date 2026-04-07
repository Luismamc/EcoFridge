'use client'

import React from 'react'
import { useApp } from '../app-context'
import { motion } from 'framer-motion'
import { AlertTriangle, Clock, TrendingDown, Package, ArrowRight, Leaf } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short'
  })
}

function getDaysUntilExpiry(dateStr: string) {
  const now = new Date()
  const expiry = new Date(dateStr)
  const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

export function DashboardView() {
  const { inventory, wasteLogs, alerts, setCurrentView } = useApp()

  const activeItems = inventory.filter(i => !i.consumed)
  const expiringSoon = alerts.filter(a => !a.consumed)
  const totalWasted = wasteLogs.reduce((acc, w) => acc + w.quantity, 0)
  const totalConsumed = inventory.filter(i => i.consumed).length

  const stats = [
    {
      label: 'En inventario',
      value: activeItems.length,
      icon: Package,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Por caducar',
      value: expiringSoon.length,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Consumidos',
      value: totalConsumed,
      icon: TrendingDown,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Desperdiciados',
      value: totalWasted,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Leaf className="w-5 h-5" />
            <span className="text-green-100 font-medium text-sm">EcoFridge</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">¡Reduce tu desperdicio!</h1>
          <p className="text-green-100 text-sm">
            Gestiona tus alimentos de forma inteligente y descubre recetas con lo que tienes.
          </p>
          <Button
            onClick={() => setCurrentView('scanner')}
            className="mt-4 bg-white text-green-700 hover:bg-green-50 font-semibold rounded-full px-6"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Escanear producto
          </Button>
        </div>
        <div className="absolute top-2 right-2 opacity-20">
          <img src="/fridge-hero.png" alt="" className="w-32 h-32 object-contain" />
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={`${stat.bg} border-0`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1 font-medium">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Alerts Section */}
      {expiringSoon.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Alertas de caducidad
            </h2>
            <Badge variant="destructive" className="rounded-full">
              {expiringSoon.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {expiringSoon.slice(0, 5).map((item) => {
              const days = item.expirationDate ? getDaysUntilExpiry(item.expirationDate) : null
              const isExpired = days !== null && days < 0
              const isUrgent = days !== null && days >= 0 && days <= 1
              return (
                <Card key={item.id} className={`${isExpired ? 'border-red-200 bg-red-50' : isUrgent ? 'border-amber-200 bg-amber-50' : 'border-yellow-200 bg-yellow-50'}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    {item.product.imageUrl ? (
                      <img src={item.product.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 text-lg">
                        📦
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.product.brand || 'Sin marca'} · {item.quantity} uds
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge variant={isExpired ? 'destructive' : isUrgent ? 'destructive' : 'secondary'} className="text-xs rounded-full">
                        {isExpired ? 'Caducado' : `En ${days}d`}
                      </Badge>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {item.expirationDate ? formatDate(item.expirationDate) : 'Sin fecha'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <Button
            variant="ghost"
            onClick={() => setCurrentView('inventory')}
            className="w-full mt-2 text-green-600 text-sm"
          >
            Ver todo el inventario <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-3">Acciones rápidas</h2>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentView('recipes')}
            className="h-20 flex-col gap-1 rounded-xl border-2 hover:border-green-300 hover:bg-green-50"
          >
            <span className="text-2xl">🍳</span>
            <span className="text-xs font-medium">Ver recetas</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentView('waste')}
            className="h-20 flex-col gap-1 rounded-xl border-2 hover:border-red-300 hover:bg-red-50"
          >
            <span className="text-2xl">🗑️</span>
            <span className="text-xs font-medium">Registrar basura</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentView('reports')}
            className="h-20 flex-col gap-1 rounded-xl border-2 hover:border-blue-300 hover:bg-blue-50"
          >
            <span className="text-2xl">📊</span>
            <span className="text-xs font-medium">Ver informes</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentView('inventory')}
            className="h-20 flex-col gap-1 rounded-xl border-2 hover:border-purple-300 hover:bg-purple-50"
          >
            <span className="text-2xl">📋</span>
            <span className="text-xs font-medium">Mi inventario</span>
          </Button>
        </div>
      </motion.div>

      {/* Empty State */}
      {activeItems.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <div className="text-6xl mb-4">🧊</div>
          <h3 className="text-lg font-semibold text-gray-700">Tu nevera está vacía</h3>
          <p className="text-sm text-gray-500 mt-1">
            Escanea productos para empezar a gestionar tus alimentos
          </p>
          <Button
            onClick={() => setCurrentView('scanner')}
            className="mt-4 bg-green-600 hover:bg-green-700 rounded-full"
          >
            Escanear primer producto
          </Button>
        </motion.div>
      )}
    </div>
  )
}
