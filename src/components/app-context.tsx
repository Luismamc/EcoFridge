'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

// Types
export interface Product {
  id: string
  barcode: string
  name: string
  brand: string | null
  category: string | null
  imageUrl: string | null
  quantity: string | null
  nutritionGrade: string | null
  ingredients: string | null
  allergens: string | null       // JSON array of allergen names
  allergensTags: string | null   // Raw allergens text
}

export interface InventoryItem {
  id: string
  productId: string
  product: Product
  quantity: number
  location: 'fridge' | 'pantry' | 'freezer'
  expirationDate: string | null
  addedAt: string
  consumed: boolean
  consumedAt: string | null
  consumedAs: 'individual' | 'recipe'
  recipeName: string | null
}

export interface ConsumptionLog {
  id: string
  productId: string
  product: Product
  quantity: number
  consumedAs: 'individual' | 'recipe'
  recipeName: string | null
  notes: string | null
  consumedAt: string
}

export interface WasteLog {
  id: string
  productId: string
  product: Product
  quantity: number
  reason: string | null
  notes: string | null
  discardedAt: string
}

export interface Recipe {
  nombre: string
  ingredientes: string[]
  pasos: string[]
  tiempoPreparacion: string
  dificultad: string
}

export type ViewType = 'dashboard' | 'scanner' | 'inventory' | 'recipes' | 'consumption' | 'waste' | 'reports'

interface AppState {
  currentView: ViewType
  setCurrentView: (view: ViewType) => void
  inventory: InventoryItem[]
  consumptionLogs: ConsumptionLog[]
  wasteLogs: WasteLog[]
  alerts: InventoryItem[]
  refreshInventory: () => Promise<void>
  refreshConsumptionLogs: () => Promise<void>
  refreshWasteLogs: () => Promise<void>
  refreshAlerts: () => Promise<void>
  refreshAll: () => Promise<void>
  isLoading: boolean
}

const AppContext = createContext<AppState | undefined>(undefined)

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [consumptionLogs, setConsumptionLogs] = useState<ConsumptionLog[]>([])
  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>([])
  const [alerts, setAlerts] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refreshInventory = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory')
      if (res.ok) {
        const data = await res.json()
        setInventory(data)
      }
    } catch {
      toast.error('Error al cargar el inventario')
    }
  }, [])

  const refreshConsumptionLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/consumption')
      if (res.ok) {
        const data = await res.json()
        setConsumptionLogs(data)
      }
    } catch {
      // Silent fail
    }
  }, [])

  const refreshWasteLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/waste')
      if (res.ok) {
        const data = await res.json()
        setWasteLogs(data)
      }
    } catch {
      toast.error('Error al cargar los registros de desperdicio')
    }
  }, [])

  const refreshAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data)
      }
    } catch {
      // Silent fail for alerts
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setIsLoading(true)
    await Promise.all([refreshInventory(), refreshConsumptionLogs(), refreshWasteLogs(), refreshAlerts()])
    setIsLoading(false)
  }, [refreshInventory, refreshConsumptionLogs, refreshWasteLogs, refreshAlerts])

  // Initial data load and polling
  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!mounted) return
      setIsLoading(true)
      await Promise.all([refreshInventory(), refreshConsumptionLogs(), refreshWasteLogs(), refreshAlerts()])
      if (mounted) setIsLoading(false)
    }
    load()

    const interval = setInterval(async () => {
      if (mounted) await refreshAlerts()
    }, 120000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [refreshInventory, refreshConsumptionLogs, refreshWasteLogs, refreshAlerts])

  return (
    <AppContext.Provider value={{
      currentView, setCurrentView,
      inventory, consumptionLogs, wasteLogs, alerts,
      refreshInventory, refreshConsumptionLogs, refreshWasteLogs, refreshAlerts, refreshAll,
      isLoading,
    }}>
      {children}
    </AppContext.Provider>
  )
}
