import type { Ingredient } from '../types/ingredient'
import type { ShoppingItem } from '../types/shopping'
import { mergeIngredients } from './ingredientMergeEngine'
import { normalizeAiIngredientUnit } from './ingredientUnitEngine'
import {
  normalizeShoppingIngredientDisplayName,
  normalizeShoppingIngredientMatchName,
} from './shoppingIngredientPolicy'

export type ShoppingSourceContext = {
  sourceKind?: 'meal_plan' | 'recipe'
  sourceRecipeId?: string
  sourceRecipeName?: string
  sourceMealDate?: string
  sourceMealTime?: string
  batchId?: string
}

function createShoppingItemId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createShoppingBatchId() {
  return `shopping-batch:${Date.now()}:${Math.random()
    .toString(16)
    .slice(2)}`
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
    sourceKind: 'manual',
    batchId: createShoppingBatchId(),
    createdAt: now,
    updatedAt: now,
  }
}

export function createManualIngredientShoppingItems(
  ingredients: Ingredient[],
): ShoppingItem[] {
  const now = new Date().toISOString()

  return mergeIngredients(ingredients).flatMap((ingredient) => {
    const normalized =
      normalizeAiIngredientUnit({
        ...ingredient,
      })
    const name = normalizeShoppingIngredientDisplayName(
      normalized.name,
    )
    const unit = normalized.unit.trim()

    if (
      !name ||
      !unit ||
      !Number.isFinite(normalized.quantity) ||
      normalized.quantity <= 0
    ) {
      return []
    }

    return [
      {
        id: createShoppingItemId(),
        name,
        quantity: normalized.quantity,
        unit,
        completed: false,
        source: 'manual' as const,
        sourceKind: 'manual' as const,
        batchId: createShoppingBatchId(),
        createdAt: now,
        updatedAt: now,
      },
    ]
  })
}

export function createMealShoppingItems(
  sourceId: string,
  ingredients: Ingredient[],
  context: ShoppingSourceContext = {},
): ShoppingItem[] {
  const now = new Date().toISOString()
  const batchId =
    context.batchId ?? createShoppingBatchId()

  return mergeIngredients(ingredients).map((ingredient) => ({
    id: createShoppingItemId(),
    ...normalizeAiIngredientUnit({
      name: normalizeShoppingIngredientDisplayName(
        ingredient.name,
      ),
      quantity: ingredient.quantity,
      unit: ingredient.unit,
    }),
    completed: false,
    source: 'meal',
    sourceId,
    sourceKind: context.sourceKind ?? 'meal_plan',
    ...(context.sourceRecipeId
      ? {
          sourceRecipeId:
            context.sourceRecipeId,
        }
      : {}),
    ...(context.sourceRecipeName
      ? {
          sourceRecipeName:
            context.sourceRecipeName,
        }
      : {}),
    ...(context.sourceMealDate
      ? {
          sourceMealDate:
            context.sourceMealDate,
        }
      : {}),
    ...(context.sourceMealTime
      ? {
          sourceMealTime:
            context.sourceMealTime,
        }
      : {}),
    batchId,
    createdAt: now,
    updatedAt: now,
  }))
}

function createShoppingIngredientKey(
  item: Pick<ShoppingItem, 'name' | 'unit'>,
) {
  return `${normalizeShoppingIngredientMatchName(item.name)}\u0000${item.unit?.trim() ?? ''}`
}

export function replaceMealShoppingSourceItems(
  currentItems: ShoppingItem[],
  sourceId: string,
  ingredients: Ingredient[],
  previousSourceId?: string,
  context: ShoppingSourceContext = {},
) {
  const replacedSourceIds = new Set(
    [sourceId, previousSourceId].filter(
      (value): value is string => Boolean(value),
    ),
  )
  const explicitReminderItems = currentItems.filter(
    (item) =>
      item.sourceId !== undefined &&
      replacedSourceIds.has(item.sourceId) &&
      item.purchaseStatus === 'not-purchased',
  )
  const reminderKeys = new Set(
    explicitReminderItems.map(
      createShoppingIngredientKey,
    ),
  )
  const retainedItems = currentItems.filter(
    (item) =>
      !item.sourceId ||
      !replacedSourceIds.has(item.sourceId),
  )
  const generatedItems = createMealShoppingItems(
    sourceId,
    ingredients,
    context,
  ).filter(
    (item) =>
      !reminderKeys.has(
        createShoppingIngredientKey(item),
      ),
  )

  return {
    items: [
      ...retainedItems,
      ...explicitReminderItems,
      ...generatedItems,
    ],
    generatedItems,
  }
}

export function replaceMealPlanRangeShoppingItems(
  currentItems: ShoppingItem[],
  sourceId: string,
  ingredients: Ingredient[],
  context: ShoppingSourceContext = {},
) {
  const outstandingQuantities = new Map<
    string,
    number
  >()

  currentItems
    .filter(
      (item) =>
        item.sourceId === sourceId &&
        item.purchaseStatus !== 'completed' &&
        !item.completed,
    )
    .forEach((item) => {
      const key = createShoppingIngredientKey(item)
      const remainingQuantity =
        typeof item.remainingPurchaseQuantity ===
          'number' &&
        Number.isFinite(
          item.remainingPurchaseQuantity,
        )
          ? item.remainingPurchaseQuantity
          : item.quantity ?? 1

      outstandingQuantities.set(
        key,
        (outstandingQuantities.get(key) ?? 0) +
          remainingQuantity,
      )
    })

  const additions = ingredients
    .map((ingredient) =>
      normalizeAiIngredientUnit({
        ...ingredient,
      }),
    )
    .flatMap((ingredient) => {
      const key = createShoppingIngredientKey(
        ingredient,
      )
      const alreadyOutstanding =
        outstandingQuantities.get(key) ?? 0
      const missingQuantity = Math.max(
        0,
        ingredient.quantity -
          alreadyOutstanding,
      )

      if (missingQuantity <= 0) {
        return []
      }

      outstandingQuantities.set(
        key,
        alreadyOutstanding + missingQuantity,
      )

      return [
        {
          ...ingredient,
          quantity: missingQuantity,
        },
      ]
    })
  const generatedItems = createMealShoppingItems(
    sourceId,
    additions,
    context,
  )

  return {
    items: [
      ...currentItems.map((item) => ({ ...item })),
      ...generatedItems,
    ],
    generatedItems,
  }
}
