import type { Ingredient } from './ingredient'

export type RecipeSubstitution = {
  ingredientName: string
  alternatives: string[]
}

export type RecipeStep = {
  order: number
  instruction: string
  minutes: number
  heat?: string
  doneness?: string
}

export type Recipe = {
  id: string
  name: string
  ingredients: Ingredient[]
  servings?: number
  prepMinutes?: number
  cookMinutes?: number
  optionalIngredients?: Ingredient[]
  substitutions?: RecipeSubstitution[]
  steps?: RecipeStep[]
}

export type DetailedRecipe = Recipe & {
  servings: number
  prepMinutes: number
  cookMinutes: number
  optionalIngredients: Ingredient[]
  substitutions: RecipeSubstitution[]
  steps: RecipeStep[]
}
