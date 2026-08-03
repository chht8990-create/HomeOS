import type { ShoppingItem } from '../types/shopping.js'

const WATER_INGREDIENT_NAMES = new Set([
  '물',
  '생수',
  '식수',
])

const SHOPPING_INGREDIENT_NAME_ALIASES = new Map([
  ['후춧가루', '후추'],
  ['후추가루', '후추'],
])

export function normalizeShoppingIngredientPolicyName(
  value: string,
) {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

export function isWaterIngredientName(value: string) {
  return WATER_INGREDIENT_NAMES.has(
    normalizeShoppingIngredientPolicyName(value),
  )
}

export function normalizeShoppingIngredientMatchName(
  value: string,
) {
  const normalized =
    normalizeShoppingIngredientPolicyName(value)

  return (
    SHOPPING_INGREDIENT_NAME_ALIASES.get(normalized) ??
    normalized
  )
}

export function normalizeShoppingIngredientDisplayName(
  value: string,
) {
  const normalized =
    normalizeShoppingIngredientPolicyName(value)

  return (
    SHOPPING_INGREDIENT_NAME_ALIASES.get(normalized) ??
    value.normalize('NFKC').trim().replace(/\s+/g, ' ')
  )
}

export function excludeWaterIngredients<
  T extends { name: string },
>(ingredients: T[]) {
  return ingredients.filter(
    (ingredient) =>
      !isWaterIngredientName(ingredient.name),
  )
}

function isUntouchedPlannedItem(item: ShoppingItem) {
  return (
    !item.completed &&
    (item.purchaseStatus === undefined ||
      item.purchaseStatus === 'planned') &&
    (item.reminderStatus === undefined ||
      item.reminderStatus === 'none') &&
    (item.purchasedTotalQuantity ??
      item.purchasedQuantity ??
      0) === 0 &&
    (item.inventoryAppliedQuantity ?? 0) === 0
  )
}

export function coalesceStoredShoppingIngredientAliases(
  items: ShoppingItem[],
) {
  const result: ShoppingItem[] = []
  const aliasCandidateByKey = new Map<
    string,
    { index: number; sourceName: string }
  >()

  for (const item of items) {
    const sourceName =
      normalizeShoppingIngredientPolicyName(item.name)
    const matchName =
      normalizeShoppingIngredientMatchName(item.name)
    const displayName =
      normalizeShoppingIngredientDisplayName(item.name)
    const normalizedItem = {
      ...item,
      name: displayName,
    }

    if (!isUntouchedPlannedItem(normalizedItem)) {
      result.push(normalizedItem)
      continue
    }

    const key = [
      matchName,
      normalizedItem.unit?.trim().toLowerCase() ?? '',
      normalizedItem.source,
      normalizedItem.sourceKind ?? '',
    ].join('\u0000')
    const candidate = aliasCandidateByKey.get(key)

    if (!candidate) {
      aliasCandidateByKey.set(key, {
        index: result.length,
        sourceName,
      })
      result.push(normalizedItem)
      continue
    }

    if (candidate.sourceName === sourceName) {
      result.push(normalizedItem)
      continue
    }

    const existing = result[candidate.index]
    const existingQuantity =
      existing.quantity ?? existing.requiredQuantity ?? 1
    const nextQuantity =
      normalizedItem.quantity ??
      normalizedItem.requiredQuantity ??
      1
    const preservedQuantity = Math.max(
      existingQuantity,
      nextQuantity,
    )

    result[candidate.index] = {
      ...existing,
      name: displayName,
      ...(existing.quantity !== undefined ||
      normalizedItem.quantity !== undefined
        ? { quantity: preservedQuantity }
        : {}),
      requiredQuantity: preservedQuantity,
      remainingPurchaseQuantity: preservedQuantity,
      updatedAt:
        normalizedItem.updatedAt > existing.updatedAt
          ? normalizedItem.updatedAt
          : existing.updatedAt,
    }
  }

  return result
}
