import { useEffect, useState } from 'react'
import { mergeIngredients } from '../services/ingredientMergeEngine'
import { calculateMissingIngredients } from '../services/inventoryEngine'
import {
  createManualShoppingItem,
  createMealShoppingItems,
} from '../services/shoppingEngine'
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
    const newItem = createManualShoppingItem(name)

    if (!newItem) {
      return false
    }

    saveItems([...items, newItem])
    return true
  }

  function addMealItems(
    sourceId: string,
    ingredients: Ingredient[],
    previousSourceId?: string,
  ) {
    const currentItems = readItems()
    const itemsWithoutOldSource = currentItems.filter(
      (item) =>
        item.sourceId !== sourceId &&
        (!previousSourceId ||
          item.sourceId !== previousSourceId),
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

  function removeMealItems(
    sourceId: string,
    previousSourceId?: string,
  ) {
    const currentItems = readItems()

    saveItems(
      currentItems.filter(
        (item) =>
          item.sourceId !== sourceId &&
          (!previousSourceId ||
            item.sourceId !== previousSourceId),
      ),
    )
  }

  function setItemsCompleted(
    itemIds: string[],
    completed: boolean,
  ) {
    const currentItems = readItems()
    const itemIdSet = new Set(itemIds)
    const now = new Date().toISOString()

    saveItems(
      currentItems.map((item) =>
        itemIdSet.has(item.id) &&
        item.completed !== completed
          ? {
              ...item,
              completed,
              updatedAt: now,
            }
          : item,
      ),
    )
  }

  function deleteItems(itemIds: string[]) {
    const itemIdSet = new Set(itemIds)

    saveItems(
      readItems().filter(
        (item) => !itemIdSet.has(item.id),
      ),
    )
  }

  function clearCompletedItems() {
    saveItems(
      readItems().filter((item) => !item.completed),
    )
  }

  return {
    items,
    remainingItems: items.filter((item) => !item.completed),
    completedItems: items.filter((item) => item.completed),
    addItem,
    addMealItems,
    removeMealItems,
    setItemsCompleted,
    deleteItems,
    clearCompletedItems,
  }
}

export default useShoppingList
