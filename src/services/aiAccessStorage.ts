import {
  canGenerateMealPlan,
  canGenerateRecipe,
  canUseAI,
  createInitialAiAccessUsage,
  getRemainingTrialDays,
  getSubscriptionStatus,
  parseAiAccessUsage,
  recordAiGeneration,
  resolveAiAccessUsage,
} from './aiAccessEngine'
import type {
  AiAccessUsage,
  AiGenerationKind,
} from '../types/aiAccess'

export const AI_ACCESS_STORAGE_KEY =
  'today-table.ai-access.v1'

export type AiAccessStorage = Pick<
  Storage,
  'getItem' | 'setItem'
>

type AiAccessServiceOptions = {
  now?: () => Date
}

function saveAiAccessUsage(
  storage: AiAccessStorage,
  usage: AiAccessUsage,
) {
  try {
    storage.setItem(
      AI_ACCESS_STORAGE_KEY,
      JSON.stringify(usage),
    )
  } catch {
    // LocalStorage가 차단되어도 앱 실행을 막지 않는다.
  }

  return usage
}

export function initializeAiAccessUsage(
  storage: AiAccessStorage,
  now: Date | string = new Date(),
) {
  let storedValue: string | null

  try {
    storedValue = storage.getItem(
      AI_ACCESS_STORAGE_KEY,
    )
  } catch {
    return createInitialAiAccessUsage()
  }

  if (storedValue) {
    try {
      const parsedUsage = parseAiAccessUsage(
        JSON.parse(storedValue),
      )

      if (parsedUsage) {
        return saveAiAccessUsage(
          storage,
          resolveAiAccessUsage(parsedUsage, now),
        )
      }
    } catch {
      // 손상된 새 access key만 안전하게 다시 만든다.
    }
  }

  return saveAiAccessUsage(
    storage,
    createInitialAiAccessUsage(),
  )
}

export function createLocalAiAccessService(
  storage: AiAccessStorage,
  options: AiAccessServiceOptions = {},
) {
  const readNow = options.now ?? (() => new Date())

  function getUsage() {
    return initializeAiAccessUsage(
      storage,
      readNow(),
    )
  }

  return {
    getUsage,
    canUseAI() {
      return canUseAI(getUsage(), readNow())
    },
    canGenerateMealPlan() {
      return canGenerateMealPlan(
        getUsage(),
        readNow(),
      )
    },
    canGenerateRecipe() {
      return canGenerateRecipe(
        getUsage(),
        readNow(),
      )
    },
    getRemainingTrialDays() {
      return getRemainingTrialDays(
        getUsage(),
        readNow(),
      )
    },
    getSubscriptionStatus() {
      return getSubscriptionStatus(
        getUsage(),
        readNow(),
      )
    },
    recordGeneration(kind: AiGenerationKind) {
      const result = recordAiGeneration(
        getUsage(),
        kind,
        readNow(),
      )

      if (result.recorded) {
        saveAiAccessUsage(
          storage,
          result.usage,
        )
      }

      return result
    },
  }
}
