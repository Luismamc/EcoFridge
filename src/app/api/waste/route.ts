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
      where.discardedAt = {}
      if (from) {
        (where.discardedAt as Record<string, unknown>).gte = new Date(from + 'T00:00:00.000Z')
      }
      if (to) {
        (where.discardedAt as Record<string, unknown>).lte = new Date(to + 'T23:59:59.999Z')
      }
    }

    const wasteLogs = await db.wasteLog.findMany({
      where,
      include: {
        product: true,
      },
      orderBy: {
        discardedAt: 'desc',
      },
    })

    const serialized = wasteLogs.map(log => ({
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
      reason: log.reason,
      notes: log.notes,
      discardedAt: log.discardedAt.toISOString(),
      createdAt: log.createdAt.toISOString(),
    }))

    return NextResponse.json(serialized)
  } catch (error) {
    console.error('Error al obtener registros de desperdicio:', error)
    return NextResponse.json([])
  }
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
    const { productId, quantity, reason, notes } = body

    if (!productId) {
      return NextResponse.json(
        { error: 'El ID del producto es obligatorio' },
        { status: 400 }
      )
    }

    const product = await db.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    const wasteLog = await db.wasteLog.create({
      data: {
        productId,
        quantity: quantity ?? 1,
        reason: reason ?? null,
        notes: notes ?? null,
      },
      include: {
        product: true,
      },
    })

    const inventoryItems = await db.inventoryItem.findMany({
      where: {
        productId,
        consumed: false,
      },
      orderBy: {
        expirationDate: 'asc',
      },
    })

    let remainingQuantity = quantity ?? 1
    for (const item of inventoryItems) {
      if (remainingQuantity <= 0) break

      if (item.quantity <= remainingQuantity) {
        await db.inventoryItem.delete({
          where: { id: item.id },
        })
        remainingQuantity -= item.quantity
      } else {
        await db.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: item.quantity - remainingQuantity },
        })
        remainingQuantity = 0
      }
    }

    const serialized = {
      id: wasteLog.id,
      productId: wasteLog.productId,
      product: {
        id: wasteLog.product.id,
        barcode: wasteLog.product.barcode,
        name: wasteLog.product.name,
        brand: wasteLog.product.brand,
        category: wasteLog.product.category,
        imageUrl: wasteLog.product.imageUrl,
        quantity: wasteLog.product.quantity,
        nutritionGrade: wasteLog.product.nutritionGrade,
        ingredients: wasteLog.product.ingredients,
        createdAt: wasteLog.product.createdAt.toISOString(),
        updatedAt: wasteLog.product.updatedAt.toISOString(),
      },
      quantity: wasteLog.quantity,
      reason: wasteLog.reason,
      notes: wasteLog.notes,
      discardedAt: wasteLog.discardedAt.toISOString(),
      createdAt: wasteLog.createdAt.toISOString(),
    }

    return NextResponse.json(serialized, { status: 201 })
  } catch (error) {
    console.error('Error al registrar desperdicio:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
