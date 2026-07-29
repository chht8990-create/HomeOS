import type { InventoryItem } from '../types/inventory'

export function getInventoryListDisplayName(
  item: Pick<InventoryItem, 'name'>,
) {
  return item.name.trim()
}
