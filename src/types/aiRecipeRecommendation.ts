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
}

export type AiMissingIngredient = {
  name: string
  quantity: number
  unit: string
}

export type AiRecipeRecommendation = {
  title: string
  summary: string
  servings: number
  estimatedMinutes: number
  ingredients: AiRecipeIngredient[]
  missingIngredients: AiMissingIngredient[]
  steps: string[]
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
