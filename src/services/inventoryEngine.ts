import type { Ingredient } from '../types/ingredient'
import type { InventoryItem } from '../types/inventory'
import { createIngredientComparisonValue } from './ingredientUnitEngine.js'

export function calculateMissingIngredients(
  ingredients: Ingredient[],
  inventoryItems: InventoryItem[],
): Ingredient[] {
  return ingredients.flatMap((ingredient) => {
    const required =
      createIngredientComparisonValue(ingredient)
    const availableQuantity = inventoryItems.reduce(
      (total, inventoryItem) => {
        const available =
          createIngredientComparisonValue(
            inventoryItem,
          )

        return available.key === required.key &&
          available.baseUnit === required.baseUnit
          ? total + available.amount
          : total
      },
      0,
    )

    const missingBaseQuantity =
      required.amount - availableQuantity

    if (missingBaseQuantity <= 0) {
      return []
    }

    return [
      {
        ...ingredient,
        quantity:
          missingBaseQuantity /
          required.sourceUnitFactor,
      },
    ]
  })
}
