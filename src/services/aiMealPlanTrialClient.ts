import {
  parseAiMealPlanDraftResponse,
  parseAiMealPlanRecipeDetailResponse,
  validateAiMealPlanRecipeDetailRequest,
  validateAiMealPlanTrialRequest,
} from './aiMealPlanTrialEngine'
import type {
  AiMealPlanDraftResponse,
  AiMealPlanRecipeDetailRequest,
  AiMealPlanRecipeDetailResponse,
  AiMealPlanTrialRequest,
} from '../types/aiMealPlanTrial'

const REQUEST_TIMEOUT_MS = 30_000
const MAX_DRAFT_RESPONSE_BYTES = 120_000
const MAX_DETAIL_RESPONSE_BYTES = 240_000

type ErrorPayload = {
  code?: unknown
  message?: unknown
}

export class AiMealPlanTrialError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'AiMealPlanTrialError'
    this.code = code
  }
}

let activeDraftRequest:
  | Promise<AiMealPlanDraftResponse>
  | null = null
const activeDetailRequests = new Map<
  string,
  Promise<AiMealPlanRecipeDetailResponse>
>()

function readErrorPayload(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const payload = value as ErrorPayload

  return {
    code:
      typeof payload.code === 'string'
        ? payload.code
        : 'AI_TRIAL_FAILED',
    message:
      typeof payload.message === 'string'
        ? payload.message
        : '맞춤 식단을 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
  }
}

function requestJson<T>({
  path,
  body,
  parse,
  maxResponseBytes,
  timeoutCode,
  timeoutMessage,
  externalSignal,
}: {
  path: string
  body: unknown
  parse: (value: unknown) => T | null
  maxResponseBytes: number
  timeoutCode: string
  timeoutMessage: string
  externalSignal?: AbortSignal
}) {
  const abortController = new AbortController()
  const handleExternalAbort = () =>
    abortController.abort()

  externalSignal?.addEventListener(
    'abort',
    handleExternalAbort,
    { once: true },
  )

  const timeoutId = window.setTimeout(
    () => abortController.abort(),
    REQUEST_TIMEOUT_MS,
  )

  return fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: abortController.signal,
  })
    .then(async (response) => {
      const responseText = await response.text()

      if (
        responseText.length > maxResponseBytes
      ) {
        throw new AiMealPlanTrialError(
          'AI_RESPONSE_TOO_LARGE',
          'AI 결과가 너무 커서 안전하게 읽지 못했어요.',
        )
      }

      let responseBody: unknown

      try {
        responseBody = JSON.parse(responseText)
      } catch {
        throw new AiMealPlanTrialError(
          'AI_RESPONSE_INVALID',
          'AI 결과를 안전하게 읽지 못했어요.',
        )
      }

      if (!response.ok) {
        const payload =
          readErrorPayload(responseBody)

        throw new AiMealPlanTrialError(
          payload?.code ?? 'AI_TRIAL_FAILED',
          payload?.message ??
            'AI 결과를 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
        )
      }

      const parsed = parse(responseBody)

      if (!parsed) {
        throw new AiMealPlanTrialError(
          'AI_RESPONSE_INVALID',
          'AI 결과 형식이 올바르지 않아요.',
        )
      }

      return parsed
    })
    .catch((error: unknown) => {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        throw new AiMealPlanTrialError(
          externalSignal?.aborted
            ? 'AI_TRIAL_CANCELLED'
            : timeoutCode,
          externalSignal?.aborted
            ? '맞춤 식단 만들기를 취소했어요.'
            : timeoutMessage,
        )
      }

      if (error instanceof AiMealPlanTrialError) {
        throw error
      }

      throw new AiMealPlanTrialError(
        'AI_NETWORK_ERROR',
        '네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
      )
    })
    .finally(() => {
      window.clearTimeout(timeoutId)
      externalSignal?.removeEventListener(
        'abort',
        handleExternalAbort,
      )
    })
}

export function requestAiMealPlanTrial(
  request: AiMealPlanTrialRequest,
  externalSignal?: AbortSignal,
) {
  const validation =
    validateAiMealPlanTrialRequest(request)

  if (!validation.ok) {
    return Promise.reject(
      new AiMealPlanTrialError(
        validation.code,
        validation.message,
      ),
    )
  }

  if (activeDraftRequest) {
    return activeDraftRequest
  }

  activeDraftRequest = requestJson({
    path: '/api/ai/meal-plan-trial',
    body: validation.data,
    parse: (value) =>
      parseAiMealPlanDraftResponse(
        value,
        validation.data,
      ),
    maxResponseBytes: MAX_DRAFT_RESPONSE_BYTES,
    timeoutCode: 'AI_TRIAL_TIMEOUT',
    timeoutMessage:
      '맞춤 식단 초안 생성 시간이 길어지고 있어요. 무료 체험은 사용 처리되지 않았어요.',
    externalSignal,
  }).finally(() => {
    activeDraftRequest = null
  })

  return activeDraftRequest
}

export function requestAiMealPlanRecipeDetail(
  request: AiMealPlanRecipeDetailRequest,
  externalSignal?: AbortSignal,
) {
  const validation =
    validateAiMealPlanRecipeDetailRequest(request)

  if (!validation.ok) {
    return Promise.reject(
      new AiMealPlanTrialError(
        validation.code,
        validation.message,
      ),
    )
  }

  const recipeId = validation.data.day.recipeId
  const activeRequest =
    activeDetailRequests.get(recipeId)

  if (activeRequest) {
    return activeRequest
  }

  const requestPromise = requestJson({
    path: '/api/ai/meal-plan-recipe-detail',
    body: validation.data,
    parse: (value) =>
      parseAiMealPlanRecipeDetailResponse(
        value,
        validation.data,
      ),
    maxResponseBytes: MAX_DETAIL_RESPONSE_BYTES,
    timeoutCode: 'AI_RECIPE_DETAIL_TIMEOUT',
    timeoutMessage:
      '상세 레시피 생성 시간이 길어졌어요. 식단은 그대로 두고 이 메뉴에서 다시 시도해 주세요.',
    externalSignal,
  }).finally(() => {
    activeDetailRequests.delete(recipeId)
  })

  activeDetailRequests.set(
    recipeId,
    requestPromise,
  )
  return requestPromise
}
