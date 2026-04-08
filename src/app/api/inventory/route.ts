import { NextRequest, NextResponse } from 'next/server'

async function getDb() {
  try {
    const { db } = await import('@/lib/db')
    return db
  } catch {
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
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let { productId, quantity, location, expirationDate } = body

    if (!productId) {
      return NextResponse.json(
        { error: 'El ID del producto es obligatorio' },
        { status: 400 }
      )
    }

    const db = await getDb()
    if (!db) {
      return NextResponse.json(
        { error: 'Base de datos no disponible. La app necesita un servidor con base de datos persistente.' },
        { status: 503 }
      )
    }

    // If productId starts with "off-" or "manual-", it's a virtual product
    // from Open Food Facts or manual entry — we need to create it in the DB first
    if (productId.startsWith('off-') || productId.startsWith('manual-')) {
      const productData = body.productData
      if (!productData || !productData.name) {
        return NextResponse.json(
          { error: 'Faltan datos del producto para crearlo. Vuelve al escaner.' },
          { status: 400 }
        )
      }

      // Check if product already exists in DB by barcode
      const barcode = productData.barcode || productId
      const existing = await db.product.findFirst({
        where: { barcode },
      })

      if (existing) {
        productId = existing.id
      } else {
        // Create the product in the database
        const newProduct = await db.product.create({
          data: {
            barcode: barcode,
            name: productData.name,
            brand: productData.brand || null,
            category: productData.category || null,
            imageUrl: productData.imageUrl || null,
            quantity: productData.quantity || null,
            nutritionGrade: productData.nutritionGrade || null,
            ingredients: productData.ingredients || null,
            allergens: productData.allergens || null,
            allergensTags: productData.allergensTags || null,
          },
        })
        productId = newProduct.id
      }
    } else {
      // Verify product exists
      const product = await db.product.findUnique({
        where: { id: productId },
      })

      if (!product) {
        return NextResponse.json(
          { error: 'Producto no encontrado. Vuelve a escanearlo.' },
          { status: 404 }
        )
      }
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
