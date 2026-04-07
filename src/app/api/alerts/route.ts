import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
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

    // Serialize dates and return direct array matching InventoryItem type
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
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
