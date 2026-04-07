'use client'

import React from 'react'
import { AppProvider, useApp } from '@/components/app-context'
import { BottomNav } from '@/components/bottom-nav'
import { DashboardView } from '@/components/views/dashboard-view'
import { ScannerView } from '@/components/views/scanner-view'
import { InventoryView } from '@/components/views/inventory-view'
import { RecipesView } from '@/components/views/recipes-view'
import { ConsumptionView } from '@/components/views/consumption-view'
import { WasteView } from '@/components/views/waste-view'
import { ReportsView } from '@/components/views/reports-view'
import { motion, AnimatePresence } from 'framer-motion'

function AppContent() {
  const { currentView, isLoading } = useApp()

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />
      case 'scanner':
        return <ScannerView />
      case 'inventory':
        return <InventoryView />
      case 'recipes':
        return <RecipesView />
      case 'consumption':
        return <ConsumptionView />
      case 'waste':
        return <WasteView />
      case 'reports':
        return <ReportsView />
      default:
        return <DashboardView />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main Content */}
      <main className="flex-1 pb-20 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="px-4 py-6"
          >
            {isLoading && currentView === 'dashboard' ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-4 border-green-200 border-t-green-600 animate-spin" />
                  <p className="text-sm text-gray-500">Cargando EcoFridge...</p>
                </div>
              </div>
            ) : (
              renderView()
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
