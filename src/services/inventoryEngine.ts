import type { Ingredient } from '../types/ingredient'
import type { InventoryItem } from '../types/inventory'

export function calculateMissingIngredients(
  ingredients: Ingredient[],
  inventoryItems: InventoryItem[],
): Ingredient[] {
  return ingredients.flatMap((ingredient) => {
    const availableQuantity = inventoryItems.reduce(
      (total, inventoryItem) =>
        inventoryItem.name === ingredient.name &&
        inventoryItem.unit === ingredient.unit
          ? total + inventoryItem.quantity
          : total,
      0,
    )

    const missingQuantity = ingredient.quantity - availableQuantity

    if (missingQuantity <= 0) {
      return []
    }

    return [
      {
        ...ingredient,
        quantity: missingQuantity,
      },
    ]
  })
}
