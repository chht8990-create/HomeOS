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
  completeStoredAiMealPlanTrial,
  findGoldenRecipeForDraftDay,
  parseStoredAiMealPlanTrial,
} from '../services/aiMealPlanTrialEngine'
import {
  AiMealPlanTrialError,
  requestAiMealPlanRecipeDetail,
  requestAiMealPlanTrial,
} from '../services/aiMealPlanTrialClient'
import type {
  AiMealPlanDraftDay,
  AiMealPlanTrialRequest,
  StoredAiMealPlanTrial,
} from '../types/aiMealPlanTrial'

export type AiRecipeDetailGenerationState = {
  status: 'idle' | 'loading' | 'success' | 'error'
  error?: string
}

export type AiRecipeDetailGenerationStates = Record<
  string,
  AiRecipeDetailGenerationState
>

export function updateRecipeDetailGenerationState(
  current: AiRecipeDetailGenerationStates,
  recipeId: string,
  status: AiRecipeDetailGenerationState['status'],
  error?: string,
): AiRecipeDetailGenerationStates {
  return {
    ...current,
    [recipeId]: {
      status,
      ...(status === 'error' && error ? { error } : {}),
    },
  }
}

function getRecipeDetailErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : '상세 레시피를 만들지 못했어요.'
}

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
    recipeDetailGenerationStates,
    setRecipeDetailGenerationStates,
  ] = useState<AiRecipeDetailGenerationStates>({})
  const isGeneratingRef = useRef(false)
  const generatingRecipeIdsRef = useRef(
    new Set<string>(),
  )
  const generatingRecipeIds = Object.entries(
    recipeDetailGenerationStates,
  )
    .filter(([, state]) => state.status === 'loading')
    .map(([recipeId]) => recipeId)

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
    trial: StoredAiMealPlanTrial | null,
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
      let savedTrial: StoredAiMealPlanTrial

      try {
        savedTrial = writeTrial(nextTrial)
      } catch {
        throw new AiMealPlanTrialError(
          'STORAGE_SAVE_FAILED',
          '식단을 기기에 저장하지 못했어요.',
        )
      }

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
    markCompleted = true,
  ) {
    const currentTrial = readTrial()

    if (!currentTrial) {
      const error = new Error(
        '저장된 맞춤 식단 초안을 찾지 못했어요.',
      )
      setRecipeDetailGenerationStates((current) =>
        updateRecipeDetailGenerationState(
          current,
          day.recipeId,
          'error',
          error.message,
        ),
      )
      throw error
    }

    if (
      currentTrial.response.recipes.some(
        (recipe) => recipe.id === day.recipeId,
      )
    ) {
      setRecipeDetailGenerationStates((current) =>
        updateRecipeDetailGenerationState(
          current,
          day.recipeId,
          'success',
        ),
      )
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
      const error = new Error(
        '상세 레시피 생성 조건을 찾지 못했어요.',
      )
      setRecipeDetailGenerationStates((current) =>
        updateRecipeDetailGenerationState(
          current,
          day.recipeId,
          'error',
          error.message,
        ),
      )
      throw error
    }

    generatingRecipeIdsRef.current.add(
      day.recipeId,
    )
    setRecipeDetailGenerationStates((current) =>
      updateRecipeDetailGenerationState(
        current,
        day.recipeId,
        'loading',
      ),
    )

    try {
      const request = currentTrial.request
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
              ...(request.traceId
                ? { traceId: request.traceId }
                : {}),
              day,
              householdSize:
                request.householdSize,
              includesChildren:
                request.includesChildren,
              ...(request.childAgeGroup
                ? {
                    childAgeGroup:
                      request.childAgeGroup,
                  }
                : {}),
              spicePreference:
                request.spicePreference,
              ...(request.excludedFoods
                ? {
                    excludedFoods:
                      request.excludedFoods,
                  }
                : {}),
              ...(request.allergies
                ? {
                    allergies:
                      request.allergies,
                  }
                : {}),
            },
            signal,
          )
      const latestTrial = readTrial()

      if (!latestTrial) {
        throw new AiMealPlanTrialError(
          'RECIPE_SAVE_FAILED',
          '저장된 맞춤 식단을 다시 찾지 못했어요.',
        )
      }

      if (
        latestTrial.response.recipes.some(
          (recipe) => recipe.id === day.recipeId,
        )
      ) {
        setRecipeDetailGenerationStates((current) =>
          updateRecipeDetailGenerationState(
            current,
            day.recipeId,
            'success',
          ),
        )
        return latestTrial
      }

      const nextTrial =
        addRecipeToStoredAiMealPlanTrial(
          latestTrial,
          detail.recipe,
          goldenRecipe ? 'golden' : 'ai',
          detail.meta,
          new Date().toISOString(),
          markCompleted,
        )

      if (!nextTrial) {
        throw new AiMealPlanTrialError(
          'RECIPE_GENERATION_FAILED',
          '상세 레시피를 식단에 연결하지 못했어요.',
        )
      }

      let savedTrial: StoredAiMealPlanTrial

      try {
        savedTrial = writeTrial(nextTrial)
      } catch {
        throw new AiMealPlanTrialError(
          'RECIPE_SAVE_FAILED',
          '상세 레시피를 기기에 저장하지 못했어요.',
        )
      }

      publishTrial(savedTrial)
      setRecipeDetailGenerationStates((current) =>
        updateRecipeDetailGenerationState(
          current,
          day.recipeId,
          'success',
        ),
      )
      return savedTrial
    } catch (error) {
      setRecipeDetailGenerationStates((current) =>
        updateRecipeDetailGenerationState(
          current,
          day.recipeId,
          'error',
          getRecipeDetailErrorMessage(error),
        ),
      )
      throw error
    } finally {
      generatingRecipeIdsRef.current.delete(
        day.recipeId,
      )
    }
  }

  function clearRecipeDetailGenerationError(
    recipeId: string,
  ) {
    setRecipeDetailGenerationStates((current) =>
      current[recipeId]?.status === 'error'
        ? updateRecipeDetailGenerationState(
            current,
            recipeId,
            'idle',
          )
        : current,
    )
  }

  function completeTrial() {
    const currentTrial = readTrial()
    const completedTrial =
      currentTrial &&
      completeStoredAiMealPlanTrial(currentTrial)

    if (!completedTrial) {
        throw new AiMealPlanTrialError(
          'TRIAL_COMPLETE_FAILED',
        '맞춤 식단을 완료 처리하지 못했어요.',
      )
    }

    try {
      const savedTrial = writeTrial(completedTrial)

      publishTrial(savedTrial)
      return savedTrial
    } catch {
      throw new AiMealPlanTrialError(
        'TRIAL_COMPLETE_FAILED',
        '맞춤 식단을 완료 처리하지 못했어요.',
      )
    }
  }

  function discardIncompleteTrial() {
    const currentTrial = readTrial()

    if (currentTrial?.status === 'completed') {
      return
    }

    window.localStorage.removeItem(
      AI_MEAL_PLAN_TRIAL_STORAGE_KEY,
    )
    publishTrial(null)
  }

  return {
    storedTrial,
    isGenerating,
    generatingRecipeIds,
    recipeDetailGenerationStates,
    generateTrial,
    ensureRecipeDetail,
    clearRecipeDetailGenerationError,
    completeTrial,
    discardIncompleteTrial,
  }
}

export default useAiMealPlanTrial
