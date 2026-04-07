import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ingredients } = body as { ingredients: string[] }

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'La lista de ingredientes es obligatoria' },
        { status: 400 }
      )
    }

    // Sort ingredients to create a consistent cache key
    const sortedIngredients = [...ingredients].sort()
    const cacheKey = JSON.stringify(sortedIngredients)

    // Check cache first
    const cachedRecipes = await db.recipeCache.findMany({
      where: { ingredients: cacheKey },
    })

    if (cachedRecipes.length > 0) {
      const recipes = cachedRecipes.map((r) => {
        const parsed = JSON.parse(r.recipeData)
        // Normalize to Spanish field names
        return {
          nombre: parsed.name || parsed.nombre || 'Receta sin nombre',
          ingredientes: parsed.ingredients || parsed.ingredientes || [],
          pasos: parsed.steps || parsed.pasos || [],
          tiempoPreparacion: parsed.prepTime || parsed.tiempoPreparacion || '30 minutos',
          dificultad: parsed.difficulty || parsed.dificultad || 'media',
        }
      })
      return NextResponse.json(recipes)
    }

    // Call AI to generate recipes
    const zai = await ZAI.create()

    const systemPrompt = `Eres un chef experto en cocina que ayuda a reducir el desperdicio de alimentos.
Genera entre 3 y 5 recetas creativas y prácticas usando los ingredientes disponibles que se te proporcionen.
Para cada receta, responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "recipes": [
    {
      "nombre": "Nombre de la receta",
      "ingredientes": ["ingrediente 1", "ingrediente 2", ...],
      "pasos": ["paso 1", "paso 2", ...],
      "tiempoPreparacion": "30 minutos",
      "dificultad": "fácil"
    }
  ]
}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional, sin bloques de código markdown.`

    const userPrompt = `Tengo estos ingredientes disponibles en mi refrigerador/despensa: ${sortedIngredients.join(', ')}. 
Genera recetas que pueda preparar con estos ingredientes. Si hace falta algún ingrediente adicional, inclúyelo en la lista de ingredientes de la receta.`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: 'No se pudieron generar las recetas' },
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

    let recipes: unknown[]
    try {
      const parsed = JSON.parse(cleanedContent)
      recipes = parsed.recipes || [parsed]
    } catch {
      return NextResponse.json(
        { error: 'Error al procesar las recetas generadas' },
        { status: 500 }
      )
    }

    // Normalize all recipes to Spanish field names
    const normalizedRecipes = recipes.map((recipe: unknown) => {
      const r = recipe as Record<string, unknown>
      return {
        nombre: (r.nombre || r.name || 'Receta sin nombre') as string,
        ingredientes: (r.ingredientes || r.ingredients || []) as string[],
        pasos: (r.pasos || r.steps || []) as string[],
        tiempoPreparacion: (r.tiempoPreparacion || r.prepTime || '30 minutos') as string,
        dificultad: (r.dificultad || r.difficulty || 'media') as string,
      }
    })

    // Cache each recipe
    await db.recipeCache.createMany({
      data: normalizedRecipes.map(recipe => ({
        ingredients: cacheKey,
        recipeName: recipe.nombre,
        recipeData: JSON.stringify(recipe),
      })),
    })

    return NextResponse.json(normalizedRecipes)
  } catch (error) {
    console.error('Error al generar recetas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor al generar recetas' },
      { status: 500 }
    )
  }
}
