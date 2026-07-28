import {
  AI_MAX_ESTIMATED_MINUTES,
  AI_MAX_INVENTORY_ITEMS,
  AI_MAX_RECOMMENDATIONS,
  AI_MIN_ESTIMATED_MINUTES,
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

const OPENAI_RESPONSES_URL =
  'https://api.openai.com/v1/responses'
const DEFAULT_MODEL = 'gpt-5.6-luna'
const SERVER_TIMEOUT_MS = 12_000
const MAX_OUTPUT_TOKENS = 1_800
const MAX_REQUEST_BYTES = 20_000
const MAX_RESPONSE_BYTES = 100_000
const DUPLICATE_WINDOW_MS = 30_000
const MAX_CACHE_ENTRIES = 25

type AiUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
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
            maxLength: 240,
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
              },
              required: [
                'name',
                'quantity',
                'unit',
                'available',
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
            minItems: 1,
            maxItems: 12,
            items: {
              type: 'string',
              minLength: 1,
              maxLength: 300,
            },
          },
        },
        required: [
          'title',
          'summary',
          'servings',
          'estimatedMinutes',
          'ingredients',
          'missingIngredients',
          'steps',
        ],
      },
    },
  },
  required: ['recommendations'],
} as const

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
          (ingredient) => ({ ...ingredient }),
        ),
        missingIngredients:
          recommendation.missingIngredients.map(
            (ingredient) => ({ ...ingredient }),
          ),
        steps: [...recommendation.steps],
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
      '아래 냉장고 재료를 최대한 활용해 가족이 함께 먹기 좋은 한국 가정식 메뉴를 한국어로 1~3개 추천하세요.',
    rules: [
      '재료 이름과 단위는 정확히 비교하고 단위를 변환하지 마세요.',
      '인분 수를 반영하고 부족 재료는 꼭 필요한 것만 일반 가정에서 구하기 쉬운 재료로 제한하세요.',
      '선호 조건을 참고하고 제외 재료는 재료·양념·고명에 절대 사용하지 마세요.',
      '전문 조리도구 없이 따라 하기 쉬운 짧은 단계로 작성하세요.',
      '생고기와 달걀 등은 속까지 충분히 익히도록 안전하게 안내하세요.',
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
  const normalizedName = name.trim().toLowerCase()

  return inventoryItems.some(
    (inventoryItem) =>
      inventoryItem.name.trim().toLowerCase() ===
        normalizedName &&
      inventoryItem.unit === unit &&
      inventoryItem.quantity >= quantity,
  )
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
      ingredients: [
        { name: '계란', quantity: 2, unit: '개' },
        { name: '밥', quantity: 2, unit: '공기' },
        { name: '대파', quantity: 1, unit: '대' },
        { name: '간장', quantity: 1, unit: '큰술' },
      ],
      steps: [
        '대파를 잘게 썰고 계란을 풀어 준비해요.',
        '팬에 대파와 밥을 볶은 뒤 간장으로 간해요.',
        '계란을 넣고 고루 익혀 마무리해요.',
      ],
    }),
    createMockRecommendation(input, {
      title: '두부 달걀 덮밥',
      summary:
        '부드러운 두부와 달걀을 따뜻하게 즐기는 가족 메뉴예요.',
      servings: input.servings,
      estimatedMinutes: 25,
      ingredients: [
        { name: '두부', quantity: 1, unit: '모' },
        { name: '계란', quantity: 2, unit: '개' },
        { name: '밥', quantity: 2, unit: '공기' },
        { name: '간장', quantity: 1, unit: '큰술' },
      ],
      steps: [
        '두부의 물기를 빼고 먹기 좋은 크기로 잘라요.',
        '두부를 노릇하게 익힌 뒤 풀어둔 계란을 넣어요.',
        '간장으로 간하고 밥 위에 올려요.',
      ],
    }),
    createMockRecommendation(input, {
      title: '냉장고 채소 비빔밥',
      summary:
        '남은 채소를 한 그릇에 모아 간단히 완성하는 메뉴예요.',
      servings: input.servings,
      estimatedMinutes: 15,
      ingredients: [
        { name: '밥', quantity: 2, unit: '공기' },
        { name: '당근', quantity: 1, unit: '개' },
        { name: '계란', quantity: 2, unit: '개' },
        { name: '고추장', quantity: 1, unit: '큰술' },
      ],
      steps: [
        '채소를 가늘게 썰어 가볍게 볶아요.',
        '그릇에 밥과 채소를 담고 계란을 올려요.',
        '고추장을 곁들여 골고루 비벼요.',
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

async function requestOpenAi(
  input: AiRecipeRecommendationRequest,
  environment: AiServerEnvironment,
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
    const openAiResponse = await fetch(
      OPENAI_RESPONSES_URL,
      {
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
                'HomeOS의 가족 식사 추천 도우미입니다. 제공된 음식 재료만 분석하고 strict JSON schema를 따르세요.',
            },
            {
              role: 'user',
              content: buildPrompt(input),
            },
          ],
          ...(model.startsWith('gpt-5.6')
            ? {
                reasoning: {
                  effort: 'low',
                },
              }
            : {}),
          text: {
            verbosity: 'low',
            format: {
              type: 'json_schema',
              name: 'homeos_recipe_recommendations',
              strict: true,
              schema: responseSchema,
            },
          },
          max_output_tokens: MAX_OUTPUT_TOKENS,
        }),
        signal: abortController.signal,
      },
    )

    const responseText = await openAiResponse.text()

    if (
      responseText.length > MAX_RESPONSE_BYTES ||
      !openAiResponse.ok
    ) {
      finishInvocation(false)
      return createErrorResponse(
        'AI_UPSTREAM_ERROR',
        'AI 추천을 불러오지 못했어요. 기존 추천을 이용해 주세요.',
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

    let structuredOutput: unknown

    try {
      structuredOutput = JSON.parse(structuredText)
    } catch {
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

    finishInvocation(true)

    return jsonResponse({
      recommendations: normalizedRecommendations,
      meta: {
        maxRecommendations: AI_MAX_RECOMMENDATIONS,
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
    return createErrorResponse(
      validation.code,
      validation.message,
      400,
    )
  }

  const signature = JSON.stringify(validation.data)
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
    return handleAiRecipeRecommendation(
      request,
      process.env,
    )
  },
}
