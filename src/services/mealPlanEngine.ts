import type { MealType, PlannedMeal } from '../types/meal'

export type MealPlanInput = {
  date: string
  type: MealType
  name: string
}

const mealTypeOrder: Record<MealType, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
}

function createMealPlanId(date: string, type: MealType) {
  return `${date}-${type}`
}

function isMealType(value: unknown): value is MealType {
  return (
    value === 'breakfast' ||
    value === 'lunch' ||
    value === 'dinner' ||
    value === 'snack'
  )
}

function isPlannedMeal(value: unknown): value is PlannedMeal {
  if (!value || typeof value !== 'object') {
    return false
  }

  const meal = value as Record<string, unknown>

  return (
    typeof meal.id === 'string' &&
    typeof meal.date === 'string' &&
    isMealType(meal.type) &&
    meal.status === 'planned' &&
    typeof meal.name === 'string' &&
    typeof meal.createdAt === 'string' &&
    typeof meal.updatedAt === 'string'
  )
}

function sortMealPlans(mealPlans: PlannedMeal[]) {
  return [...mealPlans].sort(
    (firstPlan, secondPlan) =>
      firstPlan.date.localeCompare(secondPlan.date) ||
      mealTypeOrder[firstPlan.type] -
        mealTypeOrder[secondPlan.type],
  )
}

export function parseMealPlans(value: unknown): PlannedMeal[] {
  if (!Array.isArray(value)) {
    return []
  }

  return sortMealPlans(value.filter(isPlannedMeal))
}

export function getMealPlansForDate(
  mealPlans: PlannedMeal[],
  date: string,
): PlannedMeal[] {
  return mealPlans
    .filter((mealPlan) => mealPlan.date === date)
    .map((mealPlan) => ({ ...mealPlan }))
}

export function upsertMealPlan(
  mealPlans: PlannedMeal[],
  input: MealPlanInput,
  previousId?: string,
  now = new Date().toISOString(),
): PlannedMeal[] {
  const trimmedName = input.name.trim()

  if (!input.date || !trimmedName) {
    return [...mealPlans]
  }

  const id = createMealPlanId(input.date, input.type)
  const existingPlan =
    mealPlans.find((mealPlan) => mealPlan.id === previousId) ??
    mealPlans.find((mealPlan) => mealPlan.id === id)

  const nextPlan: PlannedMeal = {
    id,
    date: input.date,
    type: input.type,
    status: 'planned',
    name: trimmedName,
    createdAt: existingPlan?.createdAt ?? now,
    updatedAt: now,
  }

  const remainingPlans = mealPlans.filter(
    (mealPlan) =>
      mealPlan.id !== id && mealPlan.id !== previousId,
  )

  return sortMealPlans([...remainingPlans, nextPlan])
}

export function removeMealPlan(
  mealPlans: PlannedMeal[],
  mealPlanId: string,
): PlannedMeal[] {
  return mealPlans.filter(
    (mealPlan) => mealPlan.id !== mealPlanId,
  )
}

export function appendMealPlans(
  mealPlans: PlannedMeal[],
  newMealPlans: PlannedMeal[],
): PlannedMeal[] {
  return sortMealPlans([
    ...mealPlans.map((mealPlan) => ({ ...mealPlan })),
    ...newMealPlans.map((mealPlan) => ({ ...mealPlan })),
  ])
}
