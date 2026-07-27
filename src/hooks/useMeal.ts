import { useState } from 'react'
import { recipes } from '../data/recipes'
import type { MealType, StoredMeal } from '../types/meal'

export type MealEditorStatus =
  | 'empty'
  | 'editing'
  | 'planned'
  | 'skipped'

type UseMealOptions = {
  date: string
  mealType: MealType
}

function getRecipeByMealName(mealName: string) {
  const normalizedMealName = mealName
    .trim()
    .replace(/\s+/g, '')

  return recipes.find(
    (recipe) =>
      recipe.name.replace(/\s+/g, '') === normalizedMealName,
  )
}

function createMealId(date: string, mealType: MealType) {
  return `${date}-${mealType}`
}

function dispatchMealCleared(sourceId: string) {
  window.dispatchEvent(
    new CustomEvent('homeos:meal-cleared', {
      detail: {
        sourceId,
      },
    }),
  )
}

function loadStoredMeal(
  storageKey: string,
  date: string,
  mealType: MealType,
): StoredMeal | null {
  const storedValue =
    window.localStorage.getItem(storageKey)

  if (!storedValue) {
    return null
  }

  try {
    const parsedMeal =
      JSON.parse(storedValue) as StoredMeal

    if (
      parsedMeal.date !== date ||
      parsedMeal.type !== mealType
    ) {
      window.localStorage.removeItem(storageKey)
      return null
    }

    return parsedMeal
  } catch {
    window.localStorage.removeItem(storageKey)
    return null
  }
}

function useMeal({ date, mealType }: UseMealOptions) {
  const storageKey =
    `homeos.meal.${date}.${mealType}`

  const [savedMeal, setSavedMeal] =
    useState<StoredMeal | null>(() =>
      loadStoredMeal(storageKey, date, mealType),
    )

  const [mealStatus, setMealStatus] =
    useState<MealEditorStatus>(
      () => savedMeal?.status ?? 'empty',
    )

  const [mealName, setMealName] = useState(
    () =>
      savedMeal?.status === 'planned'
        ? savedMeal.name
        : '',
  )

  function startEditing() {
    setMealName(
      savedMeal?.status === 'planned'
        ? savedMeal.name
        : '',
    )

    setMealStatus('editing')
  }

  function updateMealName(value: string) {
    setMealName(value)
  }

  function saveMeal() {
    const trimmedMealName = mealName.trim()

    if (!trimmedMealName) {
      return
    }

    const now = new Date().toISOString()

    const meal: StoredMeal = {
      id: createMealId(date, mealType),
      date,
      type: mealType,
      status: 'planned',
      name: trimmedMealName,
      createdAt: savedMeal?.createdAt ?? now,
      updatedAt: now,
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify(meal),
    )

    const recipe =
      getRecipeByMealName(trimmedMealName)

    if (recipe) {
      window.dispatchEvent(
        new CustomEvent(
          'homeos:meal-recipe-matched',
          {
            detail: {
              sourceId: meal.id,
              ingredients: recipe.ingredients,
            },
          },
        ),
      )
    } else {
      dispatchMealCleared(meal.id)
    }

    setMealName(trimmedMealName)
    setSavedMeal(meal)
    setMealStatus('planned')
  }

  function skipMeal() {
    const now = new Date().toISOString()
    const mealId = createMealId(date, mealType)

    const meal: StoredMeal = {
      id: mealId,
      date,
      type: mealType,
      status: 'skipped',
      createdAt: savedMeal?.createdAt ?? now,
      updatedAt: now,
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify(meal),
    )

    dispatchMealCleared(mealId)

    setMealName('')
    setSavedMeal(meal)
    setMealStatus('skipped')
  }

  function cancelEditing() {
    setMealName(
      savedMeal?.status === 'planned'
        ? savedMeal.name
        : '',
    )

    if (!savedMeal) {
      setMealStatus('empty')
      return
    }

    setMealStatus(savedMeal.status)
  }

  function clearMeal() {
    const mealId = createMealId(date, mealType)

    dispatchMealCleared(mealId)

    window.localStorage.removeItem(storageKey)

    setMealName('')
    setSavedMeal(null)
    setMealStatus('empty')
  }

  return {
    mealStatus,
    mealName,
    savedMeal,
    savedMealName:
      savedMeal?.status === 'planned'
        ? savedMeal.name
        : '',
    canSave: Boolean(mealName.trim()),
    startEditing,
    updateMealName,
    saveMeal,
    skipMeal,
    cancelEditing,
    clearMeal,
  }
}

export default useMeal
