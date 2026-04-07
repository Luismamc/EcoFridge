'use client'

import React, { useState, useMemo } from 'react'
import { useApp } from '../app-context'
import { motion, AnimatePresence } from 'framer-motion'
import { ChefHat, Loader2, Sparkles, Clock, ChevronDown, ChevronUp, RefreshCw, ShieldAlert, X, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Recipe } from '../app-context'

function parseAllergens(allergens: string | null): string[] {
  if (!allergens) return []
  try {
    const parsed = JSON.parse(allergens)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const ALLERGEN_EMOJIS: Record<string, string> = {
  'gluten': '🌾', 'lactosa': '🥛', 'frutos secos': '🥜', 'huevos': '🥚',
  'soja': '🫘', 'pescado': '🐟', 'mariscos': '🦐', 'mostaza': '🟡',
  'apio': '🥬', 'sesamo': '⚪', 'sulfitos': '🧪', 'moluscos': '🐚',
  'dairy': '🥛', 'eggs': '🥚', 'nuts': '🥜', 'peanuts': '🥜',
  'fish': '🐟', 'shellfish': '🦐', 'soy': '🫘', 'wheat': '🌾',
  'milk': '🥛', 'celery': '🥬', 'mustard': '🟡', 'lupin': '🌸', 'molluscs': '🐚',
}

function getAllergenEmoji(allergen: string): string {
  const lower = allergen.toLowerCase()
  for (const [key, emoji] of Object.entries(ALLERGEN_EMOJIS)) {
    if (lower.includes(key)) return emoji
  }
  return '⚠️'
}

// Common allergen keywords found in ingredient lists
const ALLERGEN_KEYWORDS = [
  'gluten', 'trigo', 'avena', 'cebada', 'centeno', 'espelta', 'kamut',
  'lactosa', 'leche', 'queso', 'yogur', 'mantequilla', 'nata', 'crema',
  'frutos secos', 'nuez', 'almendra', 'avellana', 'anacardo', 'pistacho', 'castaña', 'nuez',
  'huevos', 'huevo', 'clara de huevo', 'yema',
  'soja', 'soy', 'salsa de soja', 'tofu',
  'pescado', 'bacalao', 'salmón', 'atún',
  'mariscos', 'gambas', 'langostino', 'camarón', 'cangrejo',
  'mostaza', 'apio', 'sesamo', 'sésamo',
  'sulfitos', 'dióxido de azufre',
]

function detectAllergensInText(text: string): string[] {
  const found: string[] = []
  const lower = text.toLowerCase()
  ALLERGEN_KEYWORDS.forEach(keyword => {
    if (lower.includes(keyword)) {
      // Normalize allergen name
      const name = keyword.charAt(0).toUpperCase() + keyword.slice(1)
      if (!found.some(f => f.toLowerCase() === name.toLowerCase())) {
        found.push(name)
      }
    }
  })
  return [...new Set(found)]
}

interface IngredientOption {
  name: string
  selected: boolean
  allergens: string[]
  hasAllergenWarning: boolean
}

export function RecipesView() {
  const { inventory, isLoading } = useApp()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false)
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null)
  const [showIngredientSelector, setShowIngredientSelector] = useState(true)
  const [allergenDetailRecipe, setAllergenDetailRecipe] = useState<number | null>(null)

  const activeItems = inventory.filter(i => !i.consumed)

  // Build ingredient options with allergen info
  const [ingredientOptions, setIngredientOptions] = useState<IngredientOption[]>([])

  // Initialize ingredient options when inventory changes
  React.useEffect(() => {
    const uniqueNames = [...new Set(activeItems.map(i => i.product.name))]
    const options: IngredientOption[] = uniqueNames.map(name => {
      const item = activeItems.find(i => i.product.name === name)
      const allergens = item ? parseAllergens(item.product.allergens) : []
      return {
        name,
        selected: true,
        allergens,
        hasAllergenWarning: allergens.length > 0,
      }
    })
    setIngredientOptions(options)
  }, [inventory])

  const toggleIngredient = (index: number) => {
    setIngredientOptions(prev => prev.map((opt, i) =>
      i === index ? { ...opt, selected: !opt.selected } : opt
    ))
  }

  const selectAll = () => {
    setIngredientOptions(prev => prev.map(opt => ({ ...opt, selected: true })))
  }

  const deselectAll = () => {
    setIngredientOptions(prev => prev.map(opt => ({ ...opt, selected: false })))
  }

  const selectedIngredients = useMemo(
    () => ingredientOptions.filter(opt => opt.selected).map(opt => opt.name),
    [ingredientOptions]
  )

  const selectedAllergens = useMemo(() => {
    const allergenSet = new Set<string>()
    ingredientOptions
      .filter(opt => opt.selected && opt.allergens.length > 0)
      .forEach(opt => opt.allergens.forEach(a => allergenSet.add(a)))
    return Array.from(allergenSet)
  }, [ingredientOptions])

  const generateRecipes = async () => {
    if (selectedIngredients.length === 0) {
      toast.error('Selecciona al menos un ingrediente')
      return
    }

    setIsLoadingRecipes(true)
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: selectedIngredients }),
      })

      if (res.ok) {
        const data = await res.json()
        setRecipes(data)
        setShowIngredientSelector(false)
        if (data.length > 0) {
          toast.success(`${data.length} recetas encontradas`)
        } else {
          toast.info('No se encontraron recetas con estos ingredientes')
        }
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al generar recetas')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setIsLoadingRecipes(false)
    }
  }

  const difficultyColor = (diff: string) => {
    switch (diff?.toLowerCase()) {
      case 'fácil':
      case 'facil':
        return 'bg-green-100 text-green-700'
      case 'media':
      case 'moderada':
        return 'bg-yellow-100 text-yellow-700'
      case 'difícil':
      case 'dificil':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // Analyze allergens in a recipe
  const getRecipeAllergenInfo = (recipe: Recipe) => {
    const allText = [...recipe.ingredientes, ...recipe.pasos].join(' ')
    return detectAllergensInText(allText)
  }

  const selectedCount = ingredientOptions.filter(o => o.selected).length
  const totalCount = ingredientOptions.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recetas Inteligentes</h1>
        <p className="text-sm text-gray-500 mt-1">Descubre qué cocinar con lo que tienes en casa</p>
      </div>

      {/* Ingredient Selector */}
      <AnimatePresence>
        {showIngredientSelector && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Selecciona ingredientes ({selectedCount}/{totalCount})
                  </h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7 px-2">
                      Todos
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs h-7 px-2">
                      Ninguno
                    </Button>
                  </div>
                </div>

                {ingredientOptions.length > 0 ? (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {ingredientOptions.map((opt, index) => (
                      <motion.button
                        key={opt.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => toggleIngredient(index)}
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition-all text-left ${
                          opt.selected
                            ? opt.hasAllergenWarning
                              ? 'border-orange-300 bg-orange-50'
                              : 'border-green-300 bg-green-50'
                            : 'border-gray-200 bg-white opacity-50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          opt.selected
                            ? 'border-green-500 bg-green-500'
                            : 'border-gray-300'
                        }`}>
                          {opt.selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-sm flex-1 ${opt.selected ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                          {opt.name}
                        </span>
                        {opt.hasAllergenWarning && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {opt.allergens.slice(0, 2).map((a, i) => (
                              <span key={i} className="text-sm" title={a}>{getAllergenEmoji(a)}</span>
                            ))}
                            {opt.allergens.length > 2 && (
                              <Badge className="text-[9px] px-1 py-0 bg-orange-200 text-orange-700">
                                +{opt.allergens.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No hay ingredientes en tu inventario</p>
                )}

                {/* Allergen Summary for selected */}
                {selectedAllergens.length > 0 && (
                  <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-xl">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ShieldAlert className="w-4 h-4 text-orange-500" />
                      <span className="text-xs font-semibold text-orange-700">
                        Alérgenos en los ingredientes seleccionados
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedAllergens.map((a, i) => (
                        <Badge key={i} className="text-[10px] bg-orange-100 text-orange-700 border-0">
                          {getAllergenEmoji(a)} {a}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show compact ingredient summary when selector is hidden */}
      {!showIngredientSelector && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-gray-500">Ingredientes:</h3>
                <div className="flex flex-wrap gap-1">
                  {selectedIngredients.map((name) => (
                    <Badge key={name} variant="secondary" className="text-[10px]">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowIngredientSelector(true)}
                className="text-xs h-7 px-2"
              >
                Editar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      <motion.div whileTap={{ scale: 0.98 }}>
        <Button
          onClick={generateRecipes}
          disabled={isLoadingRecipes || selectedIngredients.length === 0}
          className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-base font-semibold rounded-xl shadow-lg"
        >
          {isLoadingRecipes ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generando recetas...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generar recetas ({selectedIngredients.length} ingredientes)
            </>
          )}
        </Button>
      </motion.div>

      {/* Recipes List */}
      {recipes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              {recipes.length} recetas encontradas
            </h2>
            <Button variant="ghost" size="sm" onClick={generateRecipes} disabled={isLoadingRecipes}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoadingRecipes ? 'animate-spin' : ''}`} />
              Regenerar
            </Button>
          </div>

          {recipes.map((recipe, index) => {
            const isExpanded = expandedRecipe === index
            const recipeAllergens = getRecipeAllergenInfo(recipe)

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`overflow-hidden ${recipeAllergens.length > 0 ? 'border-orange-100' : ''}`}>
                  <CardContent className="p-0">
                    {/* Recipe Header */}
                    <button
                      onClick={() => setExpandedRecipe(isExpanded ? null : index)}
                      className="w-full text-left p-4 flex items-center gap-3"
                    >
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center text-2xl flex-shrink-0">
                        {index === 0 ? '🍽️' : index === 1 ? '🥗' : index === 2 ? '🍲' : index === 3 ? '🥘' : '🍜'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{recipe.nombre}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {recipe.tiempoPreparacion}
                          </span>
                          <Badge className={`text-[10px] ${difficultyColor(recipe.dificultad)}`}>
                            {recipe.dificultad}
                          </Badge>
                          {recipeAllergens.length > 0 && (
                            <Badge className="text-[10px] bg-orange-100 text-orange-700 border-0">
                              <ShieldAlert className="w-3 h-3 mr-0.5" />
                              {recipeAllergens.length} alérgeno{recipeAllergens.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </button>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <Separator />

                          {/* Allergen Warning */}
                          {recipeAllergens.length > 0 && (
                            <div className="mx-4 mt-3 p-2.5 bg-orange-50 border border-orange-200 rounded-xl">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <ShieldAlert className="w-4 h-4 text-orange-500" />
                                  <span className="text-xs font-semibold text-orange-700">
                                    Posibles alérgenos detectados
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setAllergenDetailRecipe(index)}
                                  className="text-[10px] h-6 px-2 text-orange-600 hover:text-orange-700"
                                >
                                  Ver detalles
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {recipeAllergens.slice(0, 4).map((a, i) => (
                                  <Badge key={i} className="text-[10px] bg-orange-100 text-orange-700 border-0">
                                    {getAllergenEmoji(a)} {a}
                                  </Badge>
                                ))}
                                {recipeAllergens.length > 4 && (
                                  <Badge className="text-[10px] bg-orange-100 text-orange-700 border-0">
                                    +{recipeAllergens.length - 4} más
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="p-4 space-y-4">
                            {/* Ingredients */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                                <span>🥕</span> Ingredientes
                              </h4>
                              <ul className="space-y-1">
                                {recipe.ingredientes.map((ing, i) => {
                                  const isAvailable = selectedIngredients.some(avail =>
                                    avail.toLowerCase().includes(ing.toLowerCase()) ||
                                    ing.toLowerCase().includes(avail.toLowerCase())
                                  )
                                  const ingAllergens = detectAllergensInText(ing)
                                  return (
                                    <li key={i} className={`text-sm flex items-center gap-2 ${isAvailable ? 'text-green-700' : 'text-gray-500'}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isAvailable ? 'bg-green-500' : 'bg-gray-300'}`} />
                                      {ing}
                                      {isAvailable && (
                                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Tienes</Badge>
                                      )}
                                      {ingAllergens.length > 0 && (
                                        <span title={`Posible alérgeno: ${ingAllergens.join(', ')}`}>
                                          {ingAllergens.slice(0, 1).map((a, j) => (
                                            <span key={j} className="text-xs">{getAllergenEmoji(a)}</span>
                                          ))}
                                        </span>
                                      )}
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>

                            {/* Steps */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                                <span>👨‍🍳</span> Preparación
                              </h4>
                              <ol className="space-y-2">
                                {recipe.pasos.map((paso, i) => (
                                  <li key={i} className="flex gap-3 text-sm">
                                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                      {i + 1}
                                    </span>
                                    <span className="text-gray-600 leading-relaxed">{paso}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Allergen Detail Dialog */}
      <Dialog open={allergenDetailRecipe !== null} onOpenChange={(open) => { if (!open) setAllergenDetailRecipe(null) }}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-orange-500" />
              Alérgenos en esta receta
            </DialogTitle>
            <DialogDescription>
              Se detectaron posibles alérgenos en los ingredientes y pasos de esta receta.
            </DialogDescription>
          </DialogHeader>

          {allergenDetailRecipe !== null && recipes[allergenDetailRecipe] && (() => {
            const recipe = recipes[allergenDetailRecipe]
            const allergens = getRecipeAllergenInfo(recipe)

            return (
              <div className="space-y-4 mt-2">
                <p className="text-sm font-medium text-gray-700">{recipe.nombre}</p>

                {/* Also show ingredient-level allergens */}
                {selectedAllergens.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">De tus ingredientes:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedAllergens.map((a, i) => (
                        <Badge key={i} className="text-[10px] bg-red-100 text-red-700 border-0">
                          {getAllergenEmoji(a)} {a} (confirmado)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {allergens.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">Detectados en la receta:</p>
                    <div className="space-y-1.5">
                      {allergens.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-100">
                          <span className="text-lg">{getAllergenEmoji(a)}</span>
                          <span className="text-sm font-medium text-orange-700 capitalize">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-700">
                    <strong>Aviso:</strong> Los alérgenos se detectan automáticamente por análisis de texto.
                    Pueden producirse falsos positivos. Siempre verifica los ingredientes si tienes alergias alimentarias.
                  </p>
                </div>

                <Button onClick={() => setAllergenDetailRecipe(null)} className="w-full">
                  Entendido
                </Button>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {recipes.length === 0 && !isLoadingRecipes && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="text-6xl mb-4">👨‍🍳</div>
          <h3 className="text-lg font-semibold text-gray-700">¿Qué quieres cocinar hoy?</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
            Selecciona los ingredientes que quieres usar y nuestra IA buscará las mejores recetas
          </p>
        </motion.div>
      )}
    </div>
  )
}
