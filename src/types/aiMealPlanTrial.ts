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

export type AiMealPlanDraftDay = {
  dayIndex: number
  date: string
  recipeId: string
  name: string
  summary: string
  recommendationReason: string
  servings: number
  prepMinutes: number
  cookMinutes: number
  mainIngredientNames: string[]
  missingIngredientNames: string[]
  constraintCompliance: string
}

export type AiGenerationUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export type AiGenerationMeta = {
  model?: string
  generatedAt: string
  durationMs?: number
  outputBytes?: number
  usage?: AiGenerationUsage
}

export type AiMealPlanDraftResponse = {
  plans: PlannedMeal[]
  days: AiMealPlanDraftDay[]
  meta: AiGenerationMeta
}

export type AiMealPlanRecipeDetailRequest = {
  day: AiMealPlanDraftDay
  householdSize: number
  includesChildren: boolean
  childAgeGroup?: string
  spicePreference: SpicePreference
  excludedFoods?: string
  allergies?: string
}

export type AiMealPlanRecipeDetailResponse = {
  recipe: DetailedRecipe
  meta: AiGenerationMeta
}

export type AiMealPlanTrialResponse = {
  plans: PlannedMeal[]
  days: AiMealPlanDraftDay[]
  recipes: DetailedRecipe[]
  recipeSources: Record<
    string,
    'golden' | 'ai'
  >
  recipeMeta: Record<string, AiGenerationMeta>
  weeklyShoppingIngredients: Ingredient[]
  meta: AiGenerationMeta
}

export type StoredAiMealPlanTrial = {
  formatVersion: '2'
  status: 'draft' | 'completed'
  draftCreatedAt: string
  usedAt?: string
  request?: AiMealPlanTrialRequest
  response: AiMealPlanTrialResponse
}
