import {
  useEffect,
  useRef,
  useState,
} from 'react'
import { recipes as builtInRecipes } from '../data/recipes'
import {
  AI_MEAL_PLAN_TRIAL_CHANGE_EVENT,
  AI_MEAL_PLAN_TRIAL_STORAGE_KEY,
  addRecipeToStoredAiMealPlanTrial,
  findGoldenRecipeForDraftDay,
  parseStoredAiMealPlanTrial,
} from '../services/aiMealPlanTrialEngine'
import {
  requestAiMealPlanRecipeDetail,
  requestAiMealPlanTrial,
} from '../services/aiMealPlanTrialClient'
import type {
  AiMealPlanDraftDay,
  AiMealPlanTrialRequest,
  StoredAiMealPlanTrial,
} from '../types/aiMealPlanTrial'

function readTrial() {
  const value = window.localStorage.getItem(
    AI_MEAL_PLAN_TRIAL_STORAGE_KEY,
  )

  if (!value) {
    return null
  }

  try {
    return parseStoredAiMealPlanTrial(
      JSON.parse(value),
    )
  } catch {
    return null
  }
}

function writeTrial(
  trial: StoredAiMealPlanTrial,
) {
  const previousValue = window.localStorage.getItem(
    AI_MEAL_PLAN_TRIAL_STORAGE_KEY,
  )

  try {
    window.localStorage.setItem(
      AI_MEAL_PLAN_TRIAL_STORAGE_KEY,
      JSON.stringify(trial),
    )
    const savedTrial = readTrial()

    if (!savedTrial) {
      throw new Error(
        '맞춤 식단을 기기에 저장하지 못했어요.',
      )
    }

    return savedTrial
  } catch (error) {
    if (previousValue === null) {
      window.localStorage.removeItem(
        AI_MEAL_PLAN_TRIAL_STORAGE_KEY,
      )
    } else {
      window.localStorage.setItem(
        AI_MEAL_PLAN_TRIAL_STORAGE_KEY,
        previousValue,
      )
    }

    throw error
  }
}

function useAiMealPlanTrial() {
  const [storedTrial, setStoredTrial] =
    useState<StoredAiMealPlanTrial | null>(
      readTrial,
    )
  const [isGenerating, setIsGenerating] =
    useState(false)
  const [
    generatingRecipeIds,
    setGeneratingRecipeIds,
  ] = useState<string[]>([])
  const isGeneratingRef = useRef(false)
  const generatingRecipeIdsRef = useRef(
    new Set<string>(),
  )

  useEffect(() => {
    function reloadTrial() {
      setStoredTrial(readTrial())
    }

    window.addEventListener('storage', reloadTrial)
    window.addEventListener(
      AI_MEAL_PLAN_TRIAL_CHANGE_EVENT,
      reloadTrial,
    )

    return () => {
      window.removeEventListener(
        'storage',
        reloadTrial,
      )
      window.removeEventListener(
        AI_MEAL_PLAN_TRIAL_CHANGE_EVENT,
        reloadTrial,
      )
    }
  }, [])

  function publishTrial(
    trial: StoredAiMealPlanTrial,
  ) {
    setStoredTrial(trial)
    window.dispatchEvent(
      new Event(
        AI_MEAL_PLAN_TRIAL_CHANGE_EVENT,
      ),
    )
  }

  async function generateTrial(
    request: AiMealPlanTrialRequest,
    signal?: AbortSignal,
  ) {
    const currentTrial = readTrial()

    if (currentTrial) {
      return currentTrial
    }

    if (isGeneratingRef.current) {
      throw new Error(
        '맞춤 식단을 이미 만들고 있어요.',
      )
    }

    isGeneratingRef.current = true
    setIsGenerating(true)

    try {
      const draft = await requestAiMealPlanTrial(
        request,
        signal,
      )
      const nextTrial: StoredAiMealPlanTrial = {
        formatVersion: '2',
        status: 'draft',
        draftCreatedAt: draft.meta.generatedAt,
        request,
        response: {
          plans: draft.plans,
          days: draft.days,
          recipes: [],
          recipeSources: {},
          recipeMeta: {},
          weeklyShoppingIngredients: [],
          meta: draft.meta,
        },
      }
      const savedTrial = writeTrial(nextTrial)

      publishTrial(savedTrial)
      return savedTrial
    } finally {
      isGeneratingRef.current = false
      setIsGenerating(false)
    }
  }

  async function ensureRecipeDetail(
    day: AiMealPlanDraftDay,
    signal?: AbortSignal,
  ) {
    const currentTrial = readTrial()

    if (!currentTrial) {
      throw new Error(
        '저장된 맞춤 식단 초안을 찾지 못했어요.',
      )
    }

    if (
      currentTrial.response.recipes.some(
        (recipe) => recipe.id === day.recipeId,
      )
    ) {
      return currentTrial
    }

    if (
      generatingRecipeIdsRef.current.has(
        day.recipeId,
      )
    ) {
      throw new Error(
        '이 메뉴의 상세 레시피를 이미 만들고 있어요.',
      )
    }

    if (!currentTrial.request) {
      throw new Error(
        '상세 레시피 생성 조건을 찾지 못했어요.',
      )
    }

    generatingRecipeIdsRef.current.add(
      day.recipeId,
    )
    setGeneratingRecipeIds([
      ...generatingRecipeIdsRef.current,
    ])

    try {
      const goldenRecipe =
        findGoldenRecipeForDraftDay(
          day,
          builtInRecipes,
        )
      const detail = goldenRecipe
        ? {
            recipe: goldenRecipe,
            meta: {
              model: 'golden',
              generatedAt:
                new Date().toISOString(),
              durationMs: 0,
              outputBytes: 0,
              usage: {
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
              },
            },
          }
        : await requestAiMealPlanRecipeDetail(
            {
              day,
              householdSize:
                currentTrial.request.householdSize,
              includesChildren:
                currentTrial.request
                  .includesChildren,
              ...(currentTrial.request.childAgeGroup
                ? {
                    childAgeGroup:
                      currentTrial.request
                        .childAgeGroup,
                  }
                : {}),
              spicePreference:
                currentTrial.request
                  .spicePreference,
              ...(currentTrial.request.excludedFoods
                ? {
                    excludedFoods:
                      currentTrial.request
                        .excludedFoods,
                  }
                : {}),
              ...(currentTrial.request.allergies
                ? {
                    allergies:
                      currentTrial.request
                        .allergies,
                  }
                : {}),
            },
            signal,
          )
      const nextTrial =
        addRecipeToStoredAiMealPlanTrial(
          currentTrial,
          detail.recipe,
          goldenRecipe ? 'golden' : 'ai',
          detail.meta,
        )

      if (!nextTrial) {
        throw new Error(
          '상세 레시피를 식단에 연결하지 못했어요.',
        )
      }

      const savedTrial = writeTrial(nextTrial)

      publishTrial(savedTrial)
      return savedTrial
    } finally {
      generatingRecipeIdsRef.current.delete(
        day.recipeId,
      )
      setGeneratingRecipeIds([
        ...generatingRecipeIdsRef.current,
      ])
    }
  }

  return {
    storedTrial,
    isGenerating,
    generatingRecipeIds,
    generateTrial,
    ensureRecipeDetail,
  }
}

export default useAiMealPlanTrial
