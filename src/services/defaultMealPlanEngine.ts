import type { PlannedMeal } from '../types/meal'
import type {
  DetailedRecipe,
  Recipe,
} from '../types/recipe'

export type MealPlanViewRange =
  | 'today'
  | 'week'
  | 'fortnight'
  | 'month'

export const mealPlanRangeDays: Record<
  MealPlanViewRange,
  number
> = {
  today: 1,
  week: 7,
  fortnight: 15,
  month: 30,
}

export const DEFAULT_MONTHLY_RECIPE_IDS = [
  'kimchi-stew',
  'grilled-mackerel',
  'egg-fried-rice',
  'chicken-soup',
  'japchae',
  'steamed-egg',
  'beef-bulgogi',
  'vegetable-bibimbap',
  'braised-tofu',
  'squid-radish-soup',
  'curry',
  'salmon-soy-grill',
  'soybean-paste-stew',
  'andong-jjimdak',
  'potato-pancake',
  'beef-seaweed-soup',
  'tofu-mushroom-rice',
  'spicy-pork',
  'salmon-soy-grill',
  'vegetable-bibimbap',
  'boiled-pork',
  'braised-tofu',
  'chicken-galbi',
  'steamed-egg',
  'curry',
  'squid-radish-soup',
  'egg-fried-rice',
  'beef-bulgogi',
  'kimchi-stew',
  'andong-jjimdak',
] as const

export function addDaysToDateKey(
  dateKey: string,
  days: number,
) {
  const date = new Date(`${dateKey}T12:00:00`)

  if (Number.isNaN(date.getTime())) {
    return dateKey
  }

  date.setDate(date.getDate() + days)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(
    2,
    '0',
  )
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function isDetailedRecipe(
  recipe: Recipe,
): recipe is DetailedRecipe {
  return (
    typeof recipe.servings === 'number' &&
    recipe.servings > 0 &&
    typeof recipe.prepMinutes === 'number' &&
    recipe.prepMinutes >= 0 &&
    typeof recipe.cookMinutes === 'number' &&
    recipe.cookMinutes > 0 &&
    Array.isArray(recipe.optionalIngredients) &&
    Array.isArray(recipe.substitutions) &&
    Array.isArray(recipe.steps) &&
    recipe.steps.length >= 5 &&
    recipe.steps.length <= 10
  )
}

export function createDefaultMonthlyMealPlans(
  startDate: string,
  recipes: Recipe[],
  now = new Date().toISOString(),
): PlannedMeal[] {
  const recipesById = new Map(
    recipes.map((recipe) => [recipe.id, recipe]),
  )

  return DEFAULT_MONTHLY_RECIPE_IDS.map(
    (recipeId, index) => {
      const recipe = recipesById.get(recipeId)

      if (!recipe || !isDetailedRecipe(recipe)) {
        throw new Error(
          `기본 식단 상세 레시피가 없습니다: ${recipeId}`,
        )
      }

      const date = addDaysToDateKey(startDate, index)

      return {
        id: `${date}-dinner`,
        date,
        type: 'dinner',
        status: 'planned',
        name: recipe.name,
        recipeId: recipe.id,
        servings: recipe.servings,
        source: 'default',
        createdAt: now,
        updatedAt: now,
      }
    },
  )
}

export function getMealPlansInRange(
  mealPlans: PlannedMeal[],
  startDate: string,
  range: MealPlanViewRange,
) {
  const endDate = addDaysToDateKey(
    startDate,
    mealPlanRangeDays[range] - 1,
  )

  return mealPlans
    .filter(
      (mealPlan) =>
        mealPlan.date >= startDate &&
        mealPlan.date <= endDate,
    )
    .map((mealPlan) => ({ ...mealPlan }))
}
