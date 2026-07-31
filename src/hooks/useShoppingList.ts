import { useEffect, useState } from 'react'
import { mergeIngredients } from '../services/ingredientMergeEngine'
import { calculateMissingIngredients } from '../services/inventoryEngine'
import {
  createManualIngredientShoppingItems,
  createManualShoppingItem,
  replaceMealShoppingSourceItems,
  replaceMealPlanRangeShoppingItems,
  type ShoppingSourceContext,
} from '../services/shoppingEngine'
import {
  mergeCompletedShoppingIntoInventory,
} from '../services/shoppingInventoryEngine'
import {
  deleteShoppingItems,
  getShoppingReminderItems,
  markShoppingItemsForReminder,
  normalizeShoppingItem,
  normalizeStoredShoppingItem,
  readRequiredShoppingQuantity,
  restoreShoppingReminderItems,
  updateShoppingPurchase,
  type ShoppingPurchaseInput,
} from '../services/shoppingPurchaseEngine'
import type { Ingredient } from '../types/ingredient'
import type { ShoppingItem } from '../types/shopping'
import {
  readInventoryItems,
  writeInventoryItems,
} from './useInventory'

const STORAGE_KEY = 'homeos.shopping.items'
const CHANGE_EVENT = 'homeos:shopping-changed'

function createInventoryId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random()}`
}

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

    return parsedValue.flatMap((item) => {
      const normalizedItem =
        normalizeStoredShoppingItem(item)

      return normalizedItem ? [normalizedItem] : []
    })
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
    const normalizedItems = nextItems.map(
      normalizeShoppingItem,
    )

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(normalizedItems),
    )
    setItems(normalizedItems)
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

  function addIngredientItems(
    ingredients: Ingredient[],
  ) {
    const newItems =
      createManualIngredientShoppingItems(ingredients)

    if (newItems.length === 0) {
      return 0
    }

    saveItems([...readItems(), ...newItems])
    return newItems.length
  }

  function addMealItems(
    sourceId: string,
    ingredients: Ingredient[],
    previousSourceId?: string,
    context?: ShoppingSourceContext,
  ) {
    const currentItems = readItems()
    const mergedIngredients =
      mergeIngredients(ingredients)

    const missingIngredients =
      calculateMissingIngredients(
        mergedIngredients,
        readInventoryItems(),
      )

    const replacement = replaceMealShoppingSourceItems(
      currentItems,
      sourceId,
      missingIngredients,
      previousSourceId,
      context,
    )

    saveItems(replacement.items)
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

  function replaceMealPlanRangeItems(
    sourceId: string,
    ingredients: Ingredient[],
    context?: ShoppingSourceContext,
  ) {
    const currentItems = readItems()
    const replacement =
      replaceMealPlanRangeShoppingItems(
        currentItems,
        sourceId,
        ingredients,
        context,
      )

    saveItems(replacement.items)

    return readItems().filter(
      (item) =>
        item.sourceId === sourceId &&
        !item.completed,
    ).length
  }

  function replaceAllItems(
    nextItems: ShoppingItem[],
  ) {
    saveItems(nextItems)
  }

  function setItemsCompleted(
    itemIds: string[],
    completed: boolean,
  ) {
    const currentItems = readItems()
    const now = new Date().toISOString()
    const selectedItems = currentItems.filter((item) =>
      itemIds.includes(item.id),
    )
    const requiredQuantity = selectedItems.reduce(
      (sum, item) =>
        sum + readRequiredShoppingQuantity(item),
      0,
    )

    saveItems(
      updateShoppingPurchase(
        currentItems,
        itemIds,
        {
          mode: 'single',
          purchasedQuantity: completed
            ? requiredQuantity
            : 0,
        },
        now,
      ),
    )
  }

  function recordPurchase(
    itemIds: string[],
    input: ShoppingPurchaseInput,
  ) {
    saveItems(
      updateShoppingPurchase(
        readItems(),
        itemIds,
        input,
        new Date().toISOString(),
      ),
    )
  }

  function markItemsNotPurchased(itemIds: string[]) {
    recordPurchase(itemIds, {
      mode: 'single',
      purchasedQuantity: 0,
      notPurchased: true,
    })
  }

  function restoreReminderItemIds(itemIds: string[]) {
    saveItems(
      restoreShoppingReminderItems(
        readItems(),
        itemIds,
        new Date().toISOString(),
      ),
    )
  }

  function markItemIdsForReminder(itemIds: string[]) {
    saveItems(
      markShoppingItemsForReminder(
        readItems(),
        itemIds,
        new Date().toISOString(),
      ),
    )
  }

  function deleteItems(itemIds: string[]) {
    saveItems(
      deleteShoppingItems(readItems(), itemIds),
    )
  }

  function clearCompletedItems() {
    saveItems(
      readItems().filter((item) => !item.completed),
    )
  }

  function applyCompletedItemsToInventory(
    itemIds?: string[],
  ) {
    const currentItems = readItems()
    const result =
      mergeCompletedShoppingIntoInventory(
        readInventoryItems(),
        currentItems,
        {
          createId: createInventoryId,
          now: new Date().toISOString(),
          shoppingItemIds: itemIds,
        },
      )

    if (result.appliedShoppingItemIds.length === 0) {
      return {
        appliedItemCount: 0,
        reminderItemCount: 0,
        plannedItemCount: 0,
      }
    }

    writeInventoryItems(result.inventoryItems)

    saveItems(result.shoppingItems)

    const distinctKeys = (
      predicate: (item: ShoppingItem) => boolean,
    ) =>
      new Set(
        result.shoppingItems
          .filter(predicate)
          .map(
            (item) =>
              `${item.name.trim().toLowerCase()}\u0000${item.unit?.trim() ?? ''}`,
          ),
      ).size

    return {
      appliedItemCount: result.appliedItemCount,
      reminderItemCount: distinctKeys(
        (item) =>
          item.purchaseStatus === 'not-purchased' &&
          item.reminderStatus === 'pending',
      ),
      plannedItemCount: distinctKeys(
        (item) =>
          item.purchaseStatus === 'planned' ||
          item.purchaseStatus === 'partial',
      ),
    }
  }

  return {
    items,
    remainingItems: items.filter(
      (item) =>
        item.purchaseStatus !== 'not-purchased' &&
        !item.completed,
    ),
    completedItems: items.filter((item) => item.completed),
    reminderItems: getShoppingReminderItems(items),
    addItem,
    addIngredientItems,
    addMealItems,
    removeMealItems,
    replaceMealPlanRangeItems,
    replaceAllItems,
    setItemsCompleted,
    recordPurchase,
    markItemsNotPurchased,
    markItemIdsForReminder,
    restoreReminderItemIds,
    deleteItems,
    clearCompletedItems,
    applyCompletedItemsToInventory,
  }
}

export default useShoppingList
