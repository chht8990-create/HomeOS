import { useEffect, useState } from 'react'
import { recipes as builtInRecipes } from '../data/recipes'
import { parseRecipeCollection } from '../services/mealPackEngine'
import {
  AI_MEAL_PLAN_TRIAL_CHANGE_EVENT,
  AI_MEAL_PLAN_TRIAL_STORAGE_KEY,
  parseStoredAiMealPlanTrial,
} from '../services/aiMealPlanTrialEngine'
import {
  AI_RECIPE_CHANGE_EVENT,
  persistAiRecommendationToStorage,
  readAiRecipesFromStorage,
} from '../services/aiRecipePersistenceEngine'
import {
  mergeRecipeCatalog,
  normalizeRecipeCollection,
} from '../services/recipeNormalizationEngine'
import type { Recipe } from '../types/recipe'
import type { AiRecipeRecommendation } from '../types/aiRecipeRecommendation'

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

    return normalizeRecipeCollection(parsedRecipes)
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return []
  }
}

function readAiMealPlanTrialRecipes(): Recipe[] {
  const storedValue = window.localStorage.getItem(
    AI_MEAL_PLAN_TRIAL_STORAGE_KEY,
  )

  if (!storedValue) {
    return []
  }

  try {
    return normalizeRecipeCollection(
      parseStoredAiMealPlanTrial(
        JSON.parse(storedValue),
      )?.response.recipes ?? [],
    )
  } catch {
    return []
  }
}

export function readAiRecipes(): Recipe[] {
  return readAiRecipesFromStorage(window.localStorage)
}

function useRecipes() {
  const [importedRecipes, setImportedRecipes] =
    useState<Recipe[]>(readImportedRecipes)
  const [
    aiMealPlanTrialRecipes,
    setAiMealPlanTrialRecipes,
  ] = useState<Recipe[]>(
    readAiMealPlanTrialRecipes,
  )
  const [aiRecipes, setAiRecipes] =
    useState<Recipe[]>(readAiRecipes)

  useEffect(() => {
    function reloadRecipes() {
      setImportedRecipes(readImportedRecipes())
      setAiMealPlanTrialRecipes(
        readAiMealPlanTrialRecipes(),
      )
      setAiRecipes(readAiRecipes())
    }

    window.addEventListener('storage', reloadRecipes)
    window.addEventListener(
      CHANGE_EVENT,
      reloadRecipes,
    )
    window.addEventListener(
      AI_MEAL_PLAN_TRIAL_CHANGE_EVENT,
      reloadRecipes,
    )
    window.addEventListener(
      AI_RECIPE_CHANGE_EVENT,
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
      window.removeEventListener(
        AI_MEAL_PLAN_TRIAL_CHANGE_EVENT,
        reloadRecipes,
      )
      window.removeEventListener(
        AI_RECIPE_CHANGE_EVENT,
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

  function saveAiRecommendationAsRecipe(
    recommendation: AiRecipeRecommendation,
  ) {
    const storedAiRecipes = readAiRecipes()
    const availableRecipes = mergeRecipeCatalog(
      builtInRecipes,
      [
        importedRecipes,
        aiMealPlanTrialRecipes,
        storedAiRecipes,
      ],
    )
    const result = persistAiRecommendationToStorage(
      window.localStorage,
      recommendation,
      availableRecipes,
    )

    if (!result.created) {
      return result
    }

    setAiRecipes(result.storedRecipes)
    window.dispatchEvent(
      new Event(AI_RECIPE_CHANGE_EVENT),
    )

    return result
  }

  const allRecipes = mergeRecipeCatalog(
    builtInRecipes,
    [
      importedRecipes,
      aiMealPlanTrialRecipes,
      aiRecipes,
    ],
  )

  return {
    recipes: allRecipes,
    importedRecipes,
    addImportedRecipes,
    aiRecipes,
    saveAiRecommendationAsRecipe,
  }
}

export default useRecipes
