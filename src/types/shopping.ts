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
  | 'restored'

export type ShoppingSourceKind =
  | 'manual'
  | 'meal_plan'
  | 'recipe'
  | 'reminder_restored'

export type ShoppingItem = {
  id: string
  name: string
  quantity?: number
  unit?: string
  completed: boolean
  source: ShoppingItemSource
  sourceId?: string
  sourceKind?: ShoppingSourceKind
  sourceRecipeId?: string
  sourceRecipeName?: string
  sourceMealDate?: string
  sourceMealTime?: string
  batchId?: string
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
