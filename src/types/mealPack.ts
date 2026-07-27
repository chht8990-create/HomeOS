import type { PlannedMeal } from './meal'
import type { Recipe } from './recipe'

export type MealPackMetadata = {
  id: string
  name: string
  servings: number
  startDate: string
  durationDays: number
  allergies: string[]
  excludedFoods: string[]
  description: string
  formatVersion: '1.0'
}

export type MealPack = {
  pack: MealPackMetadata
  recipes: Recipe[]
  plannedMeals: PlannedMeal[]
}
