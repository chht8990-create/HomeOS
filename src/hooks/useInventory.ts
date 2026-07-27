import { useEffect, useState } from 'react'
import type { InventoryItem } from '../types/inventory'

const STORAGE_KEY = 'homeos.inventory'

export function readInventoryItems(): InventoryItem[] {
  const stored = window.localStorage.getItem(STORAGE_KEY)

  if (!stored) {
    return []
  }

  try {
    const parsed = JSON.parse(stored)

    return Array.isArray(parsed) ? parsed : []
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return []
  }
}

function createInventoryId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random()}`
}

function useInventory() {
  const [items, setItems] =
    useState<InventoryItem[]>(readInventoryItems)

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items),
    )
  }, [items])

  function addItem(
    name: string,
    quantity: number,
    unit: string,
    location: InventoryItem['location'],
  ) {
    const trimmedName = name.trim()

    if (!trimmedName) return

    const now = new Date().toISOString()

    setItems((current) => [
      ...current,
      {
        id: createInventoryId(),
        name: trimmedName,
        quantity,
        unit,
        location,
        createdAt: now,
        updatedAt: now,
      },
    ])
  }

  function deleteItem(id: string) {
    setItems((current) =>
      current.filter((item) => item.id !== id),
    )
  }

  return {
    items,
    addItem,
    deleteItem,
  }
}

export default useInventory
