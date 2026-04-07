import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // Date filter for waste logs
    const wasteWhere: Record<string, unknown> = {}
    if (from || to) {
      wasteWhere.discardedAt = {}
      if (from) (wasteWhere.discardedAt as Record<string, unknown>).gte = new Date(from + 'T00:00:00.000Z')
      if (to) (wasteWhere.discardedAt as Record<string, unknown>).lte = new Date(to + 'T23:59:59.999Z')
    }

    // Date filter for consumption logs
    const consumptionWhere: Record<string, unknown> = {}
    if (from || to) {
      consumptionWhere.consumedAt = {}
      if (from) (consumptionWhere.consumedAt as Record<string, unknown>).gte = new Date(from + 'T00:00:00.000Z')
      if (to) (consumptionWhere.consumedAt as Record<string, unknown>).lte = new Date(to + 'T23:59:59.999Z')
    }

    // Total items in inventory (not consumed)
    const totalInventory = await db.inventoryItem.count({
      where: { consumed: false },
    })

    // Consumption logs in period
    const consumptionLogs = await db.consumptionLog.findMany({
      where: consumptionWhere,
      include: { product: true },
    })

    const totalConsumed = consumptionLogs.reduce((sum, log) => sum + log.quantity, 0)

    // Consumption by type (individual vs recipe)
    const consumedByType: Record<string, number> = { individual: 0, recipe: 0 }
    for (const log of consumptionLogs) {
      const type = log.consumedAs || 'individual'
      consumedByType[type] = (consumedByType[type] || 0) + log.quantity
    }

    // Consumption by recipe name
    const consumedByRecipe: Record<string, number> = {}
    for (const log of consumptionLogs) {
      if (log.consumedAs === 'recipe' && log.recipeName) {
        consumedByRecipe[log.recipeName] = (consumedByRecipe[log.recipeName] || 0) + log.quantity
      }
    }

    // Consumption by category
    const consumedByCategory: Record<string, number> = {}
    for (const log of consumptionLogs) {
      const category = log.product?.category?.split(',')[0]?.trim() || 'Sin categoría'
      consumedByCategory[category] = (consumedByCategory[category] || 0) + log.quantity
    }

    // Items expiring soon (within 2 days)
    const now = new Date()
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    const expiredAndExpiring = await db.inventoryItem.count({
      where: {
        consumed: false,
        expirationDate: {
          lte: twoDaysFromNow,
        },
      },
    })

    // Waste logs
    const wasteLogs = await db.wasteLog.findMany({
      where: wasteWhere,
      include: { product: true },
    })

    const totalWasted = wasteLogs.reduce((sum, log) => sum + log.quantity, 0)

    // Waste by category
    const wasteByCategory: Record<string, number> = {}
    for (const log of wasteLogs) {
      const category = log.product?.category?.split(',')[0]?.trim() || 'Sin categoría'
      wasteByCategory[category] = (wasteByCategory[category] || 0) + log.quantity
    }

    // Waste by reason
    const wasteByReason: Record<string, number> = {}
    for (const log of wasteLogs) {
      const reason = log.reason || 'Sin razón especificada'
      wasteByReason[reason] = (wasteByReason[reason] || 0) + log.quantity
    }

    // Monthly trends
    const monthlyTrends: Record<string, { consumed: number; consumedIndividual: number; consumedRecipe: number; wasted: number }> = {}

    for (const log of consumptionLogs) {
      const monthKey = log.consumedAt.toISOString().slice(0, 7)
      if (!monthlyTrends[monthKey]) monthlyTrends[monthKey] = { consumed: 0, consumedIndividual: 0, consumedRecipe: 0, wasted: 0 }
      monthlyTrends[monthKey].consumed += log.quantity
      if (log.consumedAs === 'recipe') {
        monthlyTrends[monthKey].consumedRecipe += log.quantity
      } else {
        monthlyTrends[monthKey].consumedIndividual += log.quantity
      }
    }

    for (const log of wasteLogs) {
      const monthKey = log.discardedAt.toISOString().slice(0, 7)
      if (!monthlyTrends[monthKey]) monthlyTrends[monthKey] = { consumed: 0, consumedIndividual: 0, consumedRecipe: 0, wasted: 0 }
      monthlyTrends[monthKey].wasted += log.quantity
    }

    const monthlyTrendsArray = Object.entries(monthlyTrends)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }))

    // Efficiency rate: consumed / (consumed + wasted) * 100
    const totalProcessed = totalConsumed + totalWasted
    const efficiencyRate = totalProcessed > 0 ? (totalConsumed / totalProcessed) * 100 : 100

    return NextResponse.json({
      totalInInventory: totalInventory,
      totalConsumed,
      totalWasted,
      itemsExpiringSoon: expiredAndExpiring,
      consumedByType,
      consumedByRecipe,
      consumedByCategory,
      wasteByCategory,
      wasteByReason,
      monthlyTrends: monthlyTrendsArray,
      efficiencyRate: Math.round(efficiencyRate * 10) / 10,
    })
  } catch (error) {
    console.error('Error al generar informe:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
