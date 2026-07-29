export type AiInventoryIngredient = {
  name: string
  quantity: number
  unit: string
}

export type AiRecipeIngredient = {
  name: string
  quantity: number
  unit: string
  available: boolean
  group:
    | 'main'
    | 'seasoning'
    | 'broth'
    | 'garnish'
    | 'optional'
  note: string | null
  optional: boolean
  substitute: string[]
}

export type AiMissingIngredient = {
  name: string
  quantity: number
  unit: string
}

export type AiRecipeStep = {
  order: number
  title: string
  instruction: string
  durationMinutes: number
  heatLevel: string
  completionCue: string
  reason: string | null
  warning: string | null
  ingredientRefs: string[]
}

export type AiRecipeRecommendation = {
  title: string
  summary: string
  servings: number
  estimatedMinutes: number
  difficulty: '쉬움' | '보통' | '어려움'
  prepTimeMinutes: number
  cookTimeMinutes: number
  calories: number | null
  ingredients: AiRecipeIngredient[]
  missingIngredients: AiMissingIngredient[]
  steps: AiRecipeStep[]
  seasoningAdjustment: string[]
  commonMistakes: string[]
  storage: string
  reheating: string
  leftoverIdeas: string[]
  servingSuggestions: string[]
}

export type AiRecipeRecommendationRequest = {
  inventoryItems: AiInventoryIngredient[]
  servings: number
  preferences?: string
  excludedIngredients?: string[]
}

export type AiRecipeRecommendationResponse = {
  recommendations: AiRecipeRecommendation[]
  meta: {
    maxRecommendations: number
  }
}
