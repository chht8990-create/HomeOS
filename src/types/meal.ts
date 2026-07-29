export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type MealStatus = 'planned' | 'skipped'

export type Meal = {
  id: string
  date: string
  type: MealType
  status: MealStatus
  name?: string
  note?: string
  createdAt: string
  updatedAt: string
}

export type PlannedMeal = Meal & {
  status: 'planned'
  name: string
  recipeId?: string
  servings?: number
  source?: 'manual' | 'default' | 'ai-trial'
}

export type SkippedMeal = Meal & {
  status: 'skipped'
  name?: never
}

export type StoredMeal = PlannedMeal | SkippedMeal
