import {
  parseStoredAiMealPlanTrial,
  validateAiMealPlanTrialRequest,
} from './aiMealPlanTrialEngine'
import type {
  AiMealPlanTrialRequest,
  AiMealPlanTrialResponse,
} from '../types/aiMealPlanTrial'

const REQUEST_TIMEOUT_MS = 45_000
const MAX_RESPONSE_BYTES = 500_000

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

let activeRequest:
  | Promise<AiMealPlanTrialResponse>
  | null = null

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

function parseResponse(
  value: unknown,
): AiMealPlanTrialResponse | null {
  const stored = parseStoredAiMealPlanTrial({
    formatVersion: '1',
    usedAt: new Date().toISOString(),
    response: value,
  })

  return stored?.response ?? null
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

  if (activeRequest) {
    return activeRequest
  }

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

  activeRequest = fetch('/api/ai/meal-plan-trial', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(validation.data),
    signal: abortController.signal,
  })
    .then(async (response) => {
      const responseText = await response.text()

      if (responseText.length > MAX_RESPONSE_BYTES) {
        throw new AiMealPlanTrialError(
          'AI_RESPONSE_TOO_LARGE',
          '맞춤 식단 결과가 너무 커서 안전하게 읽지 못했어요.',
        )
      }

      let responseBody: unknown

      try {
        responseBody = JSON.parse(responseText)
      } catch {
        throw new AiMealPlanTrialError(
          'AI_RESPONSE_INVALID',
          '맞춤 식단 결과를 안전하게 읽지 못했어요.',
        )
      }

      if (!response.ok) {
        const payload = readErrorPayload(responseBody)

        throw new AiMealPlanTrialError(
          payload?.code ?? 'AI_TRIAL_FAILED',
          payload?.message ??
            '맞춤 식단을 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
        )
      }

      const parsedResponse = parseResponse(responseBody)

      if (!parsedResponse) {
        throw new AiMealPlanTrialError(
          'AI_RESPONSE_INVALID',
          '맞춤 식단 결과 형식이 올바르지 않아요.',
        )
      }

      return parsedResponse
    })
    .catch((error: unknown) => {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        throw new AiMealPlanTrialError(
          externalSignal?.aborted
            ? 'AI_TRIAL_CANCELLED'
            : 'AI_TRIAL_TIMEOUT',
          externalSignal?.aborted
            ? '맞춤 식단 만들기를 취소했어요.'
            : '맞춤 식단 생성 시간이 길어지고 있어요. 잠시 후 다시 시도해 주세요.',
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
      activeRequest = null
    })

  return activeRequest
}
