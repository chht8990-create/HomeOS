import {
  AI_MAX_RECOMMENDATIONS,
  parseAiRecipeRecommendationOutput,
  validateAiRecipeRecommendationRequest,
} from './aiRecipeRecommendationEngine'
import type {
  AiRecipeRecommendationRequest,
  AiRecipeRecommendationResponse,
} from '../types/aiRecipeRecommendation'

const CLIENT_TIMEOUT_MS = 15_000
const DUPLICATE_WINDOW_MS = 30_000

type ApiErrorResponse = {
  code?: unknown
  message?: unknown
}

type RecentRequest = {
  signature: string
  createdAt: number
  response: AiRecipeRecommendationResponse
}

let recentRequest: RecentRequest | null = null
let inFlightRequest: {
  signature: string
  promise: Promise<AiRecipeRecommendationResponse>
} | null = null

export class AiRecipeRecommendationError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'AiRecipeRecommendationError'
    this.code = code
  }
}

function cloneResponse(
  response: AiRecipeRecommendationResponse,
): AiRecipeRecommendationResponse {
  return {
    recommendations: response.recommendations.map(
      (recommendation) => ({
        ...recommendation,
        ingredients: recommendation.ingredients.map(
          (ingredient) => ({
            ...ingredient,
            substitute: [...ingredient.substitute],
          }),
        ),
        missingIngredients:
          recommendation.missingIngredients.map(
            (ingredient) => ({ ...ingredient }),
          ),
        steps: recommendation.steps.map((step) => ({
          ...step,
          ingredientRefs: [...step.ingredientRefs],
        })),
        seasoningAdjustment: [
          ...recommendation.seasoningAdjustment,
        ],
        commonMistakes: [
          ...recommendation.commonMistakes,
        ],
        leftoverIdeas: [
          ...recommendation.leftoverIdeas,
        ],
        servingSuggestions: [
          ...recommendation.servingSuggestions,
        ],
      }),
    ),
    meta: { ...response.meta },
  }
}

async function readErrorResponse(response: Response) {
  try {
    return (await response.json()) as ApiErrorResponse
  } catch {
    return null
  }
}

async function performRequest(
  request: AiRecipeRecommendationRequest,
  fetchImplementation: typeof fetch,
) {
  const abortController = new AbortController()
  const timeoutId = window.setTimeout(
    () => abortController.abort(),
    CLIENT_TIMEOUT_MS,
  )

  try {
    const response = await fetchImplementation(
      '/api/ai/recipe-recommendation',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: abortController.signal,
      },
    )

    if (!response.ok) {
      const errorResponse =
        await readErrorResponse(response)
      const code =
        typeof errorResponse?.code === 'string'
          ? errorResponse.code
          : 'AI_REQUEST_FAILED'
      const message =
        typeof errorResponse?.message === 'string'
          ? errorResponse.message
          : 'AI 추천을 불러오지 못했어요.'

      throw new AiRecipeRecommendationError(
        code,
        message,
      )
    }

    const rawResponse = (await response.json()) as {
      recommendations?: unknown
      meta?: unknown
    }
    const recommendations =
      parseAiRecipeRecommendationOutput({
        recommendations: rawResponse.recommendations,
      })

    if (!recommendations) {
      throw new AiRecipeRecommendationError(
        'AI_RESPONSE_INVALID',
        'AI 추천 결과를 안전하게 읽지 못했어요.',
      )
    }

    return {
      recommendations,
      meta: {
        maxRecommendations:
          AI_MAX_RECOMMENDATIONS,
      },
    }
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === 'AbortError'
    ) {
      throw new AiRecipeRecommendationError(
        'AI_TIMEOUT',
        'AI 추천 시간이 길어지고 있어요. 잠시 후 다시 시도해 주세요.',
      )
    }

    if (error instanceof AiRecipeRecommendationError) {
      throw error
    }

    throw new AiRecipeRecommendationError(
      'AI_REQUEST_FAILED',
      'AI 추천에 연결하지 못했어요. 기존 추천은 계속 사용할 수 있어요.',
    )
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export async function requestAiRecipeRecommendations(
  value: unknown,
  fetchImplementation: typeof fetch = fetch,
) {
  const validation =
    validateAiRecipeRecommendationRequest(value)

  if (!validation.ok) {
    throw new AiRecipeRecommendationError(
      validation.code,
      validation.message,
    )
  }

  const signature = JSON.stringify(validation.data)
  const now = Date.now()

  if (
    recentRequest &&
    recentRequest.signature === signature &&
    now - recentRequest.createdAt <
      DUPLICATE_WINDOW_MS
  ) {
    return cloneResponse(recentRequest.response)
  }

  if (
    inFlightRequest &&
    inFlightRequest.signature === signature
  ) {
    return inFlightRequest.promise.then(cloneResponse)
  }

  const requestPromise = performRequest(
    validation.data,
    fetchImplementation,
  )
    .then((response) => {
      recentRequest = {
        signature,
        createdAt: Date.now(),
        response: cloneResponse(response),
      }

      return response
    })
    .finally(() => {
      if (inFlightRequest?.signature === signature) {
        inFlightRequest = null
      }
    })

  inFlightRequest = {
    signature,
    promise: requestPromise,
  }

  return requestPromise.then(cloneResponse)
}
