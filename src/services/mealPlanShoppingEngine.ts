import { mergeIngredients } from './ingredientMergeEngine.js'
import { calculateMissingIngredients } from './inventoryEngine.js'
import {
  getMealPlansInRange,
  type MealPlanViewRange,
} from './defaultMealPlanEngine.js'
import type { Ingredient } from '../types/ingredient'
import type { InventoryItem } from '../types/inventory'
import type { PlannedMeal } from '../types/meal'
import type { Recipe } from '../types/recipe'

const BASIC_PANTRY_INGREDIENTS = new Set([
  '물',
  '소금',
  '식용유',
  '후추',
  '설탕',
])

function normalizeName(name: string) {
  return name.trim().toLowerCase()
}

function findMealRecipe(
  mealPlan: PlannedMeal,
  recipes: Recipe[],
) {
  return recipes.find(
    (recipe) =>
      (mealPlan.recipeId &&
        recipe.id === mealPlan.recipeId) ||
      normalizeName(recipe.name) ===
        normalizeName(mealPlan.name),
  )
}

export function scaleRecipeIngredients(
  recipe: Recipe,
  servings: number,
): Ingredient[] {
  const baseServings = recipe.servings ?? 2
  const ratio =
    Number.isFinite(servings) && servings > 0
      ? servings / baseServings
      : 1

  return recipe.ingredients.map((ingredient) => ({
    ...ingredient,
    quantity: ingredient.quantity * ratio,
  }))
}

export function createMealPlanShoppingIngredients(
  mealPlans: PlannedMeal[],
  recipes: Recipe[],
  inventoryItems: InventoryItem[],
  startDate: string,
  range: MealPlanViewRange,
) {
  const selectedMealPlans = getMealPlansInRange(
    mealPlans,
    startDate,
    range,
  )
  const ingredients = selectedMealPlans.flatMap(
    (mealPlan) => {
      const recipe = findMealRecipe(mealPlan, recipes)

      return recipe
        ? scaleRecipeIngredients(
            recipe,
            mealPlan.servings ??
              recipe.servings ??
              2,
          )
        : []
    },
  )
  const mergedIngredients = mergeIngredients(
    ingredients.filter(
      (ingredient) =>
        !BASIC_PANTRY_INGREDIENTS.has(
          normalizeName(ingredient.name),
        ),
    ),
  )

  return {
    selectedMealPlans,
    ingredients: calculateMissingIngredients(
      mergedIngredients,
      inventoryItems,
    ),
  }
}

export function createMealPlanRangeShoppingSourceId(
  startDate: string,
  range: MealPlanViewRange,
) {
  return `meal-plan-range:${startDate}:${range}`
}
