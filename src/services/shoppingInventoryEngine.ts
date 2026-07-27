import type {
  InventoryItem,
  InventoryLocation,
} from '../types/inventory'
import type { ShoppingItem } from '../types/shopping'

export type ShoppingInventoryMergeOptions = {
  createId: () => string
  now: string
  defaultLocation?: InventoryLocation
}

export type ShoppingInventoryMergeResult = {
  inventoryItems: InventoryItem[]
  appliedShoppingItemIds: string[]
  appliedItemCount: number
}

function createItemKey(name: string, unit: string) {
  return `${name.trim().toLowerCase()}\u0000${unit.trim()}`
}

function readQuantity(item: ShoppingItem) {
  return typeof item.quantity === 'number' &&
    Number.isFinite(item.quantity) &&
    item.quantity > 0
    ? item.quantity
    : 1
}

export function mergeCompletedShoppingIntoInventory(
  inventoryItems: InventoryItem[],
  shoppingItems: ShoppingItem[],
  {
    createId,
    now,
    defaultLocation = 'fridge',
  }: ShoppingInventoryMergeOptions,
): ShoppingInventoryMergeResult {
  const nextInventoryItems = inventoryItems.map(
    (item) => ({ ...item }),
  )
  const inventoryIndexByKey = new Map<string, number>()
  const appliedItemKeys = new Set<string>()
  const completedItems = shoppingItems.filter(
    (item) => item.completed,
  )

  nextInventoryItems.forEach((item, index) => {
    const key = createItemKey(item.name, item.unit)

    if (!inventoryIndexByKey.has(key)) {
      inventoryIndexByKey.set(key, index)
    }
  })

  completedItems.forEach((item) => {
    const name = item.name.trim()
    const unit = item.unit?.trim() || '개'
    const quantity = readQuantity(item)
    const key = createItemKey(name, unit)
    const existingIndex = inventoryIndexByKey.get(key)

    appliedItemKeys.add(key)

    if (existingIndex !== undefined) {
      const existingItem =
        nextInventoryItems[existingIndex]

      nextInventoryItems[existingIndex] = {
        ...existingItem,
        quantity: existingItem.quantity + quantity,
        updatedAt: now,
      }
      return
    }

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
  })

  return {
    inventoryItems: nextInventoryItems,
    appliedShoppingItemIds: completedItems.map(
      (item) => item.id,
    ),
    appliedItemCount: appliedItemKeys.size,
  }
}
