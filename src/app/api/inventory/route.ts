import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')
    const expiring = searchParams.get('expiring')

    const now = new Date()
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)

    const where: Record<string, unknown> = {
      consumed: false,
    }

    if (location && ['fridge', 'pantry', 'freezer'].includes(location)) {
      where.location = location
    }

    if (expiring === 'true') {
      where.expirationDate = {
        lte: twoDaysFromNow,
        gte: now,
      }
    }

    const items = await db.inventoryItem.findMany({
      where,
      include: {
        product: true,
      },
      orderBy: {
        expirationDate: 'asc',
      },
    })

    // Map Date objects to strings for JSON serialization
    const serialized = items.map(item => ({
      ...item,
      expirationDate: item.expirationDate?.toISOString() ?? null,
      addedAt: item.addedAt.toISOString(),
      consumedAt: item.consumedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      product: {
        ...item.product,
        createdAt: item.product.createdAt.toISOString(),
        updatedAt: item.product.updatedAt.toISOString(),
      },
    }))

    return NextResponse.json(serialized)
  } catch (error) {
    console.error('Error al obtener inventario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, quantity, location, expirationDate } = body

    if (!productId) {
      return NextResponse.json(
        { error: 'El ID del producto es obligatorio' },
        { status: 400 }
      )
    }

    // Verify product exists
    const product = await db.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    const item = await db.inventoryItem.create({
      data: {
        productId,
        quantity: quantity ?? 1,
        location: location ?? 'fridge',
        expirationDate: expirationDate ? new Date(expirationDate) : null,
      },
      include: {
        product: true,
      },
    })

    const serialized = {
      ...item,
      expirationDate: item.expirationDate?.toISOString() ?? null,
      addedAt: item.addedAt.toISOString(),
      consumedAt: item.consumedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      product: {
        ...item.product,
        createdAt: item.product.createdAt.toISOString(),
        updatedAt: item.product.updatedAt.toISOString(),
      },
    }

    return NextResponse.json(serialized, { status: 201 })
  } catch (error) {
    console.error('Error al agregar al inventario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
