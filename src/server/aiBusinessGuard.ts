import {
  createAiCacheKey,
  createAiUsageEvent,
} from './businessEngine.js'
import { getBusinessRepository } from './businessRuntime.js'
import { getServerApiDependencies } from './serverRuntime.js'
import { loadAuthContext } from './serverApiEngine.js'
import {
  createAiLatencyTrace,
  logAiLatencyStage,
  type AiLatencyTrace,
} from './aiLatencyTrace.js'
import type {
  AiOperationKind,
  ServerBusinessRepository,
  ServerRuntimeSetting,
} from '../types/business.js'
import type { ServerEntitlement } from '../types/serverIdentity.js'

const AI_ENABLED_SETTING = 'ai_enabled'
const RUNTIME_SETTING_CACHE_TTL_MS = 30_000

type RuntimeSettingCacheEntry = {
  expiresAt: number
  value: Promise<ServerRuntimeSetting | null>
}

let runtimeSettingCache = new WeakMap<
  ServerBusinessRepository,
  RuntimeSettingCacheEntry
>()

export type AiBusinessEnvironment = {
  DATABASE_URL?: string
  OPENAI_MODEL?: string
  OPENAI_INPUT_USD_PER_MILLION?: string
  OPENAI_OUTPUT_USD_PER_MILLION?: string
}

type AiBusinessGuardOptions = {
  operation: AiOperationKind
  cacheTtlMs: number
  cacheVersion?: string
  environment: AiBusinessEnvironment
  request: Request
  execute(
    request: Request,
    trace?: AiLatencyTrace,
  ): Promise<Response>
  now?: () => Date
  createId?: () => string
}

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function readNumber(value: string | undefined) {
  if (!value?.trim()) {
    return undefined
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : undefined
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function readUsage(value: unknown) {
  if (!isRecord(value)) {
    return { inputTokens: 0, outputTokens: 0 }
  }

  const meta = isRecord(value.meta) ? value.meta : null
  const usage = meta && isRecord(meta.usage)
    ? meta.usage
    : null

  return {
    inputTokens:
      typeof usage?.inputTokens === 'number'
        ? usage.inputTokens
        : 0,
    outputTokens:
      typeof usage?.outputTokens === 'number'
        ? usage.outputTokens
        : 0,
  }
}

function readErrorCode(value: unknown) {
  return isRecord(value) && typeof value.code === 'string'
    ? value.code.slice(0, 100)
    : null
}

function isAiEnabled(value: unknown) {
  if (typeof value === 'boolean') {
    return value
  }

  return !(
    isRecord(value) && value.enabled === false
  )
}

function readRuntimeSettingCached(
  repository: ServerBusinessRepository,
) {
  const now = Date.now()
  const cached = runtimeSettingCache.get(repository)

  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const value = repository
    .findRuntimeSetting(AI_ENABLED_SETTING)
    .catch((error: unknown) => {
      runtimeSettingCache.delete(repository)
      throw error
    })

  runtimeSettingCache.set(repository, {
    expiresAt: now + RUNTIME_SETTING_CACHE_TTL_MS,
    value,
  })

  return value
}

function incrementUsage(
  entitlement: ServerEntitlement,
  operation: AiOperationKind,
  generatedAt: string,
) {
  const usage = { ...entitlement.usage }

  if (operation === 'mealPlan') {
    usage.mealPlanCount += 1
  } else if (operation === 'recipe') {
    usage.recipeCount += 1
  } else {
    usage.recommendationCount += 1
  }

  usage.lastGenerationAt = generatedAt

  return {
    ...entitlement,
    usage,
    version: entitlement.version + 1,
    updatedAt: generatedAt,
  }
}

async function readRequestInput(request: Request) {
  try {
    return (await request.clone().json()) as unknown
  } catch {
    return null
  }
}

function readInventoryItemCount(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.inventoryItems)) {
    return 0
  }

  return value.inventoryItems.length
}

async function recordUsage(
  repository: ServerBusinessRepository,
  input: {
    id: string
    userId: string
    operation: AiOperationKind
    model: string
    inputTokens: number
    outputTokens: number
    success: boolean
    errorCode: string | null
    cacheHit: boolean
    createdAt: string
    inputPrice?: number
    outputPrice?: number
  },
) {
  await repository.saveAiUsageEvent(
    createAiUsageEvent({
      id: input.id,
      userId: input.userId,
      operation: input.operation,
      model: input.model,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      success: input.success,
      errorCode: input.errorCode,
      cacheHit: input.cacheHit,
      createdAt: input.createdAt,
      ...(input.inputPrice !== undefined
        ? { inputUsdPerMillion: input.inputPrice }
        : {}),
      ...(input.outputPrice !== undefined
        ? { outputUsdPerMillion: input.outputPrice }
        : {}),
    }),
  )
}

async function runAiBusinessGuardInternal(
  options: AiBusinessGuardOptions,
  trace: AiLatencyTrace | undefined,
  tracedInput: unknown,
) {
  const identity = getServerApiDependencies(
    options.environment,
  )
  const business = getBusinessRepository(
    options.environment,
  )

  // Local tests and deployments without the R3 server remain compatible.
  if (!identity || !business) {
    return options.execute(options.request, trace)
  }

  // Start the independent emergency-switch lookup while authentication is
  // being resolved. Rejections are captured immediately so unauthenticated
  // early returns cannot create an unhandled promise rejection.
  const runtimeSettingResultPromise = readRuntimeSettingCached(
    business,
  ).then(
    (setting) => ({ setting, error: null }),
    (error: unknown) => ({ setting: null, error }),
  )

  const context = await loadAuthContext(
    options.request,
    identity,
  )

  logAiLatencyStage(trace, 'auth_completed', {
    httpStatus: context ? 200 : 401,
    errorCode: context ? null : 'AUTH_REQUIRED',
  })

  if (!context) {
    logAiLatencyStage(trace, 'request_failed', {
      httpStatus: 401,
      errorCode: 'AUTH_REQUIRED',
    })
    return jsonResponse(
      {
        code: 'AUTH_REQUIRED',
        message: 'AI 기능은 Google 로그인 후 사용할 수 있어요.',
      },
      401,
    )
  }

  logAiLatencyStage(trace, 'entitlement_completed', {
    httpStatus:
      context.entitlement.plan === 'FREE' ? 403 : 200,
    errorCode:
      context.entitlement.plan === 'FREE'
        ? 'AI_ACCESS_REQUIRED'
        : null,
  })

  if (context.entitlement.plan === 'FREE') {
    logAiLatencyStage(trace, 'request_failed', {
      httpStatus: 403,
      errorCode: 'AI_ACCESS_REQUIRED',
    })
    return jsonResponse(
      {
        code: 'AI_ACCESS_REQUIRED',
        message: 'AI 이용 기간 또는 구독 상태를 확인해 주세요.',
      },
      403,
    )
  }

  const runtimeSettingResult =
    await runtimeSettingResultPromise

  if (runtimeSettingResult.error) {
    throw runtimeSettingResult.error
  }

  const setting = runtimeSettingResult.setting

  logAiLatencyStage(trace, 'runtime_settings_completed', {
    httpStatus:
      setting && !isAiEnabled(setting.value) ? 503 : 200,
    errorCode:
      setting && !isAiEnabled(setting.value)
        ? 'AI_TEMPORARILY_DISABLED'
        : null,
  })

  if (setting && !isAiEnabled(setting.value)) {
    logAiLatencyStage(trace, 'request_failed', {
      httpStatus: 503,
      errorCode: 'AI_TEMPORARILY_DISABLED',
    })
    return jsonResponse(
      {
        code: 'AI_TEMPORARILY_DISABLED',
        message:
          'AI 기능을 잠시 점검하고 있어요. 다른 기능은 계속 사용할 수 있어요.',
      },
      503,
    )
  }

  const input =
    tracedInput ??
    (await readRequestInput(options.request))
  const model =
    options.environment.OPENAI_MODEL?.trim() ||
    'gpt-5.6-luna'
  const cacheKey = await createAiCacheKey(
    options.operation,
    model,
    options.cacheVersion
      ? {
          cacheVersion: options.cacheVersion,
          input,
        }
      : input,
  )
  const now = options.now?.() ?? new Date()
  const nowIso = now.toISOString()
  const cached = await business.findAiResultCache(
    context.user.id,
    options.operation,
    cacheKey,
    nowIso,
  )
  const inputPrice = readNumber(
    options.environment.OPENAI_INPUT_USD_PER_MILLION,
  )
  const outputPrice = readNumber(
    options.environment.OPENAI_OUTPUT_USD_PER_MILLION,
  )
  const createId =
    options.createId ??
    (() => `ai_usage_${crypto.randomUUID()}`)

  if (cached) {
    await recordUsage(business, {
      id: createId(),
      userId: context.user.id,
      operation: options.operation,
      model: cached.model,
      inputTokens: 0,
      outputTokens: 0,
      success: true,
      errorCode: null,
      cacheHit: true,
      createdAt: nowIso,
      inputPrice,
      outputPrice,
    })

    logAiLatencyStage(trace, 'usage_saved', {
      httpStatus: 200,
    })
    logAiLatencyStage(trace, 'response_returned', {
      httpStatus: 200,
    })

    return jsonResponse(cached.response)
  }

  const response = await options.execute(
    options.request,
    trace,
  )
  let responseBody: unknown

  try {
    responseBody = await response.clone().json()
  } catch {
    responseBody = null
  }

  const usage = readUsage(responseBody)
  const success = response.ok
  const errorCode = success
    ? null
    : readErrorCode(responseBody)
  const usageEvent = createAiUsageEvent({
    id: createId(),
    userId: context.user.id,
    operation: options.operation,
    model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    success,
    errorCode,
    cacheHit: false,
    createdAt: nowIso,
    ...(inputPrice !== undefined
      ? { inputUsdPerMillion: inputPrice }
      : {}),
    ...(outputPrice !== undefined
      ? { outputUsdPerMillion: outputPrice }
      : {}),
  })

  if (success) {
    const expiresAt = new Date(
      now.getTime() + options.cacheTtlMs,
    ).toISOString()

    const cacheRecord = {
      userId: context.user.id,
      operation: options.operation,
      cacheKey,
      model,
      response: responseBody,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      createdAt: nowIso,
      expiresAt,
    }
    const saveBusinessResult =
      business.saveAiResultCacheWithUsage
        ? business.saveAiResultCacheWithUsage(
            cacheRecord,
            usageEvent,
          )
        : Promise.all([
            business.saveAiResultCache(cacheRecord),
            business.saveAiUsageEvent(usageEvent),
          ]).then(() => undefined)

    await Promise.all([
      saveBusinessResult,
      identity.repository.saveEntitlement(
        incrementUsage(
          context.entitlement,
          options.operation,
          nowIso,
        ),
        context.entitlement.version,
      ),
    ])
  } else {
    await business.saveAiUsageEvent(usageEvent)
  }

  logAiLatencyStage(trace, 'usage_saved', {
    httpStatus: response.status,
    errorCode,
  })

  if (!success) {
    logAiLatencyStage(trace, 'request_failed', {
      httpStatus: response.status,
      errorCode,
    })
  }

  logAiLatencyStage(trace, 'response_returned', {
    httpStatus: response.status,
    errorCode,
  })

  return response
}

export async function runAiBusinessGuard(
  options: AiBusinessGuardOptions,
) {
  const startedAt = Date.now()
  const tracedInput =
    options.operation === 'recommendation'
      ? await readRequestInput(options.request)
      : undefined
  const trace =
    options.operation === 'recommendation'
      ? createAiLatencyTrace(
          options.environment.OPENAI_MODEL?.trim() ||
            'gpt-5.6-luna',
          readInventoryItemCount(tracedInput),
          startedAt,
        )
      : undefined

  logAiLatencyStage(trace, 'request_received', {
    at: startedAt,
  })

  try {
    return await runAiBusinessGuardInternal(
      options,
      trace,
      tracedInput,
    )
  } catch (error) {
    logAiLatencyStage(trace, 'request_failed', {
      httpStatus: 500,
      errorCode:
        error instanceof Error
          ? error.name.slice(0, 100)
          : 'UNKNOWN_ERROR',
    })
    throw error
  }
}

export function getAiEnabledSettingKey() {
  return AI_ENABLED_SETTING
}

export function clearAiBusinessGuardCachesForTests() {
  runtimeSettingCache = new WeakMap()
}

export function getRuntimeSettingCacheTtlMs() {
  return RUNTIME_SETTING_CACHE_TTL_MS
}
