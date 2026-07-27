import { useEffect, useState } from 'react'
import { recipes as builtInRecipes } from '../data/recipes'
import { parseRecipeCollection } from '../services/mealPackEngine'
import type { Recipe } from '../types/recipe'

const STORAGE_KEY = 'homeos.recipes.imported'
const CHANGE_EVENT = 'homeos:recipes-changed'

function readImportedRecipes(): Recipe[] {
  const storedValue =
    window.localStorage.getItem(STORAGE_KEY)

  if (!storedValue) {
    return []
  }

  try {
    const parsedRecipes = parseRecipeCollection(
      JSON.parse(storedValue),
    )

    if (parsedRecipes.length === 0) {
      const parsedValue = JSON.parse(storedValue)

      if (
        !Array.isArray(parsedValue) ||
        parsedValue.length > 0
      ) {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    }

    return parsedRecipes
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return []
  }
}

function useRecipes() {
  const [importedRecipes, setImportedRecipes] =
    useState<Recipe[]>(readImportedRecipes)

  useEffect(() => {
    function reloadRecipes() {
      setImportedRecipes(readImportedRecipes())
    }

    window.addEventListener('storage', reloadRecipes)
    window.addEventListener(
      CHANGE_EVENT,
      reloadRecipes,
    )

    return () => {
      window.removeEventListener(
        'storage',
        reloadRecipes,
      )
      window.removeEventListener(
        CHANGE_EVENT,
        reloadRecipes,
      )
    }
  }, [])

  function addImportedRecipes(recipes: Recipe[]) {
    if (recipes.length === 0) {
      return
    }

    const nextRecipes = [
      ...readImportedRecipes(),
      ...recipes,
    ]

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(nextRecipes),
    )
    setImportedRecipes(nextRecipes)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }

  return {
    recipes: [
      ...builtInRecipes,
      ...importedRecipes,
    ],
    importedRecipes,
    addImportedRecipes,
  }
}

export default useRecipes
