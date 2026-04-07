import { NextRequest, NextResponse } from 'next/server'

interface OpenFoodFactsProduct {
  code: string
  product_name?: string
  product_name_es?: string
  brands?: string
  categories?: string
  image_url?: string
  image_front_url?: string
  quantity?: string
  nutrition_grades?: string
  ingredients_text?: string
  ingredients_text_es?: string
  allergens?: string
  allergens_tags?: string[]
  allergens_hierarchy?: string[]
}

interface OpenFoodFactsResponse {
  status: number
  status_verbose: string
  product?: OpenFoodFactsProduct
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const barcode = searchParams.get('barcode')

    if (!barcode) {
      return NextResponse.json(
        { error: 'El codigo de barras es obligatorio' },
        { status: 400 }
      )
    }

    // Try to get from local database first (may fail on Vercel)
    let existingProduct = null
    try {
      const { db } = await import('@/lib/db')
      existingProduct = await db.product.findUnique({
        where: { barcode },
      })
    } catch {
      // Database not available (e.g. first time on Vercel), continue to Open Food Facts
    }

    if (existingProduct) {
      return NextResponse.json(existingProduct)
    }

    // Fetch from Open Food Facts
    let response: Response
    try {
      response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
        {
          headers: {
            'User-Agent': 'EcoFridge/1.0',
          },
          signal: AbortSignal.timeout(10000),
        }
      )
    } catch {
      return NextResponse.json(
        { error: 'No se pudo conectar con Open Food Facts. Verifica tu conexion a internet.' },
        { status: 503 }
      )
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Error al consultar el servicio de productos' },
        { status: 502 }
      )
    }

    const data: OpenFoodFactsResponse = await response.json()

    if (data.status !== 1 || !data.product) {
      return NextResponse.json(
        { error: 'Producto no encontrado en la base de datos' },
        { status: 404 }
      )
    }

    const p = data.product

    // Extract allergen names from hierarchy tags
    const allergenNames = (p.allergens_hierarchy || []).map(tag => {
      const parts = tag.split(':')
      const name = parts[parts.length - 1] || tag
      return name.charAt(0).toUpperCase() + name.slice(1)
    })

    // Build the product object
    const product = {
      id: `off-${p.code}`,
      barcode: p.code,
      name: p.product_name_es || p.product_name || 'Producto sin nombre',
      brand: p.brands || null,
      category: p.categories || null,
      imageUrl: p.image_url || p.image_front_url || null,
      quantity: p.quantity || null,
      nutritionGrade: p.nutrition_grades || null,
      ingredients: p.ingredients_text_es || p.ingredients_text || null,
      allergens: allergenNames.length > 0 ? JSON.stringify(allergenNames) : null,
      allergensTags: p.allergens ? p.allergens : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Try to save to local database (may fail on Vercel, that's ok)
    try {
      const { db } = await import('@/lib/db')
      const existing = await db.product.findUnique({ where: { barcode: p.code } })
      if (!existing) {
        await db.product.create({
          data: {
            barcode: p.code,
            name: p.product_name_es || p.product_name || 'Producto sin nombre',
            brand: p.brands || null,
            category: p.categories || null,
            imageUrl: p.image_url || p.image_front_url || null,
            quantity: p.quantity || null,
            nutritionGrade: p.nutrition_grades || null,
            ingredients: p.ingredients_text_es || p.ingredients_text || null,
            allergens: allergenNames.length > 0 ? JSON.stringify(allergenNames) : null,
            allergensTags: p.allergens ? p.allergens : null,
          },
        })
      }
    } catch {
      // Database save failed - not critical, we still return the product data
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error en busqueda de codigo de barras:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST: Create a manual product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { barcode, name, brand, category } = body

    if (!barcode || !name) {
      return NextResponse.json(
        { error: 'Codigo de barras y nombre son obligatorios' },
        { status: 400 }
      )
    }

    // Try to save to database
    try {
      const { db } = await import('@/lib/db')

      const existing = await db.product.findUnique({
        where: { barcode },
      })

      if (existing) {
        return NextResponse.json(existing)
      }

      const product = await db.product.create({
        data: {
          barcode,
          name,
          brand: brand || null,
          category: category || null,
        },
      })

      return NextResponse.json(product)
    } catch {
      // Database not available - return a virtual product object
      const product = {
        id: `manual-${barcode}`,
        barcode,
        name,
        brand: brand || null,
        category: category || null,
        imageUrl: null,
        quantity: null,
        nutritionGrade: null,
        ingredients: null,
        allergens: null,
        allergensTags: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return NextResponse.json(product)
    }
  } catch (error) {
    console.error('Error al crear producto manual:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
