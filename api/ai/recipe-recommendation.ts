import {
  AI_MAX_ESTIMATED_MINUTES,
  AI_MAX_INVENTORY_ITEMS,
  AI_MAX_RECOMMENDATIONS,
  AI_MIN_ESTIMATED_MINUTES,
  getAiInventoryQuantity,
  normalizeAiRecipeRecommendations,
  parseAiRecipeRecommendationOutput,
  validateAiRecipeRecommendationRequest,
} from '../../src/services/aiRecipeRecommendationEngine.js'
import type {
  AiInventoryIngredient,
  AiRecipeRecommendation,
  AiRecipeRecommendationRequest,
  AiRecipeRecommendationResponse,
} from '../../src/types/aiRecipeRecommendation.js'
import { runAiBusinessGuard } from '../../src/server/aiBusinessGuard.js'
import {
  createCompactAiRecommendationSchema,
  parseCompactAiRecommendationText,
} from '../../src/server/compactAiRecommendationEngine.js'
import {
  logAiLatencyStage,
  type AiLatencyTrace,
} from '../../src/server/aiLatencyTrace.js'

const OPENAI_RESPONSES_URL =
  'https://api.openai.com/v1/responses'
const DEFAULT_MODEL = 'gpt-5.6-luna'
const SERVER_TIMEOUT_MS = 20_000
const MAX_OUTPUT_TOKENS = 3_000
const MAX_REQUEST_BYTES = 20_000
const MAX_RESPONSE_BYTES = 250_000
const MAX_UPSTREAM_RETRIES = 1
const DUPLICATE_WINDOW_MS = 30_000
const MAX_CACHE_ENTRIES = 25
const RECOMMENDATION_POLICY_VERSION =
  's5.3-naturalness-v1'
const MAX_ERROR_FIELD_LENGTH = 120
const MAX_ERROR_MESSAGE_LENGTH = 240

type AiUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export type OpenAiErrorDetails = {
  upstreamStatus: number
  errorType: string | null
  errorCode: string | null
  errorParam: string | null
  errorMessage: string | null
  requestId: string | null
}

type MappedOpenAiError = {
  code: string
  message: string
  status: number
}

export type AiServerEnvironment = {
  OPENAI_API_KEY?: string
  OPENAI_MODEL?: string
  HOMEOS_AI_MOCK?: string
  NODE_ENV?: string
}

type CachedResponse = {
  createdAt: number
  response: AiRecipeRecommendationResponse
}

const recentResponses = new Map<string, CachedResponse>()

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    recommendations: {
      type: 'array',
      minItems: 1,
      maxItems: AI_MAX_RECOMMENDATIONS,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 80,
          },
          summary: {
            type: 'string',
            minLength: 1,
            maxLength: 120,
          },
          servings: {
            type: 'integer',
            minimum: 1,
            maximum: 12,
          },
          estimatedMinutes: {
            type: 'integer',
            minimum: AI_MIN_ESTIMATED_MINUTES,
            maximum: AI_MAX_ESTIMATED_MINUTES,
          },
          difficulty: {
            type: 'string',
            enum: ['쉬움', '보통', '어려움'],
          },
          prepTimeMinutes: {
            type: 'integer',
            minimum: 0,
            maximum: 120,
          },
          cookTimeMinutes: {
            type: 'integer',
            minimum: 5,
            maximum: 180,
          },
          calories: {
            type: ['integer', 'null'],
            minimum: 1,
            maximum: 5000,
          },
          ingredients: {
            type: 'array',
            minItems: 1,
            maxItems: AI_MAX_INVENTORY_ITEMS,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 80,
                },
                quantity: {
                  type: 'number',
                  exclusiveMinimum: 0,
                },
                unit: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 30,
                },
                available: {
                  type: 'boolean',
                },
                group: {
                  type: 'string',
                  enum: [
                    'main',
                    'seasoning',
                    'broth',
                    'garnish',
                    'optional',
                  ],
                },
                note: {
                  type: ['string', 'null'],
                  maxLength: 80,
                },
                optional: {
                  type: 'boolean',
                },
                substitute: {
                  type: 'array',
                  maxItems: 2,
                  items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 80,
                  },
                },
              },
              required: [
                'name',
                'quantity',
                'unit',
                'available',
                'group',
                'note',
                'optional',
                'substitute',
              ],
            },
          },
          missingIngredients: {
            type: 'array',
            maxItems: AI_MAX_INVENTORY_ITEMS,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 80,
                },
                quantity: {
                  type: 'number',
                  exclusiveMinimum: 0,
                },
                unit: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 30,
                },
              },
              required: ['name', 'quantity', 'unit'],
            },
          },
          steps: {
            type: 'array',
            minItems: 8,
            maxItems: 8,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                order: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 12,
                },
                title: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 40,
                },
                instruction: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 160,
                },
                durationMinutes: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 180,
                },
                heatLevel: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 30,
                },
                completionCue: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 100,
                },
                reason: {
                  type: ['string', 'null'],
                  maxLength: 100,
                },
                warning: {
                  type: ['string', 'null'],
                  maxLength: 100,
                },
                ingredientRefs: {
                  type: 'array',
                  minItems: 1,
                  maxItems: AI_MAX_INVENTORY_ITEMS,
                  items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 80,
                  },
                },
              },
              required: [
                'order',
                'title',
                'instruction',
                'durationMinutes',
                'heatLevel',
                'completionCue',
                'reason',
                'warning',
                'ingredientRefs',
              ],
            },
          },
          seasoningAdjustment: {
            type: 'array',
            minItems: 1,
            maxItems: 2,
            items: {
              type: 'string',
              minLength: 1,
              maxLength: 120,
            },
          },
          commonMistakes: {
            type: 'array',
            minItems: 1,
            maxItems: 2,
            items: {
              type: 'string',
              minLength: 1,
              maxLength: 120,
            },
          },
          storage: {
            type: 'string',
            minLength: 1,
            maxLength: 160,
          },
          reheating: {
            type: 'string',
            minLength: 1,
            maxLength: 160,
          },
          leftoverIdeas: {
            type: 'array',
            minItems: 1,
            maxItems: 1,
            items: {
              type: 'string',
              minLength: 1,
              maxLength: 120,
            },
          },
          servingSuggestions: {
            type: 'array',
            minItems: 1,
            maxItems: 1,
            items: {
              type: 'string',
              minLength: 1,
              maxLength: 120,
            },
          },
        },
        required: [
          'title',
          'summary',
          'servings',
          'estimatedMinutes',
          'difficulty',
          'prepTimeMinutes',
          'cookTimeMinutes',
          'calories',
          'ingredients',
          'missingIngredients',
          'steps',
          'seasoningAdjustment',
          'commonMistakes',
          'storage',
          'reheating',
          'leftoverIdeas',
          'servingSuggestions',
        ],
      },
    },
  },
  required: ['recommendations'],
} as const

const compactResponseSchema =
  createCompactAiRecommendationSchema(responseSchema)

function jsonResponse(
  body: unknown,
  status = 200,
) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

function createErrorResponse(
  code: string,
  message: string,
  status: number,
) {
  return jsonResponse({ code, message }, status)
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

function getCachedResponse(signature: string) {
  const now = Date.now()

  for (const [key, cachedResponse] of recentResponses) {
    if (
      now - cachedResponse.createdAt >=
      DUPLICATE_WINDOW_MS
    ) {
      recentResponses.delete(key)
    }
  }

  const cachedResponse = recentResponses.get(signature)

  return cachedResponse
    ? cloneResponse(cachedResponse.response)
    : null
}

function cacheResponse(
  signature: string,
  response: AiRecipeRecommendationResponse,
) {
  if (recentResponses.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = recentResponses.keys().next()
      .value as string | undefined

    if (oldestKey) {
      recentResponses.delete(oldestKey)
    }
  }

  recentResponses.set(signature, {
    createdAt: Date.now(),
    response: cloneResponse(response),
  })
}

function buildPrompt(
  input: AiRecipeRecommendationRequest,
) {
  return JSON.stringify({
    task:
      '아래 냉장고 재료를 참고해 인터넷 검색 없이 그대로 조리할 수 있는 가장 자연스럽고 실제로 만들어 먹고 싶은 한국 가정식 메뉴 1개를 한국어로 추천하세요.',
    rules: [
      '추천 우선순위는 1) 요리의 자연스러움, 2) 실제 가정식 여부, 3) 사용자가 선택할 가능성, 4) 재료 활용입니다. 냉장고 재료는 가능한 활용하되 억지로 모두 한 메뉴에 넣지 마세요. 자연스럽지 않은 재료는 곁들임·후식·다음 식사로 남기거나 사용하지 않아도 됩니다.',
      '인분 수에 맞춰 모든 재료를 그룹별 정확한 수량·단위로 쓰세요. 물·육수는 ml로 쓰고 양념도 생략하지 말며, ingredientRefs에는 재료 목록의 이름만 사용하세요.',
      '조리 단계는 정확히 8개로 쓰고 제목·행동·시간·불 세기·완성 기준을 짧게 적으세요. reason과 warning은 꼭 필요할 때만 쓰고 나머지는 null로 두세요.',
      '간 조절과 실수는 최대 2개, 보관·재가열·남은 음식 활용·곁들이기는 각각 한 문장으로 간결하게 쓰세요.',
      '냉장고 재료의 이름·단위를 정확히 비교하고 보유량을 넘는 부분만 부족 재료로 표시하며 추가 구매는 최소화하세요.',
      '선호 조건을 참고하고 제외 재료는 재료·양념·고명에 절대 사용하지 마세요.',
      '개인정보를 추론하거나 요청하지 마세요.',
    ],
    servings: input.servings,
    inventoryItems: input.inventoryItems,
    preferences: input.preferences ?? '',
    excludedIngredients:
      input.excludedIngredients ?? [],
  })
}

function readUsage(value: unknown): AiUsage | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('usage' in value) ||
    typeof value.usage !== 'object' ||
    value.usage === null
  ) {
    return null
  }

  const usage = value.usage as Record<string, unknown>
  const inputTokens = usage.input_tokens
  const outputTokens = usage.output_tokens
  const totalTokens = usage.total_tokens

  return typeof inputTokens === 'number' &&
    typeof outputTokens === 'number' &&
    typeof totalTokens === 'number'
    ? {
        inputTokens,
        outputTokens,
        totalTokens,
      }
    : null
}

function logAiInvocation(
  model: string,
  success: boolean,
  startedAt: number,
  usage: AiUsage | null,
) {
  console.info(
    '[homeos-ai]',
    JSON.stringify({
      model,
      inputTokens: usage?.inputTokens ?? null,
      outputTokens: usage?.outputTokens ?? null,
      totalTokens: usage?.totalTokens ?? null,
      success,
      durationMs: Date.now() - startedAt,
    }),
  )
}

function sanitizeErrorField(
  value: unknown,
  maxLength: number,
) {
  if (typeof value !== 'string') {
    return null
  }

  const sanitized = value
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, '[redacted]')
    .split('')
    .map((character) => {
      const codePoint = character.charCodeAt(0)

      return codePoint < 32 || codePoint === 127
        ? ' '
        : character
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

  return sanitized
    ? sanitized.slice(0, maxLength)
    : null
}

export function parseOpenAiErrorDetails(
  upstreamStatus: number,
  responseText: string,
  requestId: string | null,
): OpenAiErrorDetails {
  let error: Record<string, unknown> | null = null

  try {
    const parsed = JSON.parse(responseText) as unknown

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'error' in parsed &&
      typeof parsed.error === 'object' &&
      parsed.error !== null
    ) {
      error = parsed.error as Record<string, unknown>
    }
  } catch {
    // Non-JSON responses are represented by status and request ID only.
  }

  return {
    upstreamStatus,
    errorType: sanitizeErrorField(
      error?.type,
      MAX_ERROR_FIELD_LENGTH,
    ),
    errorCode: sanitizeErrorField(
      error?.code,
      MAX_ERROR_FIELD_LENGTH,
    ),
    errorParam: sanitizeErrorField(
      error?.param,
      MAX_ERROR_FIELD_LENGTH,
    ),
    errorMessage: sanitizeErrorField(
      error?.message,
      MAX_ERROR_MESSAGE_LENGTH,
    ),
    requestId: sanitizeErrorField(
      requestId,
      MAX_ERROR_FIELD_LENGTH,
    ),
  }
}

export function mapOpenAiError(
  upstreamStatus: number,
): MappedOpenAiError {
  if (upstreamStatus === 400) {
    return {
      code: 'AI_REQUEST_REJECTED',
      message:
        'AI 요청 형식 또는 결과 형식 설정을 확인해 주세요.',
      status: 400,
    }
  }

  if (upstreamStatus === 401) {
    return {
      code: 'AI_AUTHENTICATION_FAILED',
      message:
        'AI 서비스 인증 설정을 확인해 주세요.',
      status: 401,
    }
  }

  if (upstreamStatus === 403) {
    return {
      code: 'AI_PERMISSION_DENIED',
      message:
        'AI 서비스의 프로젝트 또는 모델 권한을 확인해 주세요.',
      status: 403,
    }
  }

  if (upstreamStatus === 429) {
    return {
      code: 'AI_LIMIT_REACHED',
      message:
        'AI 사용 한도 또는 요청 제한에 도달했어요. 잠시 후 다시 시도해 주세요.',
      status: 429,
    }
  }

  if (upstreamStatus >= 500) {
    return {
      code: 'AI_SERVICE_UNAVAILABLE',
      message:
        'AI 서비스가 일시적으로 불안정해요. 잠시 후 다시 시도해 주세요.',
      status: 503,
    }
  }

  return {
    code: 'AI_UPSTREAM_ERROR',
    message:
      'AI 추천을 불러오지 못했어요. 기존 추천을 이용해 주세요.',
    status: 502,
  }
}

function logOpenAiError(details: OpenAiErrorDetails) {
  console.error(
    '[homeos-ai-upstream]',
    JSON.stringify(details),
  )
}

function extractResponseText(value: unknown) {
  if (
    typeof value === 'object' &&
    value !== null &&
    'output_text' in value &&
    typeof value.output_text === 'string'
  ) {
    return value.output_text
  }

  if (
    typeof value !== 'object' ||
    value === null ||
    !('output' in value) ||
    !Array.isArray(value.output)
  ) {
    return null
  }

  for (const outputItem of value.output) {
    if (
      typeof outputItem !== 'object' ||
      outputItem === null ||
      !('content' in outputItem) ||
      !Array.isArray(outputItem.content)
    ) {
      continue
    }

    for (const contentItem of outputItem.content) {
      if (
        typeof contentItem === 'object' &&
        contentItem !== null &&
        'type' in contentItem &&
        contentItem.type === 'output_text' &&
        'text' in contentItem &&
        typeof contentItem.text === 'string'
      ) {
        return contentItem.text
      }
    }
  }

  return null
}

function hasIngredient(
  inventoryItems: AiInventoryIngredient[],
  name: string,
  quantity: number,
  unit: string,
) {
  return (
    getAiInventoryQuantity(
      inventoryItems,
      name,
      unit,
    ) >= quantity
  )
}

function createMockPremiumDetails(
  ingredientNames: string[],
  estimatedMinutes: number,
): Pick<
  AiRecipeRecommendation,
  | 'difficulty'
  | 'prepTimeMinutes'
  | 'cookTimeMinutes'
  | 'calories'
  | 'steps'
  | 'seasoningAdjustment'
  | 'commonMistakes'
  | 'storage'
  | 'reheating'
  | 'leftoverIdeas'
  | 'servingSuggestions'
> {
  const prepTimeMinutes = Math.min(
    10,
    Math.max(5, estimatedMinutes - 10),
  )

  return {
    difficulty: '쉬움',
    prepTimeMinutes,
    cookTimeMinutes:
      estimatedMinutes - prepTimeMinutes,
    calories: null,
    steps: Array.from({ length: 8 }, (_, index) => ({
      order: index + 1,
      title: `${index + 1}단계`,
      instruction:
        index === 7
          ? '모든 재료의 익힘을 확인하고 그릇에 담아요.'
          : `${ingredientNames[index % ingredientNames.length]}을(를) 순서에 맞춰 안전하게 조리해요.`,
      durationMinutes: Math.max(
        1,
        Math.round(estimatedMinutes / 8),
      ),
      heatLevel:
        index < 2 ? '불 사용 안 함' : '중불',
      completionCue:
        index === 7
          ? '재료 중심까지 충분히 익고 간이 고르게 어우러져요.'
          : '재료의 색과 질감이 단계 설명에 맞게 변해요.',
      reason: null,
      warning:
        index === 6
          ? '달걀과 고기는 중심까지 충분히 익혀요.'
          : null,
      ingredientRefs: [
        ingredientNames[
          index % ingredientNames.length
        ],
      ],
    })),
    seasoningAdjustment: [
      '완성 직전 맛을 보고 간장은 조금씩 추가해요.',
    ],
    commonMistakes: [
      '팬이 충분히 달궈지기 전에 재료를 한꺼번에 넣지 않아요.',
    ],
    storage:
      '완전히 식혀 밀폐 용기에 담아 냉장 1일 보관해요.',
    reheating:
      '먹을 만큼 덜어 중심까지 충분히 뜨거워지도록 데워요.',
    leftoverIdeas: [
      '남은 음식은 밥과 함께 볶아 한 그릇으로 활용해요.',
    ],
    servingSuggestions: [
      '제철 채소 반찬과 함께 따뜻하게 내요.',
    ],
  }
}

function createMockRecommendation(
  input: AiRecipeRecommendationRequest,
  recipe: Omit<
    AiRecipeRecommendation,
    'ingredients' | 'missingIngredients'
  > & {
    ingredients: Array<{
      name: string
      quantity: number
      unit: string
    }>
  },
): AiRecipeRecommendation {
  const ingredients = recipe.ingredients.map(
    (ingredient) => ({
      ...ingredient,
      group: 'main' as const,
      note: null,
      optional: false,
      substitute: [],
      available: hasIngredient(
        input.inventoryItems,
        ingredient.name,
        ingredient.quantity,
        ingredient.unit,
      ),
    }),
  )

  return {
    ...recipe,
    ingredients,
    missingIngredients: ingredients
      .filter((ingredient) => !ingredient.available)
      .map(({ name, quantity, unit }) => ({
        name,
        quantity,
        unit,
      })),
  }
}

async function createMockResponse(
  input: AiRecipeRecommendationRequest,
) {
  await new Promise((resolve) =>
    setTimeout(resolve, 900),
  )

  const recommendations = [
    createMockRecommendation(input, {
      title: '계란 채소 볶음밥',
      summary:
        '냉장고 속 재료를 가볍게 볶아 만드는 든든한 한 끼예요.',
      servings: input.servings,
      estimatedMinutes: 20,
      ...createMockPremiumDetails(
        ['계란', '밥', '대파', '간장'],
        20,
      ),
      ingredients: [
        { name: '계란', quantity: 2, unit: '개' },
        { name: '밥', quantity: 2, unit: '공기' },
        { name: '대파', quantity: 1, unit: '대' },
        { name: '간장', quantity: 1, unit: '큰술' },
      ],
    }),
    createMockRecommendation(input, {
      title: '두부 달걀 덮밥',
      summary:
        '부드러운 두부와 달걀을 따뜻하게 즐기는 가족 메뉴예요.',
      servings: input.servings,
      estimatedMinutes: 25,
      ...createMockPremiumDetails(
        ['두부', '계란', '밥', '간장'],
        25,
      ),
      ingredients: [
        { name: '두부', quantity: 1, unit: '모' },
        { name: '계란', quantity: 2, unit: '개' },
        { name: '밥', quantity: 2, unit: '공기' },
        { name: '간장', quantity: 1, unit: '큰술' },
      ],
    }),
    createMockRecommendation(input, {
      title: '냉장고 채소 비빔밥',
      summary:
        '남은 채소를 한 그릇에 모아 간단히 완성하는 메뉴예요.',
      servings: input.servings,
      estimatedMinutes: 15,
      ...createMockPremiumDetails(
        ['밥', '당근', '계란', '고추장'],
        15,
      ),
      ingredients: [
        { name: '밥', quantity: 2, unit: '공기' },
        { name: '당근', quantity: 1, unit: '개' },
        { name: '계란', quantity: 2, unit: '개' },
        { name: '고추장', quantity: 1, unit: '큰술' },
      ],
    }),
  ]

  return {
    recommendations,
    meta: {
      maxRecommendations: AI_MAX_RECOMMENDATIONS,
    },
  }
}

async function fetchOpenAiWithRetry(
  init: RequestInit,
) {
  let lastError: unknown

  for (
    let attempt = 0;
    attempt <= MAX_UPSTREAM_RETRIES;
    attempt += 1
  ) {
    try {
      const response = await fetch(
        OPENAI_RESPONSES_URL,
        init,
      )

      if (
        response.status < 500 ||
        attempt === MAX_UPSTREAM_RETRIES
      ) {
        return response
      }
    } catch (error) {
      lastError = error

      if (attempt === MAX_UPSTREAM_RETRIES) {
        throw error
      }
    }
  }

  throw lastError ?? new Error('OpenAI request failed.')
}

async function requestOpenAi(
  input: AiRecipeRecommendationRequest,
  environment: AiServerEnvironment,
  trace?: AiLatencyTrace,
) {
  const apiKey = environment.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    return createErrorResponse(
      'AI_NOT_CONFIGURED',
      'AI 추천을 사용하려면 서버 환경변수 설정이 필요합니다.',
      503,
    )
  }

  const model =
    environment.OPENAI_MODEL?.trim() || DEFAULT_MODEL
  const startedAt = Date.now()
  let usage: AiUsage | null = null
  let invocationLogged = false
  const finishInvocation = (success: boolean) => {
    if (!invocationLogged) {
      logAiInvocation(
        model,
        success,
        startedAt,
        usage,
      )
      invocationLogged = true
    }
  }
  const abortController = new AbortController()
  const timeoutId = setTimeout(
    () => abortController.abort(),
    SERVER_TIMEOUT_MS,
  )

  try {
    const prompt = buildPrompt(input)
    logAiLatencyStage(trace, 'prompt_created', {
      httpStatus: 200,
    })
    logAiLatencyStage(trace, 'openai_request_started')
    const openAiResponse =
      await fetchOpenAiWithRetry({
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          store: false,
          input: [
            {
              role: 'system',
              content:
                '오늘식탁의 가족 레시피 편집자입니다. 제공된 음식 재료만 분석하고 strict JSON schema를 정확히 따르세요.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          ...(model.startsWith('gpt-5.6')
            ? {
                reasoning: {
                  effort: 'none',
                },
              }
            : {}),
          text: {
            verbosity: 'low',
            format: {
              type: 'json_schema',
              name: 'today_table_recipe_recommendations_compact_v1',
              strict: true,
              schema: compactResponseSchema,
            },
          },
          max_output_tokens: MAX_OUTPUT_TOKENS,
        }),
        signal: abortController.signal,
      })
    const upstreamRequestId =
      openAiResponse.headers.get('x-request-id')

    logAiLatencyStage(
      trace,
      'openai_headers_received',
      {
        httpStatus: openAiResponse.status,
        upstreamRequestId,
      },
    )

    const responseText = await openAiResponse.text()
    logAiLatencyStage(trace, 'openai_body_received', {
      httpStatus: openAiResponse.status,
      upstreamRequestId,
    })

    if (!openAiResponse.ok) {
      const details = parseOpenAiErrorDetails(
        openAiResponse.status,
        responseText,
        openAiResponse.headers.get('x-request-id'),
      )
      const mappedError = mapOpenAiError(
        details.upstreamStatus,
      )

      logOpenAiError(details)
      finishInvocation(false)
      return createErrorResponse(
        mappedError.code,
        mappedError.message,
        mappedError.status,
      )
    }

    if (responseText.length > MAX_RESPONSE_BYTES) {
      finishInvocation(false)
      return createErrorResponse(
        'AI_RESPONSE_INVALID',
        'AI 추천 결과를 안전하게 읽지 못했어요.',
        502,
      )
    }

    let rawResponse: unknown

    try {
      rawResponse = JSON.parse(responseText)
      usage = readUsage(rawResponse)
    } catch {
      finishInvocation(false)
      return createErrorResponse(
        'AI_RESPONSE_INVALID',
        'AI 추천 결과를 안전하게 읽지 못했어요.',
        502,
      )
    }

    const structuredText =
      extractResponseText(rawResponse)

    if (!structuredText) {
      finishInvocation(false)
      return createErrorResponse(
        'AI_RESPONSE_INVALID',
        'AI 추천 결과를 안전하게 읽지 못했어요.',
        502,
      )
    }

    const structuredOutput =
      parseCompactAiRecommendationText(structuredText)

    if (!structuredOutput) {
      finishInvocation(false)
      return createErrorResponse(
        'AI_RESPONSE_INVALID',
        'AI 추천 결과를 안전하게 읽지 못했어요.',
        502,
      )
    }

    const recommendations =
      parseAiRecipeRecommendationOutput(
        structuredOutput,
      )

    if (!recommendations) {
      finishInvocation(false)
      return createErrorResponse(
        'AI_RESPONSE_INVALID',
        'AI 추천 결과를 안전하게 읽지 못했어요.',
        502,
      )
    }

    const normalizedRecommendations =
      normalizeAiRecipeRecommendations(
        recommendations,
        input,
      )

    if (normalizedRecommendations.length === 0) {
      finishInvocation(false)
      return createErrorResponse(
        'AI_RESPONSE_INVALID',
        'AI 추천 결과가 제외 조건을 충족하지 못했어요.',
        502,
      )
    }

    logAiLatencyStage(trace, 'json_parsed', {
      httpStatus: openAiResponse.status,
      upstreamRequestId,
    })
    finishInvocation(true)

    return jsonResponse({
      recommendations: normalizedRecommendations,
      meta: {
        maxRecommendations: AI_MAX_RECOMMENDATIONS,
        ...(usage ? { usage } : {}),
      },
    })
  } catch (error) {
    finishInvocation(false)
    return error instanceof DOMException &&
      error.name === 'AbortError'
      ? createErrorResponse(
          'AI_TIMEOUT',
          'AI 추천 시간이 길어지고 있어요. 잠시 후 다시 시도해 주세요.',
          504,
        )
      : createErrorResponse(
          'AI_UPSTREAM_ERROR',
          'AI 추천에 연결하지 못했어요. 기존 추천은 계속 사용할 수 있어요.',
          502,
        )
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function handleAiRecipeRecommendation(
  request: Request,
  environment: AiServerEnvironment,
  trace?: AiLatencyTrace,
) {
  if (request.method !== 'POST') {
    return createErrorResponse(
      'METHOD_NOT_ALLOWED',
      'POST 요청만 사용할 수 있습니다.',
      405,
    )
  }

  const contentLength = Number(
    request.headers.get('content-length') ?? 0,
  )

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_REQUEST_BYTES
  ) {
    return createErrorResponse(
      'REQUEST_TOO_LARGE',
      '요청이 너무 큽니다.',
      413,
    )
  }

  const requestText = await request.text()

  if (requestText.length > MAX_REQUEST_BYTES) {
    return createErrorResponse(
      'REQUEST_TOO_LARGE',
      '요청이 너무 큽니다.',
      413,
    )
  }

  let requestBody: unknown

  try {
    requestBody = JSON.parse(requestText)
  } catch {
    return createErrorResponse(
      'INVALID_REQUEST',
      '요청 JSON이 올바르지 않습니다.',
      400,
    )
  }

  const validation =
    validateAiRecipeRecommendationRequest(requestBody)

  if (!validation.ok) {
    logAiLatencyStage(
      trace,
      'inventory_validation_completed',
      {
        httpStatus: 400,
        errorCode: validation.code,
      },
    )
    return createErrorResponse(
      validation.code,
      validation.message,
      400,
    )
  }

  logAiLatencyStage(
    trace,
    'inventory_validation_completed',
    { httpStatus: 200 },
  )

  const signature = JSON.stringify({
    version: RECOMMENDATION_POLICY_VERSION,
    input: validation.data,
  })
  const cachedResponse = getCachedResponse(signature)

  if (cachedResponse) {
    return jsonResponse(cachedResponse)
  }

  if (
    environment.NODE_ENV !== 'production' &&
    environment.HOMEOS_AI_MOCK === 'true'
  ) {
    const mockResponse = await createMockResponse(
      validation.data,
    )
    cacheResponse(signature, mockResponse)
    return jsonResponse(mockResponse)
  }

  const response = await requestOpenAi(
    validation.data,
    environment,
    trace,
  )

  if (response.ok) {
    const responseBody =
      (await response.clone().json()) as
        AiRecipeRecommendationResponse
    cacheResponse(signature, responseBody)
  }

  return response
}

export default {
  fetch(request: Request) {
    if (request.method !== 'POST') {
      return handleAiRecipeRecommendation(
        request,
        process.env,
      )
    }

    return runAiBusinessGuard({
      operation: 'recommendation',
      cacheTtlMs: 60 * 60 * 1_000,
      cacheVersion: RECOMMENDATION_POLICY_VERSION,
      environment: process.env,
      request,
      execute: (guardedRequest, trace) =>
        handleAiRecipeRecommendation(
          guardedRequest,
          process.env,
          trace,
        ),
    })
  },
}
