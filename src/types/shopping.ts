export type ShoppingItemSource = 'manual' | 'meal'

export type ShoppingPurchaseStatus =
  | 'planned'
  | 'partial'
  | 'completed'
  | 'not-purchased'

export type ShoppingPurchaseMode =
  | 'single'
  | 'package'

export type ShoppingReminderStatus =
  | 'none'
  | 'pending'

export type ShoppingItem = {
  id: string
  name: string
  quantity?: number
  unit?: string
  completed: boolean
  source: ShoppingItemSource
  sourceId?: string
  createdAt: string
  updatedAt: string
  purchaseStatus?: ShoppingPurchaseStatus
  purchaseMode?: ShoppingPurchaseMode
  requiredQuantity?: number
  purchasedQuantity?: number
  packageQuantity?: number
  purchasedPackageCount?: number
  purchasedTotalQuantity?: number
  remainingPurchaseQuantity?: number
  surplusQuantity?: number
  reminderStatus?: ShoppingReminderStatus
  inventoryAppliedQuantity?: number
  inventoryApplicationId?: string
  inventoryAppliedAt?: string
}
