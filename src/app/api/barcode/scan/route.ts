import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

/**
 * POST /api/barcode/scan
 * Recibe una imagen base64, usa IA (VLM) para leer el número del código de barras,
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

    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Mira esta imagen y busca un codigo de barras (barcode). 
Responde UNICAMENTE con el numero del codigo de barras que aparece, nada mas.
Si hay varios codigos, devuelve el mas visible.
Si no hay ningun codigo de barras, responde exactamente: NO_BARCODE
No pongas explicaciones, solo el numero o NO_BARCODE.`,
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
    })

    const content = completion.choices[0]?.message?.content?.trim()

    if (!content || content === 'NO_BARCODE') {
      return NextResponse.json(
        { error: 'No se detectó ningun codigo de barras en la imagen' },
        { status: 404 }
      )
    }

    // Limpiar el numero (quitar espacios, guiones, etc.)
    const barcode = content.replace(/[\s\-\.\,]/g, '').trim()

    if (!barcode || barcode.length < 3) {
      return NextResponse.json(
        { error: 'El codigo detectado no es valido' },
        { status: 404 }
      )
    }

    return NextResponse.json({ barcode })
  } catch (error) {
    console.error('Error al escanear codigo de barras:', error)
    return NextResponse.json(
      { error: 'No se pudo analizar la imagen del codigo de barras' },
      { status: 500 }
    )
  }
}
