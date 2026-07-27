export type InventoryLocation = 'fridge' | 'freezer' | 'pantry'

export type InventoryItem = {
  id: string
  name: string
  quantity: number
  unit: string
  location: InventoryLocation
  createdAt: string
  updatedAt: string
}