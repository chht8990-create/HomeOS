import {
  getAiEnabledSettingKey,
} from './aiBusinessGuard.js'
import { isAdminUser } from './businessRuntime.js'
import { loadAuthContext } from './serverApiEngine.js'
import type { ServerApiDependencies } from './serverApiEngine.js'
import type { ServerBusinessRepository } from '../types/business.js'

export type AdminApiEnvironment = {
  ADMIN_USER_IDS?: string
  DATABASE_URL?: string
  OPENAI_API_KEY?: string
  GOOGLE_OAUTH_CLIENT_ID?: string
  GOOGLE_OAUTH_CLIENT_SECRET?: string
  GOOGLE_PLAY_PACKAGE_NAME?: string
  GOOGLE_PLAY_PREMIUM_PRODUCT_IDS?: string
  GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL?: string
  GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY?: string
}

export type AdminApiDependencies = {
  identity: ServerApiDependencies
  business: ServerBusinessRepository
  environment: AdminApiEnvironment
  now?: () => Date
}

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function hasTrustedMutationOrigin(request: Request) {
  const origin = request.headers.get('origin')

  if (!origin) {
    return true
  }

  try {
    return origin === new URL(request.url).origin
  } catch {
    return false
  }
}

function isConfigured(
  environment: AdminApiEnvironment,
  keys: (keyof AdminApiEnvironment)[],
) {
  return keys.every((key) =>
    Boolean(environment[key]?.trim()),
  )
}

function readAiEnabled(
  setting: Awaited<
    ReturnType<
      ServerBusinessRepository['findRuntimeSetting']
    >
  >,
) {
  return !(
    setting?.value === false ||
    (typeof setting?.value === 'object' &&
      setting.value !== null &&
      !Array.isArray(setting.value) &&
      (setting.value as Record<string, unknown>)
        .enabled === false)
  )
}

async function authorizeAdmin(
  request: Request,
  dependencies: AdminApiDependencies,
) {
  const context = await loadAuthContext(
    request,
    dependencies.identity,
  )

  if (!context) {
    return { ok: false as const, status: 401 }
  }

  if (
    !isAdminUser(
      context.user.id,
      dependencies.environment,
    )
  ) {
    return { ok: false as const, status: 403 }
  }

  return { ok: true as const, context }
}

export async function handleAdminDashboard(
  request: Request,
  dependencies?: AdminApiDependencies,
) {
  if (request.method !== 'GET') {
    return jsonResponse(
      { code: 'METHOD_NOT_ALLOWED' },
      405,
    )
  }

  if (!dependencies) {
    return jsonResponse(
      { code: 'ADMIN_NOT_CONFIGURED' },
      503,
    )
  }

  const authorization = await authorizeAdmin(
    request,
    dependencies,
  )

  if (!authorization.ok) {
    return jsonResponse(
      {
        code:
          authorization.status === 401
            ? 'AUTH_REQUIRED'
            : 'ADMIN_ACCESS_DENIED',
      },
      authorization.status,
    )
  }

  const now = dependencies.now?.() ?? new Date()
  const [summary, aiSetting] = await Promise.all([
    dependencies.business.getAdminDashboardSummary(
      now.toISOString(),
      50,
    ),
    dependencies.business.findRuntimeSetting(
      getAiEnabledSettingKey(),
    ),
  ])
  const aiEnabled = readAiEnabled(aiSetting)

  return jsonResponse({
    ...summary,
    aiEnabled,
    system: {
      openAi: isConfigured(dependencies.environment, [
        'OPENAI_API_KEY',
      ]),
      database: isConfigured(dependencies.environment, [
        'DATABASE_URL',
      ]),
      oauth: isConfigured(dependencies.environment, [
        'GOOGLE_OAUTH_CLIENT_ID',
        'GOOGLE_OAUTH_CLIENT_SECRET',
      ]),
      billing: isConfigured(dependencies.environment, [
        'GOOGLE_PLAY_PACKAGE_NAME',
        'GOOGLE_PLAY_PREMIUM_PRODUCT_IDS',
        'GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL',
        'GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY',
      ]),
    },
  })
}

export async function handleAdminAiSwitch(
  request: Request,
  dependencies?: AdminApiDependencies,
) {
  if (
    request.method !== 'GET' &&
    request.method !== 'PUT'
  ) {
    return jsonResponse(
      { code: 'METHOD_NOT_ALLOWED' },
      405,
    )
  }

  if (
    request.method === 'PUT' &&
    !hasTrustedMutationOrigin(request)
  ) {
    return jsonResponse({ code: 'CSRF_REJECTED' }, 403)
  }

  if (!dependencies) {
    return jsonResponse(
      { code: 'ADMIN_NOT_CONFIGURED' },
      503,
    )
  }

  const authorization = await authorizeAdmin(
    request,
    dependencies,
  )

  if (!authorization.ok) {
    return jsonResponse(
      {
        code:
          authorization.status === 401
            ? 'AUTH_REQUIRED'
            : 'ADMIN_ACCESS_DENIED',
      },
      authorization.status,
    )
  }

  if (request.method === 'GET') {
    const setting =
      await dependencies.business.findRuntimeSetting(
        getAiEnabledSettingKey(),
      )

    return jsonResponse({
      aiEnabled: readAiEnabled(setting),
      updatedAt: setting?.updatedAt ?? null,
    })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonResponse({ code: 'INVALID_JSON' }, 400)
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body) ||
    typeof (body as Record<string, unknown>).enabled !==
      'boolean'
  ) {
    return jsonResponse(
      { code: 'AI_SWITCH_REQUEST_INVALID' },
      400,
    )
  }

  const enabled = (body as { enabled: boolean }).enabled
  const setting =
    await dependencies.business.saveRuntimeSetting({
      key: getAiEnabledSettingKey(),
      value: { enabled },
      updatedBy: authorization.context.user.id,
      updatedAt: (
        dependencies.now?.() ?? new Date()
      ).toISOString(),
    })

  return jsonResponse({
    aiEnabled: enabled,
    updatedAt: setting.updatedAt,
  })
}
