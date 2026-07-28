import type { Ingredient } from '../types/ingredient'
import type { ShoppingItem } from '../types/shopping'

function createShoppingItemId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createManualShoppingItem(name: string): ShoppingItem | null {
  const trimmedName = name.trim()

  if (!trimmedName) {
    return null
  }

  const now = new Date().toISOString()

  return {
    id: createShoppingItemId(),
    name: trimmedName,
    completed: false,
    source: 'manual',
    createdAt: now,
    updatedAt: now,
  }
}

export function createManualIngredientShoppingItems(
  ingredients: Ingredient[],
): ShoppingItem[] {
  const now = new Date().toISOString()

  return ingredients.flatMap((ingredient) => {
    const name = ingredient.name.trim()
    const unit = ingredient.unit.trim()

    if (
      !name ||
      !unit ||
      !Number.isFinite(ingredient.quantity) ||
      ingredient.quantity <= 0
    ) {
      return []
    }

    return [
      {
        id: createShoppingItemId(),
        name,
        quantity: ingredient.quantity,
        unit,
        completed: false,
        source: 'manual' as const,
        createdAt: now,
        updatedAt: now,
      },
    ]
  })
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
