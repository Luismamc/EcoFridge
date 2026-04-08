import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageBase64 } = body as { imageBase64: string }

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'La imagen del ticket es obligatoria' },
        { status: 400 }
      )
    }

    // Use VLM to parse the ticket/receipt image
    const zai = await ZAI.create()

    const systemPrompt = `Eres un sistema de reconocimiento óptico especializado en tickets de compra de supermercado.
Analiza la imagen del ticket de compra y extrae los productos que aparecen.

IMPORTANTE:
- Extrae SOLO los productos alimentarios, ignora productos no alimentarios, envases, bolsas, etc.
- Para cada producto, proporciona el nombre, la cantidad (número de unidades) y opcionalmente la categoría.
- Si no puedes identificar una cantidad, asume 1.
- Ignora el total, el IVA, las formas de pago y otros datos no relacionados con productos.
- Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni bloques markdown.

Formato de respuesta:
{
  "products": [
    {
      "name": "Nombre del producto",
      "quantity": 2,
      "category": "Lácteos"
    },
    ...
  ]
}`

    const userPrompt = 'Analiza este ticket de compra y extrae todos los productos alimentarios que aparecen. Responde solo con el JSON.'

    // Call VLM with the ticket image
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64.startsWith('data:')
                  ? imageBase64
                  : `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      system: systemPrompt,
      temperature: 0.1,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: 'No se pudo analizar el ticket' },
        { status: 500 }
      )
    }

    // Parse the AI response - handle potential markdown code blocks
    let cleanedContent = content.trim()
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent
        .replace(/^```(?:json)?\n?/, '')
        .replace(/\n?```$/, '')
        .trim()
    }

    let parsed: { products: Array<{ name: string; quantity: number; category?: string }> }
    try {
      parsed = JSON.parse(cleanedContent)
    } catch {
      return NextResponse.json(
        { error: 'Error al procesar los productos del ticket' },
        { status: 500 }
      )
    }

    const extractedProducts = parsed.products || []

    if (extractedProducts.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron productos alimentarios en el ticket' },
        { status: 404 }
      )
    }

    // Create products in database and return them
    const database = await getDb()
    if (!database) {
      return NextResponse.json(
        { error: 'Base de datos no disponible' },
        { status: 503 }
      )
    }

    const results = []
    for (const prod of extractedProducts) {
      const barcode = `TICKET-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

      // Check if a product with the same name already exists
      const existing = await database.product.findFirst({
        where: { name: prod.name },
      })

      let product
      if (existing) {
        product = existing
      } else {
        product = await database.product.create({
          data: {
            barcode,
            name: prod.name,
            brand: null,
            category: prod.category || null,
          },
        })
      }

      results.push({
        id: product.id,
        barcode: product.barcode,
        name: product.name,
        brand: product.brand,
        category: product.category,
        imageUrl: product.imageUrl,
        quantity: prod.quantity || 1,
        newProduct: !existing,
      })
    }

    return NextResponse.json({
      message: `Se encontraron ${results.length} productos en el ticket`,
      products: results,
    })
  } catch (error) {
    console.error('Error al escanear ticket:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar el ticket' },
      { status: 500 }
    )
  }
}
