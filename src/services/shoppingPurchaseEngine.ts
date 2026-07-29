import type {
  ShoppingItem,
  ShoppingPurchaseMode,
  ShoppingPurchaseStatus,
} from '../types/shopping'

export type ShoppingPurchaseInput = {
  mode: ShoppingPurchaseMode
  purchasedQuantity?: number
  packageQuantity?: number
  purchasedPackageCount?: number
  notPurchased?: boolean
}

export type ShoppingPurchaseSummary = {
  requiredQuantity: number
  purchasedTotalQuantity: number
  remainingPurchaseQuantity: number
  surplusQuantity: number
  inventoryAppliedQuantity: number
  purchaseStatus: ShoppingPurchaseStatus
  purchaseMode: ShoppingPurchaseMode
  packageQuantity?: number
  purchasedPackageCount?: number
}

function isNonNegativeFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  )
}

function isPositiveFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  )
}

function roundQuantity(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) /
    1000
}

export function normalizeStoredShoppingItem(
  value: unknown,
): ShoppingItem | null {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as { id?: unknown }).id !==
      'string' ||
    typeof (value as { name?: unknown }).name !==
      'string'
  ) {
    return null
  }

  const stored = value as Partial<ShoppingItem> & {
    checked?: unknown
  }
  const timestamp =
    typeof stored.updatedAt === 'string'
      ? stored.updatedAt
      : typeof stored.createdAt === 'string'
        ? stored.createdAt
        : new Date(0).toISOString()

  return normalizeShoppingItem({
    ...stored,
    id: stored.id!,
    name: stored.name!,
    completed:
      typeof stored.completed === 'boolean'
        ? stored.completed
        : stored.checked === true,
    source:
      stored.source === 'meal'
        ? 'meal'
        : 'manual',
    createdAt:
      typeof stored.createdAt === 'string'
        ? stored.createdAt
        : timestamp,
    updatedAt: timestamp,
  })
}

export function readRequiredShoppingQuantity(
  item: ShoppingItem,
) {
  if (isPositiveFiniteNumber(item.requiredQuantity)) {
    return item.requiredQuantity
  }

  if (isPositiveFiniteNumber(item.quantity)) {
    return item.quantity
  }

  return 1
}

export function readPurchasedShoppingQuantity(
  item: ShoppingItem,
) {
  if (
    isNonNegativeFiniteNumber(
      item.purchasedTotalQuantity,
    )
  ) {
    return item.purchasedTotalQuantity
  }

  if (
    isNonNegativeFiniteNumber(item.purchasedQuantity)
  ) {
    return item.purchasedQuantity
  }

  return item.completed
    ? readRequiredShoppingQuantity(item)
    : 0
}

export function readInventoryAppliedQuantity(
  item: ShoppingItem,
) {
  return isNonNegativeFiniteNumber(
    item.inventoryAppliedQuantity,
  )
    ? item.inventoryAppliedQuantity
    : 0
}

export function normalizeShoppingItem(
  item: ShoppingItem,
): ShoppingItem {
  const requiredQuantity =
    readRequiredShoppingQuantity(item)
  const purchasedTotalQuantity =
    readPurchasedShoppingQuantity(item)
  const remainingPurchaseQuantity = Math.max(
    0,
    requiredQuantity - purchasedTotalQuantity,
  )
  const surplusQuantity = Math.max(
    0,
    purchasedTotalQuantity - requiredQuantity,
  )
  const inferredStatus: ShoppingPurchaseStatus =
    item.purchaseStatus ??
    (item.completed
      ? 'completed'
      : purchasedTotalQuantity > 0
        ? 'partial'
        : 'planned')
  const purchaseStatus =
    inferredStatus === 'not-purchased'
      ? 'not-purchased'
      : purchasedTotalQuantity >= requiredQuantity
        ? 'completed'
        : purchasedTotalQuantity > 0
          ? 'partial'
          : 'planned'

  return {
    ...item,
    completed: purchaseStatus === 'completed',
    purchaseStatus,
    purchaseMode:
      item.purchaseMode === 'package'
        ? 'package'
        : 'single',
    requiredQuantity,
    purchasedQuantity: purchasedTotalQuantity,
    purchasedTotalQuantity,
    remainingPurchaseQuantity,
    surplusQuantity,
    reminderStatus:
      purchaseStatus !== 'completed' &&
      (purchaseStatus === 'not-purchased' ||
        item.reminderStatus === 'pending')
        ? 'pending'
        : 'none',
    inventoryAppliedQuantity:
      readInventoryAppliedQuantity(item),
  }
}

export function getShoppingReminderItems(
  items: ShoppingItem[],
) {
  return items
    .map(normalizeShoppingItem)
    .filter(
      (item) => item.reminderStatus === 'pending',
    )
}

export function shouldShowShoppingReminder(
  reminderItemCount: number,
  isDismissedForCurrentVisit: boolean,
) {
  return (
    reminderItemCount > 0 &&
    !isDismissedForCurrentVisit
  )
}

export function deleteShoppingItems(
  items: ShoppingItem[],
  itemIds: string[],
) {
  const itemIdSet = new Set(itemIds)

  return items.filter(
    (item) => !itemIdSet.has(item.id),
  )
}

export function markShoppingItemsForReminder(
  items: ShoppingItem[],
  itemIds: string[],
  now: string,
) {
  const itemIdSet = new Set(itemIds)

  return items.map((item) => {
    const normalizedItem = normalizeShoppingItem(item)

    if (
      !itemIdSet.has(item.id) ||
      normalizedItem.completed
    ) {
      return normalizedItem
    }

    return {
      ...normalizedItem,
      reminderStatus: 'pending' as const,
      updatedAt: now,
    }
  })
}

export function calculateShoppingPurchase(
  requiredQuantity: number,
  input: ShoppingPurchaseInput,
  minimumPurchasedQuantity = 0,
): ShoppingPurchaseSummary {
  const safeRequiredQuantity =
    isPositiveFiniteNumber(requiredQuantity)
      ? requiredQuantity
      : 1
  const purchaseMode = input.mode
  const packageQuantity =
    purchaseMode === 'package' &&
    isPositiveFiniteNumber(input.packageQuantity)
      ? input.packageQuantity
      : undefined
  const purchasedPackageCount =
    purchaseMode === 'package' &&
    isNonNegativeFiniteNumber(
      input.purchasedPackageCount,
    )
      ? Math.floor(input.purchasedPackageCount)
      : undefined
  const enteredQuantity =
    purchaseMode === 'package'
      ? (packageQuantity ?? 0) *
        (purchasedPackageCount ?? 0)
      : isNonNegativeFiniteNumber(
            input.purchasedQuantity,
          )
        ? input.purchasedQuantity
        : 0
  const purchasedTotalQuantity = input.notPurchased
    ? 0
    : Math.max(
        roundQuantity(enteredQuantity),
        minimumPurchasedQuantity,
      )
  const remainingPurchaseQuantity = roundQuantity(
    Math.max(
      0,
      safeRequiredQuantity - purchasedTotalQuantity,
    ),
  )
  const surplusQuantity = roundQuantity(
    Math.max(
      0,
      purchasedTotalQuantity - safeRequiredQuantity,
    ),
  )
  const purchaseStatus: ShoppingPurchaseStatus =
    input.notPurchased
      ? 'not-purchased'
      : purchasedTotalQuantity >= safeRequiredQuantity
        ? 'completed'
        : purchasedTotalQuantity > 0
          ? 'partial'
          : 'planned'

  return {
    requiredQuantity: safeRequiredQuantity,
    purchasedTotalQuantity,
    remainingPurchaseQuantity,
    surplusQuantity,
    inventoryAppliedQuantity:
      minimumPurchasedQuantity,
    purchaseStatus,
    purchaseMode,
    ...(packageQuantity
      ? { packageQuantity }
      : {}),
    ...(purchasedPackageCount !== undefined
      ? { purchasedPackageCount }
      : {}),
  }
}

export function summarizeShoppingPurchase(
  items: ShoppingItem[],
): ShoppingPurchaseSummary {
  const normalizedItems = items.map(
    normalizeShoppingItem,
  )
  const requiredQuantity = roundQuantity(
    normalizedItems.reduce(
      (sum, item) =>
        sum + readRequiredShoppingQuantity(item),
      0,
    ),
  )
  const purchasedTotalQuantity = roundQuantity(
    normalizedItems.reduce(
      (sum, item) =>
        sum + readPurchasedShoppingQuantity(item),
      0,
    ),
  )
  const inventoryAppliedQuantity = roundQuantity(
    normalizedItems.reduce(
      (sum, item) =>
        sum + readInventoryAppliedQuantity(item),
      0,
    ),
  )
  const packageItem = normalizedItems.find(
    (item) => item.purchaseMode === 'package',
  )
  const notPurchased = normalizedItems.some(
    (item) =>
      item.purchaseStatus === 'not-purchased',
  )
  const calculated = calculateShoppingPurchase(
    requiredQuantity,
    {
      mode: packageItem ? 'package' : 'single',
      purchasedQuantity: purchasedTotalQuantity,
      packageQuantity: packageItem?.packageQuantity,
      purchasedPackageCount:
        packageItem?.purchasedPackageCount,
      notPurchased,
    },
    inventoryAppliedQuantity,
  )

  return {
    ...calculated,
    purchasedTotalQuantity,
    remainingPurchaseQuantity: roundQuantity(
      Math.max(
        0,
        requiredQuantity - purchasedTotalQuantity,
      ),
    ),
    surplusQuantity: roundQuantity(
      Math.max(
        0,
        purchasedTotalQuantity - requiredQuantity,
      ),
    ),
  }
}

export function updateShoppingPurchase(
  items: ShoppingItem[],
  itemIds: string[],
  input: ShoppingPurchaseInput,
  now: string,
): ShoppingItem[] {
  const itemIdSet = new Set(itemIds)
  const selectedItems = items.filter((item) =>
    itemIdSet.has(item.id),
  )
  const previousSummary =
    summarizeShoppingPurchase(selectedItems)
  const nextSummary = calculateShoppingPurchase(
    previousSummary.requiredQuantity,
    input,
    previousSummary.inventoryAppliedQuantity,
  )
  const normalizedSelectedItems = selectedItems.map(
    normalizeShoppingItem,
  )
  const allocatedPurchasedQuantities =
    new Map<string, number>()
  let remainingPurchasedQuantity =
    nextSummary.purchasedTotalQuantity

  for (const item of normalizedSelectedItems) {
    const appliedQuantity =
      readInventoryAppliedQuantity(item)

    allocatedPurchasedQuantities.set(
      item.id,
      appliedQuantity,
    )
    remainingPurchasedQuantity = roundQuantity(
      Math.max(
        0,
        remainingPurchasedQuantity - appliedQuantity,
      ),
    )
  }

  for (const item of normalizedSelectedItems) {
    const allocatedQuantity =
      allocatedPurchasedQuantities.get(item.id) ?? 0
    const requiredQuantity =
      readRequiredShoppingQuantity(item)
    const neededQuantity = Math.max(
      0,
      requiredQuantity - allocatedQuantity,
    )
    const nextAllocation = Math.min(
      neededQuantity,
      remainingPurchasedQuantity,
    )

    allocatedPurchasedQuantities.set(
      item.id,
      roundQuantity(
        allocatedQuantity + nextAllocation,
      ),
    )
    remainingPurchasedQuantity = roundQuantity(
      remainingPurchasedQuantity - nextAllocation,
    )
  }

  const primaryItem = normalizedSelectedItems[0]

  if (
    primaryItem &&
    remainingPurchasedQuantity > 0
  ) {
    allocatedPurchasedQuantities.set(
      primaryItem.id,
      roundQuantity(
        (allocatedPurchasedQuantities.get(
          primaryItem.id,
        ) ?? 0) + remainingPurchasedQuantity,
      ),
    )
  }

  return items.map((item) => {
    if (!itemIdSet.has(item.id)) {
      return { ...item }
    }

    const normalizedItem = normalizeShoppingItem(item)
    const isPrimary = item.id === primaryItem?.id
    const itemPurchase = calculateShoppingPurchase(
      readRequiredShoppingQuantity(normalizedItem),
      nextSummary.purchaseStatus === 'not-purchased'
        ? {
            mode: 'single',
            notPurchased: true,
          }
        : {
            mode: 'single',
            purchasedQuantity:
              allocatedPurchasedQuantities.get(
                item.id,
              ) ?? 0,
          },
      readInventoryAppliedQuantity(normalizedItem),
    )

    return {
      ...normalizedItem,
      completed: itemPurchase.purchaseStatus === 'completed',
      purchaseStatus: itemPurchase.purchaseStatus,
      purchaseMode:
        isPrimary &&
        nextSummary.purchaseMode === 'package'
          ? 'package'
          : 'single',
      purchasedQuantity:
        itemPurchase.purchasedTotalQuantity,
      purchasedTotalQuantity:
        itemPurchase.purchasedTotalQuantity,
      remainingPurchaseQuantity:
        itemPurchase.remainingPurchaseQuantity,
      surplusQuantity: itemPurchase.surplusQuantity,
      reminderStatus:
        nextSummary.purchaseStatus ===
        'not-purchased'
          ? ('pending' as const)
          : ('none' as const),
      ...(nextSummary.purchaseMode === 'package' &&
      isPrimary
        ? {
            packageQuantity:
              nextSummary.packageQuantity,
            purchasedPackageCount:
              nextSummary.purchasedPackageCount,
          }
        : {
            packageQuantity: undefined,
            purchasedPackageCount: undefined,
          }),
      updatedAt: now,
    }
  })
}

export function restoreShoppingReminderItems(
  items: ShoppingItem[],
  itemIds: string[],
  now: string,
): ShoppingItem[] {
  const itemIdSet = new Set(itemIds)

  return items.map((item) => {
    if (!itemIdSet.has(item.id)) {
      return { ...item }
    }

    const normalizedItem = normalizeShoppingItem(item)
    const remainingPurchaseQuantity =
      normalizedItem.remainingPurchaseQuantity ??
      readRequiredShoppingQuantity(normalizedItem)

    return {
      ...normalizedItem,
      quantity:
        normalizedItem.quantity === undefined
          ? undefined
          : remainingPurchaseQuantity,
      completed: false,
      purchaseStatus: 'planned' as const,
      purchaseMode: 'single' as const,
      purchasedQuantity: 0,
      purchasedTotalQuantity: 0,
      remainingPurchaseQuantity,
      requiredQuantity: remainingPurchaseQuantity,
      surplusQuantity: 0,
      reminderStatus: 'none' as const,
      packageQuantity: undefined,
      purchasedPackageCount: undefined,
      inventoryAppliedQuantity: 0,
      inventoryApplicationId: undefined,
      inventoryAppliedAt: undefined,
      updatedAt: now,
    }
  })
}
