import { recipes } from '../data/recipes'

export function findRecipeByMealName(mealName: string) {
  const normalizedMealName = mealName
    .trim()
    .replace(/\s+/g, '')

  return recipes.find(
    (recipe) =>
      recipe.name.replace(/\s+/g, '') ===
      normalizedMealName,
  )
}
