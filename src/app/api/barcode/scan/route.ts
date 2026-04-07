import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

/**
 * POST /api/barcode/scan
 * Recibe una imagen base64 (ya comprimida por el cliente),
 * usa IA (VLM) para leer el número del código de barras,
 * y devuelve el número para buscarlo.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageBase64 } = body as { imageBase64: string }

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'La imagen es obligatoria' },
        { status: 400 }
      )
    }

    // Check image size (reject if too large, > 4MB base64 ~ 3MB image)
    const base64Data = imageBase64.split(',')[1] || imageBase64
    if (base64Data.length > 5_000_000) {
      return NextResponse.json(
        { error: 'La imagen es demasiado grande. Intenta de nuevo con mejor iluminacion.' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Eres un experto en lectura de codigos de barras. Tu UNICA tarea es encontrar y extraer numeros de codigos de barras de imagenes.
Responde SOLO con el numero del codigo de barras, sin espacios, guiones ni puntos.
Los formatos mas comunes son EAN-13 (13 digitos), EAN-8 (8 digitos), UPC-A (12 digitos).
Si no ves claramente un codigo de barras, responde exactamente: NO_BARCODE
No expliques nada. Solo el numero o NO_BARCODE.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Examina esta imagen con atencion. Busca un codigo de barras formado por lineas verticales con numeros debajo. Extrae SOLO los numeros del codigo. Si no hay codigo de barras visible, responde NO_BARCODE.',
            },
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
      temperature: 0.0,
      max_tokens: 20,
    })

    const content = completion.choices[0]?.message?.content?.trim()

    if (!content || content.toUpperCase() === 'NO_BARCODE') {
      return NextResponse.json(
        { error: 'No se detecto ningun codigo de barras en la imagen' },
        { status: 404 }
      )
    }

    // Clean the barcode number (remove spaces, dashes, dots, etc.)
    let barcode = content.replace(/[\s\-\.\,\/\\]/g, '').trim()

    // Remove any non-numeric characters except X (checksum)
    barcode = barcode.replace(/[^0-9X]/gi, '')

    if (!barcode || barcode.length < 8) {
      return NextResponse.json(
        { error: 'El codigo detectado no es valido (demasiado corto)' },
        { status: 404 }
      )
    }

    if (barcode.length > 14) {
      // If too long, try to extract just the numeric part
      const match = barcode.match(/\d{8,14}/)
      if (match) {
        barcode = match[0]
      }
    }

    return NextResponse.json({ barcode })
  } catch (error: any) {
    console.error('Error al escanear codigo de barras:', error?.message || error)
    
    // Provide specific error messages
    if (error?.message?.includes('timeout') || error?.message?.includes('Timeout')) {
      return NextResponse.json(
        { error: 'La peticion tardo demasiado. Intenta de nuevo o escribe el codigo manualmente.' },
        { status: 504 }
      )
    }
    
    if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      return NextResponse.json(
        { error: 'Error de conexion con el servicio de IA. Escribe el codigo manualmente.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'No se pudo analizar la imagen. Intenta con mejor iluminacion o escribe el codigo manualmente.' },
      { status: 500 }
    )
  }
}
