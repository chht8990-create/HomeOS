import type { Recipe } from '../types/recipe'

export function findRecipeByMealName(
  mealName: string,
  recipes: Recipe[],
) {
  const normalizedMealName = mealName
    .trim()
    .replace(/\s+/g, '')

  return recipes.find(
    (recipe) =>
      recipe.name.replace(/\s+/g, '') ===
      normalizedMealName,
  )
}
