import type { Ingredient } from './ingredient'

export type Recipe = {
  id: string
  name: string
  ingredients: Ingredient[]
}