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

interface BatchItem {
  productId: string
  quantity: number
  location: string
  expirationDate: string | null
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) {
      return NextResponse.json(
        { error: 'Base de datos no disponible' },
        { status: 503 }
      )
    }

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
      try {
        let productId = item.productId

        // Handle virtual product IDs (off-*, manual-*)
        if (productId.startsWith('off-') || productId.startsWith('manual-')) {
          const existing = await db.product.findFirst({
            where: { barcode: productId },
          })
          if (existing) {
            productId = existing.id
          }
        }

        // Verify product exists
        const product = await db.product.findUnique({
          where: { id: productId },
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
      } catch (err) {
        results.push({ error: `Error con producto ${item.productId}`, success: false })
      }
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
