import type {
  InventoryItem,
  InventoryLocation,
} from '../types/inventory'
import type { ShoppingItem } from '../types/shopping'
import {
  normalizeShoppingItem,
  readInventoryAppliedQuantity,
  readPurchasedShoppingQuantity,
} from './shoppingPurchaseEngine'

export type ShoppingInventoryMergeOptions = {
  createId: () => string
  createApplicationId?: () => string
  now: string
  defaultLocation?: InventoryLocation
  shoppingItemIds?: string[]
}

export type ShoppingInventoryMergeResult = {
  inventoryItems: InventoryItem[]
  shoppingItems: ShoppingItem[]
  appliedShoppingItemIds: string[]
  appliedItemCount: number
}

function createItemKey(name: string, unit: string) {
  return `${name.trim().toLowerCase()}\u0000${unit.trim()}`
}

export function mergeCompletedShoppingIntoInventory(
  inventoryItems: InventoryItem[],
  shoppingItems: ShoppingItem[],
  {
    createId,
    createApplicationId = createId,
    now,
    defaultLocation = 'fridge',
    shoppingItemIds,
  }: ShoppingInventoryMergeOptions,
): ShoppingInventoryMergeResult {
  const nextInventoryItems = inventoryItems.map(
    (item) => ({ ...item }),
  )
  const nextShoppingItems = shoppingItems.map(
    normalizeShoppingItem,
  )
  const inventoryIndexByKey = new Map<string, number>()
  const appliedItemKeys = new Set<string>()
  const appliedShoppingItemIds: string[] = []
  const eligibleShoppingItemIds = shoppingItemIds
    ? new Set(shoppingItemIds)
    : null

  nextInventoryItems.forEach((item, index) => {
    const key = createItemKey(item.name, item.unit)

    if (!inventoryIndexByKey.has(key)) {
      inventoryIndexByKey.set(key, index)
    }
  })

  nextShoppingItems.forEach((item, itemIndex) => {
    if (
      eligibleShoppingItemIds &&
      !eligibleShoppingItemIds.has(item.id)
    ) {
      return
    }

    const name = item.name.trim()
    const unit = item.unit?.trim() || '개'
    const purchasedQuantity =
      readPurchasedShoppingQuantity(item)
    const appliedQuantity =
      readInventoryAppliedQuantity(item)
    const quantity =
      purchasedQuantity - appliedQuantity

    if (
      !name ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return
    }

    const key = createItemKey(name, unit)
    const existingIndex = inventoryIndexByKey.get(key)

    appliedItemKeys.add(key)
    appliedShoppingItemIds.push(item.id)

    if (existingIndex !== undefined) {
      const existingItem =
        nextInventoryItems[existingIndex]

      nextInventoryItems[existingIndex] = {
        ...existingItem,
        quantity: existingItem.quantity + quantity,
        updatedAt: now,
      }
    } else {
      const newItem: InventoryItem = {
        id: createId(),
        name,
        quantity,
        unit,
        location: defaultLocation,
        createdAt: now,
        updatedAt: now,
      }

      inventoryIndexByKey.set(
        key,
        nextInventoryItems.length,
      )
      nextInventoryItems.push(newItem)
    }

    nextShoppingItems[itemIndex] = {
      ...item,
      inventoryAppliedQuantity: purchasedQuantity,
      inventoryApplicationId:
        createApplicationId(),
      inventoryAppliedAt: now,
      updatedAt: now,
    }
  })

  return {
    inventoryItems: nextInventoryItems,
    shoppingItems: nextShoppingItems,
    appliedShoppingItemIds,
    appliedItemCount: appliedItemKeys.size,
  }
}
