export type ShoppingItemSource = 'manual' | 'meal'

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
}