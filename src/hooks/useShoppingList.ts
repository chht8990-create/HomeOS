import { useEffect, useState } from 'react'
import { createMealShoppingItems } from '../services/ingredientEngine'
import { mergeIngredients } from '../services/ingredientMergeEngine'
import { calculateMissingIngredients } from '../services/inventoryEngine'
import type { Ingredient } from '../types/ingredient'
import type { ShoppingItem } from '../types/shopping'
import { readInventoryItems } from './useInventory'

const STORAGE_KEY = 'homeos.shopping.items'
const CHANGE_EVENT = 'homeos:shopping-changed'

function readItems(): ShoppingItem[] {
  const storedValue = window.localStorage.getItem(STORAGE_KEY)

  if (!storedValue) {
    return []
  }

  try {
    const parsedValue = JSON.parse(storedValue)

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue.map((item) => ({
      ...item,
      source: item.source ?? 'manual',
    }))
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return []
  }
}

function createItemId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function useShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>(readItems)

  useEffect(() => {
    function reloadItems() {
      setItems(readItems())
    }

    window.addEventListener('storage', reloadItems)
    window.addEventListener(CHANGE_EVENT, reloadItems)

    return () => {
      window.removeEventListener('storage', reloadItems)
      window.removeEventListener(CHANGE_EVENT, reloadItems)
    }
  }, [])

  function saveItems(nextItems: ShoppingItem[]) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems))
    setItems(nextItems)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }

  function addItem(name: string) {
    const trimmedName = name.trim()

    if (!trimmedName) {
      return false
    }

    const now = new Date().toISOString()

    const newItem: ShoppingItem = {
      id: createItemId(),
      name: trimmedName,
      completed: false,
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    }

    saveItems([...items, newItem])
    return true
  }

  function addMealItems(
    sourceId: string,
    ingredients: Ingredient[],
  ) {
    const itemsWithoutOldSource = items.filter(
      (item) => item.sourceId !== sourceId,
    )

    const mergedIngredients =
      mergeIngredients(ingredients)

    const missingIngredients =
      calculateMissingIngredients(
        mergedIngredients,
        readInventoryItems(),
      )

    const generatedItems = createMealShoppingItems(
      sourceId,
      missingIngredients,
    )

    saveItems([
      ...itemsWithoutOldSource,
      ...generatedItems,
    ])
  }

  function removeMealItems(sourceId: string) {
    saveItems(items.filter((item) => item.sourceId !== sourceId))
  }

  function toggleItem(itemId: string) {
    const now = new Date().toISOString()

    saveItems(
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              completed: !item.completed,
              updatedAt: now,
            }
          : item,
      ),
    )
  }

  function deleteItem(itemId: string) {
    saveItems(items.filter((item) => item.id !== itemId))
  }

  function clearCompletedItems() {
    saveItems(items.filter((item) => !item.completed))
  }

  return {
    items,
    remainingItems: items.filter((item) => !item.completed),
    completedItems: items.filter((item) => item.completed),
    addItem,
    addMealItems,
    removeMealItems,
    toggleItem,
    deleteItem,
    clearCompletedItems,
  }
}

export default useShoppingList
