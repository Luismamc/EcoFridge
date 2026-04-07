import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface BatchItem {
  productId: string
  quantity: number
  location: string
  expirationDate: string | null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items } = body as { items: BatchItem[] }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'La lista de productos es obligatoria' },
        { status: 400 }
      )
    }

    const results = []

    for (const item of items) {
      // Verify product exists
      const product = await db.product.findUnique({
        where: { id: item.productId },
      })

      if (!product) {
        results.push({ error: `Producto no encontrado: ${item.productId}`, success: false })
        continue
      }

      const inventoryItem = await db.inventoryItem.create({
        data: {
          productId: item.productId,
          quantity: item.quantity || 1,
          location: item.location || 'fridge',
          expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
        },
        include: { product: true },
      })

      results.push({
        id: inventoryItem.id,
        productId: inventoryItem.productId,
        product: inventoryItem.product,
        quantity: inventoryItem.quantity,
        location: inventoryItem.location,
        expirationDate: inventoryItem.expirationDate?.toISOString() ?? null,
        success: true,
      })
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      message: `${successCount} de ${items.length} productos añadidos al inventario`,
      results,
    })
  } catch (error) {
    console.error('Error al añadir productos en lote:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
