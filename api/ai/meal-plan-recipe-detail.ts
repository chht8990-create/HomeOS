import { recipeSchema } from './meal-plan-trial.js'
import {
  parseAiMealPlanRecipeDetailOutput,
  validateAiMealPlanRecipeDetailRequest,
} from '../../src/services/aiMealPlanTrialEngine.js'
import type {
  AiGenerationUsage,
  AiMealPlanRecipeDetailRequest,
} from '../../src/types/aiMealPlanTrial.js'
import { runAiBusinessGuard } from '../../src/server/aiBusinessGuard.js'

type AiServerEnvironment = {
  OPENAI_API_KEY?: string
  OPENAI_MODEL?: string
  HOMEOS_AI_MOCK?: string
  NODE_ENV?: string
}

const OPENAI_RESPONSES_URL =
  'https://api.openai.com/v1/responses'
const DEFAULT_MODEL = 'gpt-5.6-luna'
const SERVER_TIMEOUT_MS = 30_000
const MAX_REQUEST_BYTES = 16_000
const MAX_RESPONSE_BYTES = 240_000
const MAX_OUTPUT_TOKENS = 8_000

export const config = {
  maxDuration: 35,
}

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    recipe: recipeSchema,
  },
  required: ['recipe'],
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

function errorResponse(
  code: string,
  message: string,
  status: number,
) {
  return jsonResponse({ code, message }, status)
}

function sanitizeError(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  return value
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/\s+/g, ' ')
    .slice(0, 240)
}

function readUsage(
  value: unknown,
): AiGenerationUsage | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const usage = (
    value as Record<string, unknown>
  ).usage

  if (!usage || typeof usage !== 'object') {
    return undefined
  }

  const record = usage as Record<string, unknown>
  const inputTokens =
    record.input_tokens ?? record.inputTokens
  const outputTokens =
    record.output_tokens ?? record.outputTokens
  const totalTokens =
    record.total_tokens ?? record.totalTokens

  return typeof inputTokens === 'number' &&
    typeof outputTokens === 'number' &&
    typeof totalTokens === 'number'
    ? {
        inputTokens,
        outputTokens,
        totalTokens,
      }
    : undefined
}

function extractResponseText(value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    'output_text' in value &&
    typeof value.output_text === 'string'
  ) {
    return value.output_text
  }

  if (
    !value ||
    typeof value !== 'object' ||
    !('output' in value) ||
    !Array.isArray(value.output)
  ) {
    return null
  }

  for (const outputItem of value.output) {
    if (
      !outputItem ||
      typeof outputItem !== 'object' ||
      !('content' in outputItem) ||
      !Array.isArray(outputItem.content)
    ) {
      continue
    }

    for (const content of outputItem.content) {
      if (
        content &&
        typeof content === 'object' &&
        'text' in content &&
        typeof content.text === 'string'
      ) {
        return content.text
      }
    }
  }

  return null
}

function buildPrompt(
  request: AiMealPlanRecipeDetailRequest,
) {
  return JSON.stringify({
    task:
      '선택한 한국 가정식 메뉴 한 개의 Premium 상세 레시피를 한국어로 만드세요.',
    draft: request.day,
    family: {
      householdSize: request.householdSize,
      includesChildren: request.includesChildren,
      childAgeGroup: request.childAgeGroup ?? '',
      spicePreference: request.spicePreference,
      excludedFoods: request.excludedFoods ?? '',
      allergies: request.allergies ?? '',
    },
    rules: [
      '메뉴명은 draft.name과 정확히 같아야 합니다.',
      '주재료, 양념, 물 또는 육수, 고명까지 빠짐없이 정확한 수량과 단위를 쓰세요.',
      '필수 ingredients의 group은 main, seasoning, broth, garnish 중 하나이고 optional은 false입니다.',
      '선택 재료는 optionalIngredients에 group optional, optional true로 쓰세요.',
      '물·육수·우유는 ml 또는 컵 단위로 쓰세요.',
      '밥은 공기, 양파·감자·당근·달걀·고추·애호박은 개, 대파는 대, 두부는 모, 마늘은 쪽, 김·식빵은 장, 라면은 봉지, 참치는 캔처럼 한국 가정의 생활 단위를 우선 사용하세요.',
      '고기·생선·새우·오징어·밀가루·버터·치즈·면·떡은 g, 간장·식용유·식초·고춧가루는 큰술, 참기름·설탕·다진 마늘은 작은술 또는 큰술을 사용하세요.',
      '소금은 한 꼬집 또는 약간, 후추·깨·파슬리·허브는 약간으로 쓰세요.',
      '개수와 생활 단위는 1/2 또는 자연수만 사용하고 1 1/2개, 0.83개, 1.25개 같은 값을 만들지 마세요.',
      '서로 다른 실제 조리 단계 8~12개를 쓰고 단계별 제목, 시간, 불 세기, 눈으로 확인할 완성 기준을 포함하세요.',
      'ingredientRefs에는 재료 목록에 실제로 적은 이름만 정확히 쓰세요.',
      '간 조절, 실패 방지, 보관, 재가열, 대체 재료, 남은 음식 활용과 곁들이기를 모두 포함하세요.',
      '제외 음식과 알레르기는 양념, 고명, 대체 재료에도 절대 사용하지 마세요.',
      '생고기와 달걀은 중심까지 충분히 익히는 안전 기준을 안내하세요.',
    ],
  })
}

function mapUpstreamError(status: number) {
  if (status === 400) {
    return {
      status: 502,
      code: 'RECIPE_GENERATION_FAILED',
      message:
        '상세 레시피 결과를 안전하게 만들지 못했어요. 다시 시도해 주세요.',
    }
  }

  if (status === 401 || status === 403) {
    return {
      status,
      code: 'API_REQUEST_FAILED',
      message:
        '현재 AI 상세 레시피 설정을 확인하고 있어요.',
    }
  }

  if (status === 429) {
    return {
      status,
      code: 'OPENAI_RATE_LIMIT',
      message:
        'AI 사용 한도에 도달했어요. 잠시 후 다시 시도해 주세요.',
    }
  }

  return {
    status: status >= 500 ? 503 : 502,
    code: 'API_REQUEST_FAILED',
    message:
      'AI 서비스가 잠시 불안정해요. 이 메뉴에서 다시 시도해 주세요.',
  }
}

function createMockResponse(
  request: AiMealPlanRecipeDetailRequest,
) {
  const mainIngredient =
    request.day.mainIngredientNames[0] ??
    '두부'
  const output = {
    recipe: {
      name: request.day.name,
      description: request.day.summary,
      difficulty: '보통',
      calories: null,
      servings: request.householdSize,
      prepMinutes: request.day.prepMinutes,
      cookMinutes: request.day.cookMinutes,
      ingredients: [
        {
          name: mainIngredient,
          quantity: 400,
          unit: 'g',
          group: 'main',
          note: '먹기 좋은 크기로 준비해요.',
          optional: false,
          substitute: [],
        },
        {
          name: '양파',
          quantity: 1,
          unit: '개',
          group: 'main',
          note: '두께를 맞춰 썰어요.',
          optional: false,
          substitute: ['대파'],
        },
        {
          name: '국간장',
          quantity: 1,
          unit: '큰술',
          group: 'seasoning',
          note: '마지막 간을 보며 조절해요.',
          optional: false,
          substitute: ['진간장'],
        },
        {
          name: '물',
          quantity: 600,
          unit: 'ml',
          group: 'broth',
          note: '한 번에 모두 붓지 않아요.',
          optional: false,
          substitute: ['채소육수'],
        },
        {
          name: '대파',
          quantity: 0.5,
          unit: '대',
          group: 'garnish',
          note: '마지막에 넣어요.',
          optional: false,
          substitute: ['쪽파'],
        },
      ],
      optionalIngredients: [],
      substitutions: [
        {
          ingredientName: '양파',
          alternatives: ['대파'],
        },
      ],
      steps: Array.from(
        { length: 8 },
        (_, index) => ({
          order: index + 1,
          title: `${index + 1}단계`,
          instruction: `${index + 1}단계 조리를 차근차근 진행해요.`,
          durationMinutes: 3,
          heatLevel:
            index < 2 ? '불 사용 안 함' : '중불',
          completionCue:
            '재료의 색과 질감이 고르게 익었어요.',
          reason:
            '재료가 고르게 익도록 순서를 지켜요.',
          warning:
            index === 6
              ? '속까지 충분히 익었는지 확인해요.'
              : null,
          ingredientRefs: [mainIngredient],
        }),
      ),
      seasoningAdjustment: [
        '완성 직전 국간장을 조금씩 더해 간을 맞춰요.',
      ],
      commonMistakes: [
        '센 불에서 수분을 너무 빨리 날리지 않아요.',
      ],
      storage:
        '완전히 식힌 뒤 밀폐 용기에 담아 냉장 보관해요.',
      reheating:
        '먹을 만큼 덜어 중심까지 충분히 뜨겁게 데워요.',
      leftoverIdeas: [
        '남은 음식은 밥과 함께 한 그릇으로 활용해요.',
      ],
      servingSuggestions: [
        '제철 나물과 따뜻한 밥을 곁들여요.',
      ],
    },
  }
  const parsed =
    parseAiMealPlanRecipeDetailOutput(
      output,
      request,
    )

  if (!parsed) {
    throw new Error(
      'Mock detailed recipe is invalid.',
    )
  }

  parsed.meta.model = 'mock'
  return parsed
}

async function requestOpenAi(
  request: AiMealPlanRecipeDetailRequest,
  environment: AiServerEnvironment,
) {
  const apiKey = environment.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    return errorResponse(
      'AI_NOT_CONFIGURED',
      'AI 상세 레시피 설정이 아직 완료되지 않았어요.',
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
  let usage: AiGenerationUsage | undefined

  try {
    const response = await fetch(
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
                '오늘식탁의 한국 가정식 레시피 편집자입니다. 입력 조건과 strict JSON schema를 따르세요.',
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
              name: 'today_table_meal_plan_recipe_detail',
              strict: true,
              schema: responseSchema,
            },
          },
          max_output_tokens: MAX_OUTPUT_TOKENS,
        }),
        signal: abortController.signal,
      },
    )
    const responseText = await response.text()

    if (!response.ok) {
      let upstreamError: Record<string, unknown> =
        {}

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
        '[today-table-ai-meal-plan-detail-upstream]',
        JSON.stringify({
          traceId: request.traceId ?? 'untracked',
          stage: 'RECIPE_DETAIL_GENERATION',
          status: response.status,
          type: sanitizeError(upstreamError.type),
          code: sanitizeError(upstreamError.code),
          param: sanitizeError(upstreamError.param),
          message: sanitizeError(
            upstreamError.message,
          ),
          requestId: sanitizeError(
            response.headers.get('x-request-id'),
          ),
        }),
      )
      const mapped = mapUpstreamError(response.status)
      console.info(
        '[today-table-ai-meal-plan-detail]',
        JSON.stringify({
          traceId: request.traceId ?? 'untracked',
          stage: 'RECIPE_DETAIL_GENERATION',
          model,
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
          success: false,
          durationMs: Date.now() - startedAt,
        }),
      )
      return errorResponse(
        mapped.code,
        mapped.message,
        mapped.status,
      )
    }

    if (responseText.length > MAX_RESPONSE_BYTES) {
      return errorResponse(
        'OPENAI_RESPONSE_INVALID',
        '상세 레시피 결과가 너무 커서 읽지 못했어요.',
        502,
      )
    }

    let rawResponse: unknown

    try {
      rawResponse = JSON.parse(responseText)
      usage = readUsage(rawResponse)
    } catch {
      return errorResponse(
        'JSON_PARSE_FAILED',
        '상세 레시피 결과를 안전하게 읽지 못했어요.',
        502,
      )
    }

    const structuredText =
      extractResponseText(rawResponse)

    if (!structuredText) {
      return errorResponse(
        'OPENAI_RESPONSE_INVALID',
        '상세 레시피 결과가 비어 있어요.',
        502,
      )
    }

    let output: unknown

    try {
      output = JSON.parse(structuredText)
    } catch {
      return errorResponse(
        'JSON_PARSE_FAILED',
        '상세 레시피 결과 형식이 올바르지 않아요.',
        502,
      )
    }

    const parsed =
      parseAiMealPlanRecipeDetailOutput(
        output,
        request,
      )

    if (!parsed) {
      return errorResponse(
        'SCHEMA_VALIDATION_FAILED',
        '상세 레시피가 안전 기준을 충족하지 못했어요. 다시 시도해 주세요.',
        502,
      )
    }

    parsed.meta.model = model
    parsed.meta.durationMs = Date.now() - startedAt
    parsed.meta.outputBytes =
      new TextEncoder().encode(
        structuredText,
      ).byteLength
    if (usage) {
      parsed.meta.usage = usage
    }
    console.info(
      '[today-table-ai-meal-plan-detail]',
      JSON.stringify({
        traceId: request.traceId ?? 'untracked',
        stage: 'RECIPE_DETAIL_GENERATION',
        model,
        inputTokens: usage?.inputTokens ?? null,
        outputTokens:
          usage?.outputTokens ?? null,
        totalTokens: usage?.totalTokens ?? null,
        success: true,
        durationMs: Date.now() - startedAt,
      }),
    )

    return jsonResponse(parsed)
  } catch (error) {
    console.info(
      '[today-table-ai-meal-plan-detail]',
      JSON.stringify({
        traceId: request.traceId ?? 'untracked',
        stage: 'RECIPE_DETAIL_GENERATION',
        model,
        inputTokens: usage?.inputTokens ?? null,
        outputTokens:
          usage?.outputTokens ?? null,
        totalTokens: usage?.totalTokens ?? null,
        success: false,
        durationMs: Date.now() - startedAt,
      }),
    )

    return error instanceof DOMException &&
      error.name === 'AbortError'
      ? errorResponse(
          'OPENAI_TIMEOUT',
          '상세 레시피 생성 시간이 길어졌어요. 식단은 그대로 두고 이 메뉴에서 다시 시도해 주세요.',
          504,
        )
      : errorResponse(
          'API_REQUEST_FAILED',
          'AI 상세 레시피에 연결하지 못했어요. 이 메뉴에서 다시 시도해 주세요.',
          502,
        )
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function handleAiMealPlanRecipeDetail(
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
    return errorResponse(
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
    return errorResponse(
      'REQUEST_TOO_LARGE',
      '요청이 너무 큽니다.',
      413,
    )
  }

  const requestText = await request.text()

  if (requestText.length > MAX_REQUEST_BYTES) {
    return errorResponse(
      'REQUEST_TOO_LARGE',
      '요청이 너무 큽니다.',
      413,
    )
  }

  let body: unknown

  try {
    body = JSON.parse(requestText)
  } catch {
    return errorResponse(
      'INPUT_INVALID',
      '요청 JSON이 올바르지 않습니다.',
      400,
    )
  }

  const validation =
    validateAiMealPlanRecipeDetailRequest(body)

  if (!validation.ok) {
    return errorResponse(
      'INPUT_INVALID',
      validation.message,
      400,
    )
  }

  if (
    environment.NODE_ENV !== 'production' &&
    environment.HOMEOS_AI_MOCK === 'true'
  ) {
    return jsonResponse(
      createMockResponse(validation.data),
    )
  }

  return requestOpenAi(validation.data, environment)
}

export default {
  fetch(request: Request) {
    if (request.method !== 'POST') {
      return handleAiMealPlanRecipeDetail(
        request,
        process.env,
      )
    }

    return runAiBusinessGuard({
      operation: 'recipe',
      cacheTtlMs: 30 * 24 * 60 * 60 * 1_000,
      environment: process.env,
      request,
      execute: (guardedRequest) =>
        handleAiMealPlanRecipeDetail(
          guardedRequest,
          process.env,
        ),
    })
  },
}
