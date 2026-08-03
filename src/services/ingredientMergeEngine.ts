import type { Ingredient } from '../types/ingredient'
import {
  normalizeShoppingIngredientDisplayName,
  normalizeShoppingIngredientMatchName,
  normalizeShoppingIngredientPolicyName,
} from './shoppingIngredientPolicy'

export function mergeIngredients(
  ingredients: Ingredient[],
): Ingredient[] {
  const mergedIngredients: Ingredient[] = []
  const indexesByNameAndUnit =
    new Map<string, Map<string, number>>()
  const sourceNamesByIndex = new Map<number, string>()

  for (const ingredient of ingredients) {
    const displayName =
      normalizeShoppingIngredientDisplayName(
        ingredient.name,
      )
    const matchName = normalizeShoppingIngredientMatchName(
      ingredient.name,
    )
    const sourceName =
      normalizeShoppingIngredientPolicyName(
        ingredient.name,
      )
    const indexesByUnit =
      indexesByNameAndUnit.get(matchName)
    const existingIndex =
      indexesByUnit?.get(ingredient.unit)

    if (existingIndex === undefined) {
      const nextIndex = mergedIngredients.length

      mergedIngredients.push({
        ...ingredient,
        name: displayName,
      })
      sourceNamesByIndex.set(nextIndex, sourceName)

      if (indexesByUnit) {
        indexesByUnit.set(ingredient.unit, nextIndex)
      } else {
        indexesByNameAndUnit.set(
          matchName,
          new Map([[ingredient.unit, nextIndex]]),
        )
      }

      continue
    }

    const existingIngredient =
      mergedIngredients[existingIndex]
    const existingSourceName =
      sourceNamesByIndex.get(existingIndex)

    mergedIngredients[existingIndex] = {
      ...existingIngredient,
      quantity:
        existingSourceName === sourceName
          ? existingIngredient.quantity + ingredient.quantity
          : Math.max(
              existingIngredient.quantity,
              ingredient.quantity,
            ),
    }
  }

  return mergedIngredients
}
