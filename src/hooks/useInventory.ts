import { useEffect, useState } from 'react'
import {
  isValidInventoryQuantity,
  parseStoredInventoryItems,
  serializeInventoryItems,
} from '../services/inventoryQuantityEngine'
import type { InventoryItem } from '../types/inventory'

const STORAGE_KEY = 'homeos.inventory'
const CHANGE_EVENT = 'homeos:inventory-changed'

export function readInventoryItems(): InventoryItem[] {
  const stored = window.localStorage.getItem(STORAGE_KEY)

  if (!stored) {
    return []
  }

  const parsed = parseStoredInventoryItems(stored)

  if (parsed.length === 0 && stored !== '[]') {
    window.localStorage.removeItem(STORAGE_KEY)
  }

  return parsed
}

function createInventoryId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random()}`
}

export function writeInventoryItems(
  items: InventoryItem[],
) {
  window.localStorage.setItem(
    STORAGE_KEY,
    serializeInventoryItems(items),
  )
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function useInventory() {
  const [items, setItems] =
    useState<InventoryItem[]>(readInventoryItems)

  useEffect(() => {
    function reloadItems() {
      setItems(readInventoryItems())
    }

    window.addEventListener('storage', reloadItems)
    window.addEventListener(CHANGE_EVENT, reloadItems)

    return () => {
      window.removeEventListener(
        'storage',
        reloadItems,
      )
      window.removeEventListener(
        CHANGE_EVENT,
        reloadItems,
      )
    }
  }, [])

  function saveItems(nextItems: InventoryItem[]) {
    writeInventoryItems(nextItems)
    setItems(nextItems)
  }

  function addItem(
    name: string,
    quantity: number,
    unit: string,
    location: InventoryItem['location'],
  ) {
    const trimmedName = name.trim()

    if (
      !trimmedName ||
      !isValidInventoryQuantity(quantity)
    ) {
      return
    }

    const now = new Date().toISOString()

    saveItems([
      ...readInventoryItems(),
      {
        id: createInventoryId(),
        name: trimmedName,
        quantity,
        unit: unit.trim() || '개',
        location,
        createdAt: now,
        updatedAt: now,
      },
    ])
  }

  function updateItem(
    id: string,
    name: string,
    quantity: number,
    unit: string,
    location: InventoryItem['location'],
  ) {
    const trimmedName = name.trim()

    if (
      !trimmedName ||
      !isValidInventoryQuantity(quantity)
    ) {
      return
    }

    const now = new Date().toISOString()

    saveItems(
      readInventoryItems().map((item) =>
        item.id === id
          ? {
              ...item,
              name: trimmedName,
              quantity,
              unit: unit.trim() || '개',
              location,
              updatedAt: now,
            }
          : item,
      ),
    )
  }

  function deleteItem(id: string) {
    saveItems(
      readInventoryItems().filter(
        (item) => item.id !== id,
      ),
    )
  }

  return {
    items,
    addItem,
    updateItem,
    deleteItem,
  }
}

export default useInventory
