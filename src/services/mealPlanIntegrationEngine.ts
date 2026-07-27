import type { MealPlanInput } from './mealPlanEngine'
import { findRecipeByMealName } from './recipeEngine'
import type { Ingredient } from '../types/ingredient'
import type { PlannedMeal } from '../types/meal'
import type { Recipe } from '../types/recipe'

export type PlannerShoppingChange = {
  sourceId: string
  previousSourceId?: string
  ingredients: Ingredient[] | null
}

export function createPlannerShoppingSourceId(
  mealPlanId: string,
) {
  return `meal-plan:${mealPlanId}`
}

export function createPlannerShoppingChange(
  mealPlans: PlannedMeal[],
  input: MealPlanInput,
  recipes: Recipe[],
  previousMealPlanId?: string,
): PlannerShoppingChange | null {
  const savedMealPlan = mealPlans.find(
    (mealPlan) =>
      mealPlan.date === input.date &&
      mealPlan.type === input.type,
  )

  if (!savedMealPlan) {
    return null
  }

  const sourceId = createPlannerShoppingSourceId(
    savedMealPlan.id,
  )
  const previousSourceId = previousMealPlanId
    ? createPlannerShoppingSourceId(previousMealPlanId)
    : undefined
  const recipe = findRecipeByMealName(
    savedMealPlan.name,
    recipes,
  )

  return {
    sourceId,
    previousSourceId:
      previousSourceId === sourceId
        ? undefined
        : previousSourceId,
    ingredients: recipe?.ingredients ?? null,
  }
}
