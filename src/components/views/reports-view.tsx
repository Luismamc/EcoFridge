'use client'

import React, { useState, useEffect } from 'react'
import { useApp } from '../app-context'
import { motion } from 'framer-motion'
import { FileBarChart, Download, Share2, CalendarDays, TrendingDown, Package, AlertTriangle, Trash2, BarChart3, PieChart as PieIcon, ChefHat, UtensilsCrossed } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface ReportData {
  totalInInventory: number
  totalConsumed: number
  totalWasted: number
  itemsExpiringSoon: number
  consumedByType: Record<string, number>
  consumedByRecipe: Record<string, number>
  consumedByCategory: Record<string, number>
  wasteByCategory: Record<string, number>
  wasteByReason: Record<string, number>
  monthlyTrends: Array<{ month: string; consumed: number; consumedIndividual: number; consumedRecipe: number; wasted: number }>
  efficiencyRate: number
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${months[parseInt(month) - 1]} ${year}`
}

const reasonLabels: Record<string, string> = {
  expired: 'Caducado',
  spoiled: 'Estropeado',
  excess: 'Sobrante',
  taste: 'No me gustó',
  other: 'Otro',
}

export function ReportsView() {
  const { wasteLogs } = useApp()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])
  const [isGenerating, setIsGenerating] = useState(false)

  const loadReport = async () => {
    setIsGenerating(true)
    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate })
      const res = await fetch(`/api/reports?${params}`)
      if (res.ok) {
        const data = await res.json()
        setReportData(data)
      } else {
        toast.error('Error al generar el informe')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [fromDate, toDate])

  const generatePdfReport = async () => {
    setIsGenerating(true)
    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate })
      const res = await fetch(`/api/reports/pdf?${params}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const printWindow = window.open(url, '_blank')
        if (printWindow) {
          printWindow.addEventListener('load', () => {
            printWindow.print()
          })
          toast.success('Informe abierto. Usa "Guardar como PDF" para descargar.')
        } else {
          const a = document.createElement('a')
          a.href = url
          a.download = `ecofridge-informe-${fromDate}-a-${toDate}.html`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          toast.success('Informe descargado. Ábrelo y usa Imprimir > Guardar como PDF')
        }
      } else {
        toast.error('Error al generar el informe')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setIsGenerating(false)
    }
  }

  const shareReport = async () => {
    const rd = reportData
    const individual = rd?.consumedByType?.individual || 0
    const recipe = rd?.consumedByType?.recipe || 0
    const text = `📊 Informe EcoFridge (${formatDate(fromDate)} - ${formatDate(toDate)})
    
🧊 En inventario: ${rd?.totalInInventory || 0}
✅ Consumidos: ${rd?.totalConsumed || 0} (🍽️ ${individual} individual · 👨‍🍳 ${recipe} en receta)
🗑️ Desperdiciados: ${rd?.totalWasted || 0}
📈 Tasa de eficiencia: ${rd?.efficiencyRate?.toFixed(1) || 0}%
⚠️ Por caducar: ${rd?.itemsExpiringSoon || 0}

¡Reduce tu desperdicio alimentario con EcoFridge!`

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Informe EcoFridge', text })
      } catch { /* User cancelled */ }
    } else {
      await navigator.clipboard.writeText(text)
      toast.success('Informe copiado al portapapeles')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Informes</h1>
        <p className="text-sm text-gray-500 mt-1">Analiza tus hábitos de consumo y desperdicio</p>
      </div>

      {/* Date Range */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Periodo</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Desde</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Hasta</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* Main Stats */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-green-50 border-0">
                <CardContent className="p-4 text-center">
                  <Package className="w-6 h-6 text-green-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-700">{reportData.totalInInventory}</p>
                  <p className="text-xs text-gray-600">En inventario</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="bg-blue-50 border-0">
                <CardContent className="p-4 text-center">
                  <TrendingDown className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-blue-700">{reportData.totalConsumed}</p>
                  <p className="text-xs text-gray-600">Consumidos</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-red-50 border-0">
                <CardContent className="p-4 text-center">
                  <Trash2 className="w-6 h-6 text-red-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-700">{reportData.totalWasted}</p>
                  <p className="text-xs text-gray-600">Desperdiciados</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className={`border-0 ${reportData.efficiencyRate >= 70 ? 'bg-emerald-50' : reportData.efficiencyRate >= 40 ? 'bg-amber-50' : 'bg-red-50'}`}>
                <CardContent className="p-4 text-center">
                  <BarChart3 className={`w-6 h-6 mx-auto mb-1 ${reportData.efficiencyRate >= 70 ? 'text-emerald-500' : reportData.efficiencyRate >= 40 ? 'text-amber-500' : 'text-red-500'}`} />
                  <p className="text-2xl font-bold">{reportData.efficiencyRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-600">Eficiencia</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Consumption by Type */}
          {reportData.totalConsumed > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                    <PieIcon className="w-4 h-4" />
                    Consumo por tipo
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                      <UtensilsCrossed className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-lg font-bold text-blue-700">{reportData.consumedByType.individual || 0}</p>
                        <p className="text-[10px] text-gray-600">Individual</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                      <ChefHat className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="text-lg font-bold text-purple-700">{reportData.consumedByType.recipe || 0}</p>
                        <p className="text-[10px] text-gray-600">En receta</p>
                      </div>
                    </div>
                  </div>
                  {Object.keys(reportData.consumedByRecipe).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-2">Desglose por receta</p>
                      <div className="space-y-1.5">
                        {Object.entries(reportData.consumedByRecipe)
                          .sort((a, b) => b[1] - a[1])
                          .map(([recipe, count]) => (
                            <div key={recipe} className="flex items-center justify-between">
                              <span className="text-xs text-gray-700 truncate mr-2">{recipe}</span>
                              <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700 flex-shrink-0">{count} uds</Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Efficiency Meter */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Nivel de eficiencia</h3>
                <div className="relative pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Baja</span>
                    <span className="text-xs text-gray-500">Alta</span>
                  </div>
                  <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-gray-100">
                    <div
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-700 ${
                        reportData.efficiencyRate >= 70 ? 'bg-green-500' : reportData.efficiencyRate >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, reportData.efficiencyRate))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Badge className={
                      reportData.efficiencyRate >= 70 ? 'bg-green-100 text-green-700' :
                      reportData.efficiencyRate >= 40 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }>
                      {reportData.efficiencyRate >= 70 ? '🌿 Excelente' :
                       reportData.efficiencyRate >= 40 ? '⚠️ Mejorable' : '🔴 Necesitas mejorar'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Waste by Category */}
          {Object.keys(reportData.wasteByCategory).length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                    <PieIcon className="w-4 h-4" />
                    Desperdicio por categoría
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(reportData.wasteByCategory)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, count]) => {
                        const max = Math.max(...Object.values(reportData.wasteByCategory))
                        const pct = (count / max) * 100
                        return (
                          <div key={cat} className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 w-28 truncate">{cat}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                              <div className="bg-red-400 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-medium text-gray-700 w-6 text-right">{count}</span>
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Waste by Reason */}
          {Object.keys(reportData.wasteByReason).length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Desperdicio por motivo</h3>
                  <div className="space-y-2">
                    {Object.entries(reportData.wasteByReason)
                      .sort((a, b) => b[1] - a[1])
                      .map(([reason, count]) => {
                        const max = Math.max(...Object.values(reportData.wasteByReason))
                        const pct = (count / max) * 100
                        return (
                          <div key={reason} className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 w-24">
                              {reasonLabels[reason] || reason}
                            </span>
                            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                              <div className="bg-orange-400 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-medium text-gray-700 w-6 text-right">{count}</span>
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Monthly Trends */}
          {reportData.monthlyTrends.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Tendencia mensual</h3>
                  <div className="space-y-3">
                    {reportData.monthlyTrends.map((trend) => {
                      const maxVal = Math.max(...reportData.monthlyTrends.map(t => Math.max(t.consumed, t.wasted)), 1)
                      return (
                        <div key={trend.month} className="space-y-1">
                          <p className="text-xs text-gray-500">{formatMonth(trend.month)}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className="flex gap-1 h-4">
                                <div className="bg-green-400 rounded-sm transition-all duration-500" style={{ width: `${(trend.consumedIndividual / maxVal) * 100}%` }} title={`Individual: ${trend.consumedIndividual}`} />
                                <div className="bg-purple-400 rounded-sm transition-all duration-500" style={{ width: `${(trend.consumedRecipe / maxVal) * 100}%` }} title={`En receta: ${trend.consumedRecipe}`} />
                                <div className="bg-red-400 rounded-sm transition-all duration-500" style={{ width: `${(trend.wasted / maxVal) * 100}%` }} title={`Desperdiciados: ${trend.wasted}`} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-green-400 rounded-sm" />
                      <span className="text-[10px] text-gray-500">Individual</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-purple-400 rounded-sm" />
                      <span className="text-[10px] text-gray-500">En receta</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-red-400 rounded-sm" />
                      <span className="text-[10px] text-gray-500">Desperdiciados</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="space-y-3">
            <Button
              onClick={generatePdfReport}
              disabled={isGenerating}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-base font-semibold"
            >
              <Download className="w-5 h-5 mr-2" />
              Descargar informe PDF
            </Button>
            <Button
              onClick={shareReport}
              variant="outline"
              className="w-full h-12 text-base font-semibold"
            >
              <Share2 className="w-5 h-5 mr-2" />
              Compartir informe
            </Button>
          </motion.div>
        </>
      )}
    </div>
  )
}
