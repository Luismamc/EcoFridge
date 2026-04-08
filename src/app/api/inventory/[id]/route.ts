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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb()
    if (!db) {
      return NextResponse.json(
        { error: 'Base de datos no disponible' },
        { status: 503 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { consumed, quantity, expirationDate, location, consumedAs, recipeName } = body

    const existing = await db.inventoryItem.findUnique({
      where: { id },
      include: { product: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Elemento no encontrado en el inventario' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (consumed !== undefined) {
      updateData.consumed = consumed
      updateData.consumedAt = consumed ? new Date() : null
      updateData.consumedAs = consumedAs || 'individual'
      updateData.recipeName = recipeName || null
    }

    if (quantity !== undefined) {
      updateData.quantity = quantity
    }

    if (expirationDate !== undefined) {
      updateData.expirationDate = expirationDate
        ? new Date(expirationDate)
        : null
    }

    if (location !== undefined && ['fridge', 'pantry', 'freezer'].includes(location)) {
      updateData.location = location
    }

    const item = await db.inventoryItem.update({
      where: { id },
      data: updateData,
      include: {
        product: true,
      },
    })

    // When marking as consumed, create a ConsumptionLog entry
    if (consumed === true) {
      await db.consumptionLog.create({
        data: {
          productId: existing.productId,
          quantity: existing.quantity,
          consumedAs: consumedAs || 'individual',
          recipeName: recipeName || null,
          notes: null,
          consumedAt: new Date(),
        },
      })
    }

    return NextResponse.json(serializeItem(item))
  } catch (error) {
    console.error('Error al actualizar inventario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb()
    if (!db) {
      return NextResponse.json(
        { error: 'Base de datos no disponible' },
        { status: 503 }
      )
    }

    const { id } = await params

    const existing = await db.inventoryItem.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Elemento no encontrado en el inventario' },
        { status: 404 }
      )
    }

    await db.inventoryItem.delete({
      where: { id },
    })

    return NextResponse.json({
      message: 'Elemento eliminado del inventario correctamente',
    })
  } catch (error) {
    console.error('Error al eliminar del inventario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

function serializeItem(item: Record<string, unknown>) {
  return {
    ...item,
    expirationDate: (item.expirationDate as Date)?.toISOString?.() ?? null,
    addedAt: (item.addedAt as Date).toISOString(),
    consumedAt: (item.consumedAt as Date)?.toISOString?.() ?? null,
    createdAt: (item.createdAt as Date).toISOString(),
    updatedAt: (item.updatedAt as Date).toISOString(),
    product: item.product ? {
      ...(item.product as Record<string, unknown>),
      createdAt: ((item.product as Record<string, unknown>).createdAt as Date).toISOString(),
      updatedAt: ((item.product as Record<string, unknown>).updatedAt as Date).toISOString(),
    } : null,
  }
}
