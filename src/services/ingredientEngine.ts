import type { Ingredient } from '../types/ingredient'
import type { ShoppingItem } from '../types/shopping'

function createShoppingItemId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createMealShoppingItems(
  sourceId: string,
  ingredients: Ingredient[],
): ShoppingItem[] {
  const now = new Date().toISOString()

  return ingredients.map((ingredient) => ({
    id: createShoppingItemId(),
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    completed: false,
    source: 'meal',
    sourceId,
    createdAt: now,
    updatedAt: now,
  }))
}