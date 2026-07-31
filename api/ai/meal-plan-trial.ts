import {
  parseAiMealPlanDraftOutput,
  parseAiMealPlanDraftOutputResult,
  validateAiMealPlanTrialRequest,
} from '../../src/services/aiMealPlanTrialEngine.js'
import type {
  AiMealPlanDraftResponse,
  AiMealPlanTrialRequest,
} from '../../src/types/aiMealPlanTrial.js'

type AiServerEnvironment = {
  OPENAI_API_KEY?: string
  OPENAI_MODEL?: string
  HOMEOS_AI_MOCK?: string
  NODE_ENV?: string
}

type AiUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

const OPENAI_RESPONSES_URL =
  'https://api.openai.com/v1/responses'
const DEFAULT_MODEL = 'gpt-5.6-luna'
const SERVER_TIMEOUT_MS = 30_000
const MAX_REQUEST_BYTES = 24_000
const MAX_RESPONSE_BYTES = 120_000
const MAX_OUTPUT_TOKENS = 4_000
const MAX_UPSTREAM_RETRIES = 0
const RECENT_RESPONSE_WINDOW_MS = 30_000
const responseCache = new Map<
  string,
  {
    createdAt: number
    response: AiMealPlanDraftResponse
  }
>()

export const config = {
  maxDuration: 35,
}

export const ingredientSchema = {
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
      maximum: 10000,
    },
    unit: {
      type: 'string',
      minLength: 1,
      maxLength: 30,
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
      maxLength: 120,
    },
    optional: {
      type: 'boolean',
    },
    substitute: {
      type: 'array',
      maxItems: 4,
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
    'group',
    'note',
    'optional',
    'substitute',
  ],
} as const

export const recipeSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 80,
    },
    description: {
      type: 'string',
      minLength: 1,
      maxLength: 240,
    },
    difficulty: {
      type: 'string',
      enum: ['쉬움', '보통', '어려움'],
    },
    calories: {
      type: ['integer', 'null'],
      minimum: 1,
      maximum: 5000,
    },
    servings: {
      type: 'integer',
      minimum: 1,
      maximum: 10,
    },
    prepMinutes: {
      type: 'integer',
      minimum: 0,
      maximum: 120,
    },
    cookMinutes: {
      type: 'integer',
      minimum: 5,
      maximum: 180,
    },
    ingredients: {
      type: 'array',
      minItems: 2,
      maxItems: 20,
      items: ingredientSchema,
    },
    optionalIngredients: {
      type: 'array',
      maxItems: 8,
      items: ingredientSchema,
    },
    substitutions: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ingredientName: {
            type: 'string',
            minLength: 1,
            maxLength: 80,
          },
          alternatives: {
            type: 'array',
            minItems: 1,
            maxItems: 4,
            items: {
              type: 'string',
              minLength: 1,
              maxLength: 80,
            },
          },
        },
        required: [
          'ingredientName',
          'alternatives',
        ],
      },
    },
    steps: {
      type: 'array',
      minItems: 8,
      maxItems: 12,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          order: {
            type: 'integer',
            minimum: 1,
            maximum: 10,
          },
          instruction: {
            type: 'string',
            minLength: 1,
            maxLength: 300,
          },
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 80,
          },
          durationMinutes: {
            type: 'integer',
            minimum: 1,
            maximum: 120,
          },
          heatLevel: {
            type: 'string',
            minLength: 1,
            maxLength: 40,
          },
          completionCue: {
            type: 'string',
            minLength: 1,
            maxLength: 180,
          },
          reason: {
            type: ['string', 'null'],
            maxLength: 180,
          },
          warning: {
            type: ['string', 'null'],
            maxLength: 180,
          },
          ingredientRefs: {
            type: 'array',
            minItems: 1,
            maxItems: 25,
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
      maxItems: 4,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 180,
      },
    },
    commonMistakes: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 180,
      },
    },
    storage: {
      type: 'string',
      minLength: 1,
      maxLength: 240,
    },
    reheating: {
      type: 'string',
      minLength: 1,
      maxLength: 240,
    },
    leftoverIdeas: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 180,
      },
    },
    servingSuggestions: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 180,
      },
    },
  },
  required: [
    'name',
    'description',
    'difficulty',
    'calories',
    'servings',
    'prepMinutes',
    'cookMinutes',
    'ingredients',
    'optionalIngredients',
    'substitutions',
    'steps',
    'seasoningAdjustment',
    'commonMistakes',
    'storage',
    'reheating',
    'leftoverIdeas',
    'servingSuggestions',
  ],
} as const

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    days: {
      type: 'array',
      minItems: 7,
      maxItems: 7,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          day: {
            type: 'integer',
            minimum: 1,
            maximum: 7,
          },
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 12,
          },
          summary: {
            type: 'string',
            minLength: 1,
            maxLength: 240,
          },
          recommendationReason: {
            type: 'string',
            minLength: 1,
            maxLength: 240,
          },
          servings: {
            type: 'integer',
            minimum: 1,
            maximum: 10,
          },
          prepMinutes: {
            type: 'integer',
            minimum: 0,
            maximum: 120,
          },
          cookMinutes: {
            type: 'integer',
            minimum: 5,
            maximum: 180,
          },
          mainIngredientNames: {
            type: 'array',
            minItems: 1,
            maxItems: 8,
            items: {
              type: 'string',
              minLength: 1,
              maxLength: 80,
            },
          },
          missingIngredientNames: {
            type: 'array',
            maxItems: 12,
            items: {
              type: 'string',
              minLength: 1,
              maxLength: 80,
            },
          },
          constraintCompliance: {
            type: 'string',
            minLength: 1,
            maxLength: 240,
          },
        },
        required: [
          'day',
          'name',
          'summary',
          'recommendationReason',
          'servings',
          'prepMinutes',
          'cookMinutes',
          'mainIngredientNames',
          'missingIngredientNames',
          'constraintCompliance',
        ],
      },
    },
  },
  required: ['days'],
} as const

function jsonResponse(
  body: unknown,
  status = 200,
) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type':
        'application/json; charset=utf-8',
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

function buildPrompt(
  request: AiMealPlanTrialRequest,
) {
  return JSON.stringify({
    task:
      '한국 가정에서 가족이 함께 먹기 좋은 저녁 식단 7일 초안을 한국어로 만드세요.',
    rules: [
      '7일의 메뉴와 주재료가 연속으로 반복되지 않게 하세요.',
      '같은 7일 안에서는 동일 메뉴를 절대 반복하지 마세요.',
      '최근 14일 메뉴와 같은 메뉴는 만들지 마세요.',
      '국·찌개, 볶음, 구이, 조림, 밥·면 등 최소 4가지 조리 유형을 섞고 같은 조리 유형은 최대 2개만 사용하세요.',
      '평일 메뉴는 사용자가 정한 최대 조리시간을 넘기지 말고 주말은 조금 길어도 됩니다.',
      '냉장고 재료를 최대한 활용하고 부족 재료를 불필요하게 늘리지 마세요.',
      '제외 음식과 알레르기는 메뉴, 주요 재료, 부족 재료에 절대 사용하지 마세요.',
      '아이 포함 시 연령대와 맵기 선호를 반영하세요.',
      '일반 가정에서 구하기 쉬운 재료와 도구를 사용하세요.',
      'name에는 한국 가정에서 실제로 쓰는 표준 음식명만 2~12자로 적으세요.',
      'name에 밥·반찬·채소를 “와/과”로 덧붙이거나 재료 목록, 조리 설명, “없는” 같은 조건 문장을 넣지 마세요.',
      '메뉴 설명과 추천 이유는 name이 아니라 summary와 recommendationReason에 분리하세요.',
      '특정 예시 메뉴를 반복하지 말고 조건에 맞는 익숙한 한국 가정식 이름을 고르세요.',
      '이 단계에서는 상세 재료 수량, 조리 단계, 불 세기, 보관과 재가열 정보를 생성하지 마세요.',
      'mainIngredientNames에는 메뉴를 대표하는 재료명만, missingIngredientNames에는 현재 재고에 없는 재료명만 적으세요.',
      'constraintCompliance에는 제외 음식, 알레르기, 아이와 맵기 조건을 어떻게 지켰는지 한 문장으로 적으세요.',
      '각 설명과 추천 이유는 짧고 서로 다르게 쓰세요.',
    ],
    householdSize: request.householdSize,
    includesChildren: request.includesChildren,
    childAgeGroup: request.childAgeGroup ?? '',
    spicePreference: request.spicePreference,
    preferredFoods: request.preferredFoods ?? '',
    excludedFoods: request.excludedFoods ?? '',
    allergies: request.allergies ?? '',
    weekdayMaxMinutes: request.weekdayMaxMinutes,
    inventoryItems: request.inventoryItems,
    recentMenuNames: request.recentMenuNames ?? [],
  })
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

  const usage = value.usage as Record<
    string,
    unknown
  >
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

function logInvocation(
  traceId: string | undefined,
  model: string,
  success: boolean,
  startedAt: number,
  usage: AiUsage | null,
  failure?: {
    code: string
    reason?: string
    dayIndex?: number
  },
) {
  console.info(
    '[today-table-ai-meal-plan-trial]',
    JSON.stringify({
      traceId: traceId ?? 'untracked',
      stage: 'DRAFT_GENERATION',
      model,
      inputTokens: usage?.inputTokens ?? null,
      outputTokens: usage?.outputTokens ?? null,
      totalTokens: usage?.totalTokens ?? null,
      success,
      durationMs: Date.now() - startedAt,
      ...(failure
        ? {
            failureCode: failure.code,
            ...(failure.reason
              ? { failureReason: failure.reason }
              : {}),
            ...(failure.dayIndex
              ? { dayIndex: failure.dayIndex }
              : {}),
          }
        : {}),
    }),
  )
}

function sanitizeError(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  return value
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(
      /\bsk-[A-Za-z0-9_-]{8,}\b/g,
      '[redacted]',
    )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240)
}

function mapUpstreamError(status: number) {
  if (status === 400) {
    return {
      status: 400,
      code: 'API_REQUEST_FAILED',
      message:
        '맞춤 식단 요청 형식을 확인해 주세요.',
    }
  }

  if (status === 401 || status === 403) {
    return {
      status,
      code: 'API_REQUEST_FAILED',
      message:
        '현재 AI 맞춤 식단 설정을 확인하고 있어요.',
    }
  }

  if (status === 429) {
    return {
      status: 429,
      code: 'OPENAI_RATE_LIMIT',
      message:
        'AI 사용 한도에 도달했어요. 잠시 후 다시 시도해 주세요.',
    }
  }

  return {
    status: status >= 500 ? 503 : 502,
    code: 'API_REQUEST_FAILED',
    message:
      'AI 서비스가 잠시 불안정해요. 무료 체험은 사용 처리되지 않았어요.',
  }
}

function cloneResponse(
  response: AiMealPlanDraftResponse,
) {
  return structuredClone(response)
}

function createMockResponse(
  request: AiMealPlanTrialRequest,
) {
  const menuNames = [
    '김치찌개',
    '고등어구이',
    '소고기미역국',
    '닭갈비',
    '계란볶음밥',
    '카레',
    '두부조림',
  ]
  const parsedResponse =
    parseAiMealPlanDraftOutput(
      {
        days: menuNames.map((name, index) => ({
          day: index + 1,
          name,
          summary:
            `${name}을(를) 가족이 함께 먹기 좋게 준비해요.`,
          recommendationReason:
            '냉장고 재료와 가족 조건을 반영했어요.',
          servings: request.householdSize,
          prepMinutes: 10,
          cookMinutes:
            index < 5
              ? Math.max(
                  15,
                  request.weekdayMaxMinutes - 10,
                )
              : 35,
          mainIngredientNames: [
            index % 2 === 0 ? '계란' : '두부',
            `채소 ${index + 1}`,
          ],
          missingIngredientNames: [
            `채소 ${index + 1}`,
          ],
          constraintCompliance:
            '제외 음식과 알레르기를 사용하지 않았어요.',
        })),
      },
      request,
    )

  if (!parsedResponse) {
    throw new Error('Mock meal plan is invalid.')
  }

  parsedResponse.meta.model = 'mock'
  return parsedResponse
}

function getCachedResponse(signature: string) {
  const cached = responseCache.get(signature)

  if (
    !cached ||
    Date.now() - cached.createdAt >
      RECENT_RESPONSE_WINDOW_MS
  ) {
    responseCache.delete(signature)
    return null
  }

  return cloneResponse(cached.response)
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
  request: AiMealPlanTrialRequest,
  environment: AiServerEnvironment,
) {
  const apiKey = environment.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    return createErrorResponse(
      'AI_NOT_CONFIGURED',
      'AI 맞춤 식단 설정이 아직 완료되지 않았어요.',
      503,
    )
  }

  const model =
    environment.OPENAI_MODEL?.trim() || DEFAULT_MODEL
  const startedAt = Date.now()
  const abortController = new AbortController()
  const timeoutId = setTimeout(
    () => abortController.abort(),
    SERVER_TIMEOUT_MS,
  )
  let usage: AiUsage | null = null
  let invocationLogged = false
  const finishInvocation = (
    success: boolean,
    failure?: {
      code: string
      reason?: string
      dayIndex?: number
    },
  ) => {
    if (!invocationLogged) {
      logInvocation(
        request.traceId,
        model,
        success,
        startedAt,
        usage,
        failure,
      )
      invocationLogged = true
    }
  }

  try {
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
                '오늘식탁의 한국 가정식 플래너입니다. 입력된 조건만 사용하고 strict JSON schema를 따르세요.',
            },
            {
              role: 'user',
              content: buildPrompt(request),
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
              name: 'today_table_weekly_meal_plan_draft',
              strict: true,
              schema: responseSchema,
            },
          },
          max_output_tokens: MAX_OUTPUT_TOKENS,
        }),
        signal: abortController.signal,
      })
    const responseText =
      await openAiResponse.text()

    if (!openAiResponse.ok) {
      let upstreamError: Record<
        string,
        unknown
      > = {}

      try {
        const parsed = JSON.parse(
          responseText,
        ) as {
          error?: Record<string, unknown>
        }
        upstreamError = parsed.error ?? {}
      } catch {
        upstreamError = {}
      }

      console.error(
        '[today-table-ai-meal-plan-trial-upstream]',
        JSON.stringify({
          status: openAiResponse.status,
          type: sanitizeError(upstreamError.type),
          code: sanitizeError(upstreamError.code),
          param: sanitizeError(upstreamError.param),
          message: sanitizeError(
            upstreamError.message,
          ),
          requestId: sanitizeError(
            openAiResponse.headers.get(
              'x-request-id',
            ),
          ),
        }),
      )
      const mappedError = mapUpstreamError(
        openAiResponse.status,
      )
      finishInvocation(false, {
        code: mappedError.code,
      })
      return createErrorResponse(
        mappedError.code,
        mappedError.message,
        mappedError.status,
      )
    }

    if (responseText.length > MAX_RESPONSE_BYTES) {
      finishInvocation(false, {
        code: 'OPENAI_RESPONSE_INVALID',
      })
      return createErrorResponse(
        'OPENAI_RESPONSE_INVALID',
        '맞춤 식단 결과가 너무 커서 읽지 못했어요.',
        502,
      )
    }

    let rawResponse: unknown

    try {
      rawResponse = JSON.parse(responseText)
      usage = readUsage(rawResponse)
    } catch {
      finishInvocation(false, {
        code: 'JSON_PARSE_FAILED',
      })
      return createErrorResponse(
        'JSON_PARSE_FAILED',
        '맞춤 식단 결과를 안전하게 읽지 못했어요.',
        502,
      )
    }

    const structuredText =
      extractResponseText(rawResponse)

    if (!structuredText) {
      finishInvocation(false, {
        code: 'OPENAI_RESPONSE_INVALID',
      })
      return createErrorResponse(
        'OPENAI_RESPONSE_INVALID',
        '맞춤 식단 결과가 비어 있어요.',
        502,
      )
    }

    let structuredOutput: unknown

    try {
      structuredOutput = JSON.parse(
        structuredText,
      )
    } catch {
      finishInvocation(false, {
        code: 'JSON_PARSE_FAILED',
      })
      return createErrorResponse(
        'JSON_PARSE_FAILED',
        '맞춤 식단 결과 형식이 올바르지 않아요.',
        502,
      )
    }

    const parseResult =
      parseAiMealPlanDraftOutputResult(
        structuredOutput,
        request,
      )

    if (!parseResult.ok) {
      const responseCode =
        parseResult.reason ===
        'MENU_NAME_INVALID'
          ? 'MENU_NAME_INVALID'
          : parseResult.reason ===
                'DUPLICATE_MENU' ||
              parseResult.reason ===
                'RECENT_MENU_DUPLICATE' ||
              parseResult.reason ===
                'DIVERSITY_VIOLATION'
            ? 'MENU_DIVERSITY_INVALID'
          : 'OPENAI_RESPONSE_INVALID'
      finishInvocation(false, {
        code: responseCode,
        reason: parseResult.reason,
        ...(parseResult.dayIndex
          ? { dayIndex: parseResult.dayIndex }
          : {}),
      })
      return createErrorResponse(
        responseCode,
        '맞춤 식단이 입력 조건을 충족하지 못했어요. 무료 체험은 사용 처리되지 않았어요.',
        502,
      )
    }
    const parsedResponse = parseResult.data

    parsedResponse.meta.model = model
    parsedResponse.meta.durationMs =
      Date.now() - startedAt
    parsedResponse.meta.outputBytes =
      new TextEncoder().encode(
        structuredText,
      ).byteLength
    if (usage) {
      parsedResponse.meta.usage = usage
    }
    finishInvocation(true)
    return jsonResponse(parsedResponse)
  } catch (error) {
    const isTimeout =
      error instanceof DOMException &&
      error.name === 'AbortError'
    const code = isTimeout
      ? 'OPENAI_TIMEOUT'
      : 'API_REQUEST_FAILED'
    finishInvocation(false, { code })

    return isTimeout
      ? createErrorResponse(
          code,
          '맞춤 식단 생성 시간이 길어졌어요. 무료 체험은 사용 처리되지 않았어요.',
          504,
        )
      : createErrorResponse(
          code,
          'AI 서비스에 연결하지 못했어요. 무료 체험은 사용 처리되지 않았어요.',
          502,
        )
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function handleAiMealPlanTrial(
  request: Request,
  environment: AiServerEnvironment,
) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: 'POST, OPTIONS',
      },
    })
  }

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
      'INPUT_INVALID',
      '요청 JSON이 올바르지 않습니다.',
      400,
    )
  }

  const validation =
    validateAiMealPlanTrialRequest(requestBody)

  if (!validation.ok) {
    return createErrorResponse(
      'INPUT_INVALID',
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
    const mockResponse = createMockResponse(
      validation.data,
    )

    responseCache.set(signature, {
      createdAt: Date.now(),
      response: cloneResponse(mockResponse),
    })
    return jsonResponse(mockResponse)
  }

  const response = await requestOpenAi(
    validation.data,
    environment,
  )

  if (response.ok) {
    const responseBody =
      (await response.clone().json()) as
        AiMealPlanDraftResponse

    responseCache.set(signature, {
      createdAt: Date.now(),
      response: cloneResponse(responseBody),
    })
  }

  return response
}

export default {
  fetch(request: Request) {
    return handleAiMealPlanTrial(
      request,
      process.env,
    )
  },
}
