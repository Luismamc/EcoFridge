import { NextResponse } from 'next/server'

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

export async function GET() {
  try {
    const db = await getDb()
    if (!db) {
      return NextResponse.json([])
    }

    const now = new Date()
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)

    const alertItems = await db.inventoryItem.findMany({
      where: {
        consumed: false,
        expirationDate: {
          lte: twoDaysFromNow,
        },
      },
      include: {
        product: true,
      },
      orderBy: {
        expirationDate: 'asc',
      },
    })

    const serialized = alertItems.map(item => ({
      id: item.id,
      productId: item.productId,
      product: {
        id: item.product.id,
        barcode: item.product.barcode,
        name: item.product.name,
        brand: item.product.brand,
        category: item.product.category,
        imageUrl: item.product.imageUrl,
        quantity: item.product.quantity,
        nutritionGrade: item.product.nutritionGrade,
        ingredients: item.product.ingredients,
        createdAt: item.product.createdAt.toISOString(),
        updatedAt: item.product.updatedAt.toISOString(),
      },
      quantity: item.quantity,
      location: item.location,
      expirationDate: item.expirationDate?.toISOString() ?? null,
      addedAt: item.addedAt.toISOString(),
      consumed: item.consumed,
      consumedAt: item.consumedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }))

    return NextResponse.json(serialized)
  } catch (error) {
    console.error('Error al obtener alertas:', error)
    return NextResponse.json([])
  }
}
