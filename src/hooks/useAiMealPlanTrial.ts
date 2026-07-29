import { useEffect, useState } from 'react'
import {
  AI_MEAL_PLAN_TRIAL_CHANGE_EVENT,
  AI_MEAL_PLAN_TRIAL_STORAGE_KEY,
  parseStoredAiMealPlanTrial,
} from '../services/aiMealPlanTrialEngine'
import { requestAiMealPlanTrial } from '../services/aiMealPlanTrialClient'
import type {
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

function useAiMealPlanTrial() {
  const [storedTrial, setStoredTrial] =
    useState<StoredAiMealPlanTrial | null>(
      readTrial,
    )
  const [isGenerating, setIsGenerating] =
    useState(false)

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

  async function generateTrial(
    request: AiMealPlanTrialRequest,
    signal?: AbortSignal,
  ) {
    const currentTrial = readTrial()

    if (currentTrial) {
      return currentTrial.response
    }

    if (isGenerating) {
      throw new Error(
        '맞춤 식단을 이미 만들고 있어요.',
      )
    }

    setIsGenerating(true)

    try {
      const response = await requestAiMealPlanTrial(
        request,
        signal,
      )
      const usedAt = new Date().toISOString()
      const nextTrial: StoredAiMealPlanTrial = {
        formatVersion: '1',
        usedAt,
        response,
      }
      const serializedTrial = JSON.stringify(nextTrial)

      window.localStorage.setItem(
        AI_MEAL_PLAN_TRIAL_STORAGE_KEY,
        serializedTrial,
      )

      const savedTrial = readTrial()

      if (!savedTrial) {
        window.localStorage.removeItem(
          AI_MEAL_PLAN_TRIAL_STORAGE_KEY,
        )
        throw new Error(
          '맞춤 식단을 기기에 저장하지 못했어요.',
        )
      }

      setStoredTrial(savedTrial)
      window.dispatchEvent(
        new Event(
          AI_MEAL_PLAN_TRIAL_CHANGE_EVENT,
        ),
      )

      return savedTrial.response
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    storedTrial,
    isGenerating,
    generateTrial,
  }
}

export default useAiMealPlanTrial
