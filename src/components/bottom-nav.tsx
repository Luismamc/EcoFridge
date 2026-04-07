'use client'

import React from 'react'
import { useApp, type ViewType } from './app-context'
import { Home, ScanBarcode, Refrigerator, ChefHat, CheckCircle, Trash2, FileBarChart } from 'lucide-react'

const tabs: { id: ViewType; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Inicio', icon: Home },
  { id: 'scanner', label: 'Escanear', icon: ScanBarcode },
  { id: 'inventory', label: 'Inventario', icon: Refrigerator },
  { id: 'recipes', label: 'Recetas', icon: ChefHat },
  { id: 'consumption', label: 'Consumidos', icon: CheckCircle },
  { id: 'waste', label: 'Desperdicio', icon: Trash2 },
  { id: 'reports', label: 'Informes', icon: FileBarChart },
]

export function BottomNav() {
  const { currentView, setCurrentView, alerts } = useApp()
  const alertCount = alerts.filter(a => !a.consumed).length

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setCurrentView(id)}
            className={`flex flex-col items-center justify-center w-full h-full relative transition-colors ${
              currentView === id
                ? 'text-green-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {id === 'dashboard' && alertCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {alertCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 font-medium">{label}</span>
            {currentView === id && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green-600 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}
