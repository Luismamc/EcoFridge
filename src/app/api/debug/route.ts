import { NextResponse } from 'next/server'

export async function GET() {
  const info: Record<string, string> = {
    tursoUrl: process.env.TURSO_DATABASE_URL ? '✅ Configurada' : '❌ NO configurada',
    tursoToken: process.env.TURSO_AUTH_TOKEN ? '✅ Configurado' : '❌ NO configurado',
    nodeEnv: process.env.NODE_ENV || 'unknown',
    vercel: process.env.VERCEL ? 'yes' : 'no',
    databaseUrl: process.env.DATABASE_URL || 'NOT SET',
  }

  try {
    const { ensureTables, getDbInfo } = await import('@/lib/db')

    // Show connection config
    const dbInfo = getDbInfo()
    info.dbInfo = JSON.stringify(dbInfo)

    // Create tables and test connection
    const result = await ensureTables()
    if (result.error) {
      info.dbStatus = `❌ Error: ${result.error}`
    } else {
      info.dbStatus = '✅ Conectada y tablas listas'

      // Test real read/write by counting records
      const db = result.db
      const productCount = await db.product.count()
      const inventoryCount = await db.inventoryItem.count()
      const consumptionCount = await db.consumptionLog.count()
      const wasteCount = await db.wasteLog.count()

      info.productCount = String(productCount)
      info.inventoryCount = String(inventoryCount)
      info.consumptionCount = String(consumptionCount)
      info.wasteCount = String(wasteCount)

      if (dbInfo.usingTurso) {
        info.storage = '✅ Turso (PERMANENTE)'
      } else {
        info.storage = '⚠️ SQLite local /tmp (EFÍMERO - datos se pierden)'
      }
    }
  } catch (error: any) {
    info.dbStatus = `❌ ${error?.message || String(error)}`
  }

  return NextResponse.json(info)
}
