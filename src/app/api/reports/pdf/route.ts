import { NextRequest, NextResponse } from 'next/server'

async function getDb() {
  try {
    const { ensureTables } = await import('@/lib/db')
    return await ensureTables()
  } catch {
    return null
  }
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${months[parseInt(month) - 1]} ${year}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const to = searchParams.get('to') || new Date().toISOString().split('T')[0]

    const consumptionWhere: Record<string, unknown> = {}
    if (from || to) {
      consumptionWhere.consumedAt = {}
      if (from) (consumptionWhere.consumedAt as Record<string, unknown>).gte = new Date(from + 'T00:00:00.000Z')
      if (to) (consumptionWhere.consumedAt as Record<string, unknown>).lte = new Date(to + 'T23:59:59.999Z')
    }

    const consumptionLogs = await db.consumptionLog.findMany({
      where: consumptionWhere,
      include: { product: true },
    })

    const totalConsumed = consumptionLogs.reduce((sum, log) => sum + log.quantity, 0)

    const consumedByType: Record<string, number> = { individual: 0, recipe: 0 }
    const consumedByRecipe: Record<string, number> = {}
    for (const log of consumptionLogs) {
      const type = log.consumedAs || 'individual'
      consumedByType[type] = (consumedByType[type] || 0) + log.quantity
      if (type === 'recipe' && log.recipeName) {
        consumedByRecipe[log.recipeName] = (consumedByRecipe[log.recipeName] || 0) + log.quantity
      }
    }

    const wasteWhere: Record<string, unknown> = {}
    if (from || to) {
      wasteWhere.discardedAt = {}
      if (from) (wasteWhere.discardedAt as Record<string, unknown>).gte = new Date(from + 'T00:00:00.000Z')
      if (to) (wasteWhere.discardedAt as Record<string, unknown>).lte = new Date(to + 'T23:59:59.999Z')
    }

    const wasteLogs = await db.wasteLog.findMany({
      where: wasteWhere,
      include: { product: true },
    })

    const totalWasted = wasteLogs.reduce((sum, log) => sum + log.quantity, 0)

    const totalInventory = await db.inventoryItem.count({ where: { consumed: false } })

    const totalProcessed = totalConsumed + totalWasted
    const efficiencyRate = totalProcessed > 0 ? Math.round((totalConsumed / totalProcessed) * 1000) / 10 : 100

    const wasteByReason: Record<string, number> = {}
    const reasonLabels: Record<string, string> = {
      expired: 'Caducado', spoiled: 'Estropeado', excess: 'Sobrante', taste: 'No me gustó', other: 'Otro',
    }
    for (const log of wasteLogs) {
      const reason = reasonLabels[log.reason || ''] || log.reason || 'Sin especificar'
      wasteByReason[reason] = (wasteByReason[reason] || 0) + log.quantity
    }

    const wasteByCategory: Record<string, number> = {}
    for (const log of wasteLogs) {
      const category = log.product?.category?.split(',')[0]?.trim() || 'Sin categoría'
      wasteByCategory[category] = (wasteByCategory[category] || 0) + log.quantity
    }

    const monthlyTrends: Record<string, { consumedIndividual: number; consumedRecipe: number; wasted: number }> = {}
    for (const log of consumptionLogs) {
      const mk = log.consumedAt.toISOString().slice(0, 7)
      if (!monthlyTrends[mk]) monthlyTrends[mk] = { consumedIndividual: 0, consumedRecipe: 0, wasted: 0 }
      if (log.consumedAs === 'recipe') monthlyTrends[mk].consumedRecipe += log.quantity
      else monthlyTrends[mk].consumedIndividual += log.quantity
    }
    for (const log of wasteLogs) {
      const mk = log.discardedAt.toISOString().slice(0, 7)
      if (!monthlyTrends[mk]) monthlyTrends[mk] = { consumedIndividual: 0, consumedRecipe: 0, wasted: 0 }
      monthlyTrends[mk].wasted += log.quantity
    }

    const reasonRows = Object.entries(wasteByReason).sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => `<tr><td>${reason}</td><td style="text-align:center">${count}</td></tr>`).join('')

    const categoryRows = Object.entries(wasteByCategory).sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `<tr><td>${cat}</td><td style="text-align:center">${count}</td></tr>`).join('')

    const trendRows = Object.entries(monthlyTrends).sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => {
        const total = data.consumedIndividual + data.consumedRecipe + data.wasted
        return `<tr><td>${formatMonth(month)}</td><td style="text-align:center;color:#3b82f6">${data.consumedIndividual}</td><td style="text-align:center;color:#9333ea">${data.consumedRecipe}</td><td style="text-align:center;color:#dc2626">${data.wasted}</td><td style="text-align:center">${total}</td></tr>`
      }).join('')

    const recipeRows = Object.entries(consumedByRecipe).sort((a, b) => b[1] - a[1])
      .map(([recipe, count]) => `<tr><td>${recipe}</td><td style="text-align:center">${count}</td></tr>`).join('')

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe EcoFridge</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { background: linear-gradient(135deg, #16a34a, #059669); color: white; padding: 30px; border-radius: 16px; margin-bottom: 30px; }
  .header h1 { font-size: 28px; margin-bottom: 5px; }
  .header p { opacity: 0.9; font-size: 14px; }
  .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 30px; }
  .stat-card { padding: 20px; border-radius: 12px; text-align: center; }
  .stat-card.green { background: #f0fdf4; }
  .stat-card.blue { background: #eff6ff; }
  .stat-card.red { background: #fef2f2; }
  .stat-card.purple { background: #faf5ff; }
  .stat-card.amber { background: #fffbeb; }
  .stat-card .number { font-size: 28px; font-weight: 700; }
  .stat-card.green .number { color: #16a34a; }
  .stat-card.blue .number { color: #2563eb; }
  .stat-card.red .number { color: #dc2626; }
  .stat-card.purple .number { color: #9333ea; }
  .stat-card.amber .number { color: #d97706; }
  .stat-card .label { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .section { margin-bottom: 24px; }
  .section h2 { font-size: 16px; color: #374151; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f3f4f6; padding: 8px 12px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; color: #6b7280; }
  td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
  tr:last-child td { border-bottom: none; }
  .consumption-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .consumption-card { padding: 16px; border-radius: 10px; text-align: center; }
  .consumption-card .number { font-size: 24px; font-weight: 700; }
  .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #f3f4f6; }
</style>
</head>
<body>
  <div class="header">
    <h1>EcoFridge</h1>
    <p>Informe de Consumo y Desperdicio Alimentario</p>
    <p style="margin-top:8px;font-size:13px;opacity:0.8">${formatDate(from)} - ${formatDate(to)}</p>
  </div>

  <div class="stats">
    <div class="stat-card green">
      <div class="number">${totalInventory}</div>
      <div class="label">En inventario</div>
    </div>
    <div class="stat-card blue">
      <div class="number">${totalConsumed}</div>
      <div class="label">Consumidos</div>
    </div>
    <div class="stat-card red">
      <div class="number">${totalWasted}</div>
      <div class="label">Desperdiciados</div>
    </div>
    <div class="stat-card amber">
      <div class="number">${efficiencyRate}%</div>
      <div class="label">Tasa de eficiencia</div>
    </div>
  </div>

  ${totalConsumed > 0 ? `
  <div class="section">
    <h2>Consumo por tipo</h2>
    <div class="consumption-grid">
      <div class="consumption-card" style="background:#eff6ff">
        <div class="number" style="color:#2563eb">${consumedByType.individual || 0}</div>
        <div class="label">Consumo individual</div>
      </div>
      <div class="consumption-card" style="background:#faf5ff">
        <div class="number" style="color:#9333ea">${consumedByType.recipe || 0}</div>
        <div class="label">Consumo en receta</div>
      </div>
    </div>
    ${recipeRows ? `
    <h3 style="font-size:14px;color:#374151;margin-bottom:8px;margin-top:12px">Desglose por receta</h3>
    <table>
      <thead><tr><th>Receta</th><th style="text-align:center">Productos</th></tr></thead>
      <tbody>${recipeRows}</tbody>
    </table>` : ''}
  </div>` : ''}

  ${reasonRows ? `
  <div class="section">
    <h2>Desperdicio por motivo</h2>
    <table>
      <thead><tr><th>Motivo</th><th style="text-align:center">Cantidad</th></tr></thead>
      <tbody>${reasonRows}</tbody>
    </table>
  </div>` : ''}

  ${categoryRows ? `
  <div class="section">
    <h2>Desperdicio por categoría</h2>
    <table>
      <thead><tr><th>Categoría</th><th style="text-align:center">Cantidad</th></tr></thead>
      <tbody>${categoryRows}</tbody>
    </table>
  </div>` : ''}

  ${trendRows ? `
  <div class="section">
    <h2>Tendencia mensual</h2>
    <table>
      <thead><tr><th>Mes</th><th style="text-align:center">Individual</th><th style="text-align:center">En receta</th><th style="text-align:center">Desperdiciados</th><th style="text-align:center">Total</th></tr></thead>
      <tbody>${trendRows}</tbody>
    </table>
  </div>` : ''}

  <div class="footer">
    <p>Generado por EcoFridge · ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <p style="margin-top:4px">Reduce tu desperdicio alimentario</p>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="ecofridge-informe-${from}-a-${to}.html"`,
      },
    })
  } catch (error) {
    console.error('Error al generar PDF:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
