import type { Ingredient } from '../types/ingredient'

export function mergeIngredients(
  ingredients: Ingredient[],
): Ingredient[] {
  const mergedIngredients: Ingredient[] = []
  const indexesByNameAndUnit =
    new Map<string, Map<string, number>>()

  for (const ingredient of ingredients) {
    const indexesByUnit =
      indexesByNameAndUnit.get(ingredient.name)
    const existingIndex =
      indexesByUnit?.get(ingredient.unit)

    if (existingIndex === undefined) {
      const nextIndex = mergedIngredients.length

      mergedIngredients.push({ ...ingredient })

      if (indexesByUnit) {
        indexesByUnit.set(ingredient.unit, nextIndex)
      } else {
        indexesByNameAndUnit.set(
          ingredient.name,
          new Map([[ingredient.unit, nextIndex]]),
        )
      }

      continue
    }

    const existingIngredient =
      mergedIngredients[existingIndex]

    mergedIngredients[existingIndex] = {
      ...existingIngredient,
      quantity:
        existingIngredient.quantity + ingredient.quantity,
    }
  }

  return mergedIngredients
}
