import { NextResponse } from 'next/server'

export async function GET() {
  const info: Record<string, string> = {
    tursoUrl: process.env.TURSO_DATABASE_URL ? '✅ Configurada' : '❌ No configurada',
    tursoToken: process.env.TURSO_AUTH_TOKEN ? '✅ Configurado' : '❌ No configurado',
    nodeEnv: process.env.NODE_ENV || 'unknown',
    vercel: process.env.VERCEL || 'no',
  }

  try {
    const { ensureTables } = await import('@/lib/db')
    const result = await ensureTables()
    info.dbStatus = result.error ? `❌ Error: ${result.error}` : '✅ Conectada y tablas listas'

    if (!result.error) {
      const count = await result.db.product.count()
      info.productCount = String(count)
    }
  } catch (error: any) {
    info.dbStatus = `❌ ${error?.message || String(error)}`
  }

  return NextResponse.json(info)
}
