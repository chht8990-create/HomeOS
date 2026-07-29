import type { Ingredient } from './ingredient'

export type RecipeSubstitution = {
  ingredientName: string
  alternatives: string[]
}

export type RecipeDifficulty = '쉬움' | '보통' | '어려움'

export type RecipeIngredient = {
  id: string
  name: string
  amount: number
  unit: string
  note?: string
  optional?: boolean
  substitute?: string[]
  inventoryMatchKey?: string
}

export type RecipeIngredientGroups = {
  mainIngredients: RecipeIngredient[]
  seasoningIngredients: RecipeIngredient[]
  brothIngredients: RecipeIngredient[]
  garnishIngredients: RecipeIngredient[]
  optionalIngredients: RecipeIngredient[]
}

export type RecipeStep = {
  order: number
  title?: string
  instruction: string
  minutes: number
  heat?: string
  doneness?: string
  durationMinutes?: number
  heatLevel?: string
  completionCue?: string
  reason?: string
  warning?: string
  ingredientRefs?: string[]
}

export type Recipe = {
  id: string
  name: string
  ingredients: Ingredient[]
  description?: string
  imageUrl?: string
  localImage?: string
  servings?: number
  difficulty?: RecipeDifficulty
  prepMinutes?: number
  cookMinutes?: number
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  totalTimeMinutes?: number
  calories?: number
  ingredientGroups?: RecipeIngredientGroups
  optionalIngredients?: Ingredient[]
  substitutions?: RecipeSubstitution[]
  steps?: RecipeStep[]
  seasoningAdjustment?: string[]
  commonMistakes?: string[]
  storage?: string
  reheating?: string
  leftoverIdeas?: string[]
  servingSuggestions?: string[]
}

export type DetailedRecipe = Recipe & {
  servings: number
  prepMinutes: number
  cookMinutes: number
  optionalIngredients: Ingredient[]
  substitutions: RecipeSubstitution[]
  steps: RecipeStep[]
}

export type PremiumRecipe = DetailedRecipe & {
  description: string
  difficulty: RecipeDifficulty
  prepTimeMinutes: number
  cookTimeMinutes: number
  totalTimeMinutes: number
  ingredientGroups: RecipeIngredientGroups
  seasoningAdjustment: string[]
  commonMistakes: string[]
  storage: string
  reheating: string
  leftoverIdeas: string[]
  servingSuggestions: string[]
}
