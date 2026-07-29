import type { AiInventoryIngredient } from './aiRecipeRecommendation'
import type { PlannedMeal } from './meal'
import type { DetailedRecipe } from './recipe'
import type { Ingredient } from './ingredient'

export type SpicePreference =
  | 'mild'
  | 'medium'
  | 'spicy'

export type AiMealPlanTrialRequest = {
  startDate: string
  householdSize: number
  includesChildren: boolean
  childAgeGroup?: string
  spicePreference: SpicePreference
  preferredFoods?: string
  excludedFoods?: string
  allergies?: string
  weekdayMaxMinutes: number
  inventoryItems: AiInventoryIngredient[]
}

export type AiMealPlanTrialResponse = {
  plans: PlannedMeal[]
  recipes: DetailedRecipe[]
  weeklyShoppingIngredients: Ingredient[]
  meta: {
    model?: string
    generatedAt: string
  }
}

export type StoredAiMealPlanTrial = {
  formatVersion: '1'
  usedAt: string
  response: AiMealPlanTrialResponse
}
