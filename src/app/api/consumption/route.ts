// Consumption log history API
import { NextRequest, NextResponse } from 'next/server'

async function getDb() {
  try {
    const { ensureTables } = await import('@/lib/db')
    const result = await ensureTables()
    if (result.error) {
      console.error('DB table error:', result.error)
    }
    return result.db
  } catch (error: any) {
    console.error('Failed to initialize database:', error?.message || error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) {
      return NextResponse.json([])
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: Record<string, unknown> = {}

    if (from || to) {
      where.consumedAt = {}
      if (from) (where.consumedAt as Record<string, unknown>).gte = new Date(from + 'T00:00:00.000Z')
      if (to) (where.consumedAt as Record<string, unknown>).lte = new Date(to + 'T23:59:59.999Z')
    }

    const logs = await db.consumptionLog.findMany({
      where,
      include: {
        product: true,
      },
      orderBy: {
        consumedAt: 'desc',
      },
    })

    const serialized = logs.map(log => ({
      id: log.id,
      productId: log.productId,
      product: {
        id: log.product.id,
        barcode: log.product.barcode,
        name: log.product.name,
        brand: log.product.brand,
        category: log.product.category,
        imageUrl: log.product.imageUrl,
        quantity: log.product.quantity,
        nutritionGrade: log.product.nutritionGrade,
        ingredients: log.product.ingredients,
        createdAt: log.product.createdAt.toISOString(),
        updatedAt: log.product.updatedAt.toISOString(),
      },
      quantity: log.quantity,
      consumedAs: log.consumedAs,
      recipeName: log.recipeName,
      notes: log.notes,
      consumedAt: log.consumedAt.toISOString(),
      createdAt: log.createdAt.toISOString(),
    }))

    return NextResponse.json(serialized)
  } catch (error) {
    console.error('Error al obtener historial de consumo:', error)
    return NextResponse.json([])
  }
}
