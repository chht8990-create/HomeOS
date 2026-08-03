import type { InventoryItem } from '../types/inventory'

export function isValidInventoryQuantity(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  )
}

export function parseInventoryQuantity(
  value: string | number,
) {
  if (typeof value === 'string' && !value.trim()) {
    return null
  }

  const quantity =
    typeof value === 'number' ? value : Number(value)

  return isValidInventoryQuantity(quantity)
    ? quantity
    : null
}

export function parseStoredInventoryItems(
  value: string | null,
): InventoryItem[] {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown

    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is InventoryItem =>
            typeof item === 'object' &&
            item !== null &&
            isValidInventoryQuantity(
              (item as { quantity?: unknown })
                .quantity,
            ),
        )
      : []
  } catch {
    return []
  }
}

export function serializeInventoryItems(
  items: InventoryItem[],
) {
  return JSON.stringify(items)
}

export function formatInventoryQuantity(
  quantity: number,
) {
  return isValidInventoryQuantity(quantity)
    ? String(quantity)
    : ''
}
