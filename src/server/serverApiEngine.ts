import {
  createServerEntitlement,
  resolveServerEntitlement,
  startTrialAfterGoogleLogin,
} from './entitlementEngine.js'
import {
  createExpiredSessionCookie,
  createOpaqueSessionToken,
  createServerSession,
  createSessionCookie,
  hashSessionToken,
  isServerSessionActive,
  readSessionToken,
  shouldRotateServerSession,
} from './sessionEngine.js'
import type {
  ServerDevice,
  ServerEntitlement,
  ServerIdentityRepository,
  ServerSession,
  ServerUser,
  VerifiedGoogleIdentity,
} from '../types/serverIdentity.js'
import {
  addRecordDeletionTombstones,
  mergeAccountSyncSnapshots,
  parseAccountSyncSnapshot,
} from '../services/accountSnapshotEngine.js'

const MAX_LOGIN_REQUEST_BYTES = 8_000

export type ServerApiDependencies = {
  repository: ServerIdentityRepository
  verifyGoogleAuthorizationCode(
    authorizationCode: string,
    redirectUri: string,
  ): Promise<VerifiedGoogleIdentity>
  now?: () => Date
  createId?: (prefix: string) => string
}

type LoginRequest = {
  authorizationCode: string
  redirectUri: string
  deviceKey: string
  deviceName?: string
}

export type ServerAuthContext = {
  session: ServerSession
  user: ServerUser
  entitlement: ServerEntitlement
}

export type EstablishedGoogleSession = {
  user: ServerUser
  entitlement: ServerEntitlement
  session: ServerSession
  token: string
}

function jsonResponse(
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}

function methodNotAllowed(allow: string) {
  return jsonResponse(
    {
      code: 'METHOD_NOT_ALLOWED',
      message: '지원하지 않는 요청 방식입니다.',
    },
    405,
    { Allow: allow },
  )
}

function hasTrustedMutationOrigin(
  request: Request,
) {
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

function csrfRejected() {
  return jsonResponse(
    {
      code: 'CSRF_REJECTED',
      message: '요청 출처를 확인하지 못했습니다.',
    },
    403,
  )
}

function createId(
  dependencies: ServerApiDependencies,
  prefix: string,
) {
  return dependencies.createId
    ? dependencies.createId(prefix)
    : `${prefix}_${crypto.randomUUID()}`
}

function readNow(
  dependencies: ServerApiDependencies,
) {
  return dependencies.now?.() ?? new Date()
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

function parseLoginRequest(
  value: unknown,
): LoginRequest | null {
  if (
    !isRecord(value) ||
    typeof value.authorizationCode !== 'string' ||
    value.authorizationCode.trim().length < 8 ||
    value.authorizationCode.length > 4_096 ||
    typeof value.redirectUri !== 'string' ||
    value.redirectUri.length > 2_048 ||
    typeof value.deviceKey !== 'string' ||
    value.deviceKey.trim().length < 8 ||
    value.deviceKey.length > 200 ||
    (value.deviceName !== undefined &&
      (typeof value.deviceName !== 'string' ||
        value.deviceName.length > 100))
  ) {
    return null
  }

  let redirectUrl: URL

  try {
    redirectUrl = new URL(value.redirectUri)
  } catch {
    return null
  }

  if (redirectUrl.protocol !== 'https:') {
    return null
  }

  return {
    authorizationCode:
      value.authorizationCode.trim(),
    redirectUri: redirectUrl.toString(),
    deviceKey: value.deviceKey.trim(),
    ...(value.deviceName?.trim()
      ? { deviceName: value.deviceName.trim() }
      : {}),
  }
}

async function readJson(
  request: Request,
  maxBytes: number,
) {
  const contentType =
    request.headers.get('content-type') ?? ''

  if (
    !contentType
      .toLowerCase()
      .startsWith('application/json')
  ) {
    return {
      ok: false as const,
      response: jsonResponse(
        {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'JSON 형식으로 요청해 주세요.',
        },
        415,
      ),
    }
  }

  const text = await request.text()

  if (
    new TextEncoder().encode(text).length >
    maxBytes
  ) {
    return {
      ok: false as const,
      response: jsonResponse(
        {
          code: 'REQUEST_TOO_LARGE',
          message: '요청 내용이 너무 큽니다.',
        },
        413,
      ),
    }
  }

  try {
    return {
      ok: true as const,
      value: JSON.parse(text) as unknown,
    }
  } catch {
    return {
      ok: false as const,
      response: jsonResponse(
        {
          code: 'INVALID_JSON',
          message: '올바른 JSON 형식이 아닙니다.',
        },
        400,
      ),
    }
  }
}

function toClientEntitlement(
  entitlement: ServerEntitlement,
) {
  return {
    plan: entitlement.plan,
    trialStartedAt:
      entitlement.trialStartedAt,
    trialEndsAt: entitlement.trialEndsAt,
    premiumExpiresAt:
      entitlement.premiumExpiresAt,
    usage: { ...entitlement.usage },
    updatedAt: entitlement.updatedAt,
  }
}

function toClientUser(user: ServerUser) {
  return {
    id: user.id,
    provider: 'google' as const,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    ...(user.avatarUrl
      ? { avatarUrl: user.avatarUrl }
      : {}),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

async function resolveUser(
  identity: VerifiedGoogleIdentity,
  dependencies: ServerApiDependencies,
) {
  const repository = dependencies.repository
  const now = readNow(dependencies).toISOString()
  const existing =
    await repository.findUserByGoogleSubject(
      identity.subject,
    )

  return repository.saveUser({
    id:
      existing?.id ??
      createId(dependencies, 'user'),
    googleSubject: identity.subject,
    email: identity.email,
    emailVerified: identity.emailVerified,
    displayName: identity.displayName,
    ...(identity.avatarUrl
      ? { avatarUrl: identity.avatarUrl }
      : {}),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  })
}

async function resolveDevice(
  userId: string,
  request: Pick<
    LoginRequest,
    'deviceKey' | 'deviceName'
  >,
  dependencies: ServerApiDependencies,
) {
  const repository = dependencies.repository
  const now = readNow(dependencies).toISOString()
  const existing = await repository.findDevice(
    userId,
    request.deviceKey,
  )
  const device: ServerDevice = {
    id:
      existing?.id ??
      createId(dependencies, 'device'),
    userId,
    deviceKey: request.deviceKey,
    ...(request.deviceName
      ? { displayName: request.deviceName }
      : existing?.displayName
        ? { displayName: existing.displayName }
        : {}),
    createdAt: existing?.createdAt ?? now,
    lastSeenAt: now,
    revokedAt: null,
  }

  return repository.saveDevice(device)
}

async function resolveLoginEntitlement(
  userId: string,
  dependencies: ServerApiDependencies,
) {
  const repository = dependencies.repository
  const now = readNow(dependencies)
  const existing =
    await repository.findEntitlement(userId)
  const base =
    existing ??
    createServerEntitlement(userId, now)
  const trial =
    startTrialAfterGoogleLogin(base, now)

  if (!existing || trial.started) {
    try {
      return await repository.saveEntitlement(
        trial.entitlement,
        existing?.version ?? null,
      )
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          'ENTITLEMENT_VERSION_CONFLICT'
      ) {
        const concurrent =
          await repository.findEntitlement(userId)

        if (concurrent) {
          return resolveServerEntitlement(
            concurrent,
            now,
          )
        }
      }

      throw error
    }
  }

  const resolved = resolveServerEntitlement(
    existing,
    now,
  )

  if (resolved.version !== existing.version) {
    return repository.saveEntitlement(
      resolved,
      existing.version,
    )
  }

  return resolved
}

async function createAndSaveSession(
  userId: string,
  deviceId: string,
  dependencies: ServerApiDependencies,
) {
  const token = createOpaqueSessionToken()
  const tokenHash = await hashSessionToken(token)
  const session = createServerSession(
    {
      id: createId(dependencies, 'session'),
      userId,
      deviceId,
      tokenHash,
    },
    readNow(dependencies),
  )

  await dependencies.repository.saveSession(
    session,
  )

  return { session, token }
}

export async function establishVerifiedGoogleSession(
  input: {
    identity: VerifiedGoogleIdentity
    deviceKey: string
    deviceName?: string
  },
  dependencies: ServerApiDependencies,
): Promise<EstablishedGoogleSession> {
  if (
    !input.identity.emailVerified ||
    !input.identity.subject
  ) {
    throw new Error('GOOGLE_IDENTITY_INVALID')
  }

  const user = await resolveUser(
    input.identity,
    dependencies,
  )
  const device = await resolveDevice(
    user.id,
    {
      deviceKey: input.deviceKey,
      ...(input.deviceName
        ? { deviceName: input.deviceName }
        : {}),
    },
    dependencies,
  )
  const entitlement =
    await resolveLoginEntitlement(
      user.id,
      dependencies,
    )
  const { session, token } =
    await createAndSaveSession(
      user.id,
      device.id,
      dependencies,
    )

  return {
    user,
    entitlement,
    session,
    token,
  }
}

export async function loadAuthContext(
  request: Request,
  dependencies: ServerApiDependencies,
): Promise<ServerAuthContext | null> {
  const token = readSessionToken(
    request.headers.get('cookie'),
  )

  if (!token) {
    return null
  }

  const tokenHash = await hashSessionToken(token)
  const storedContext = dependencies.repository
    .findAuthContextBySessionTokenHash
    ? await dependencies.repository.findAuthContextBySessionTokenHash(
        tokenHash,
      )
    : null
  const session = storedContext
    ? storedContext.session
    : await dependencies.repository.findSessionByTokenHash(
        tokenHash,
      )
  const now = readNow(dependencies)

  if (!session) {
    return null
  }

  if (!isServerSessionActive(session, now)) {
    if (!session.revokedAt) {
      await dependencies.repository.revokeSession(
        session.id,
        now.toISOString(),
      )
    }

    return null
  }

  const [user, storedEntitlement] = storedContext
    ? [storedContext.user, storedContext.entitlement]
    : await Promise.all([
        dependencies.repository.findUserById(
          session.userId,
        ),
        dependencies.repository.findEntitlement(
          session.userId,
        ),
      ])

  if (!user || !storedEntitlement) {
    return null
  }

  const entitlement = resolveServerEntitlement(
    storedEntitlement,
    now,
  )

  if (
    entitlement.version !==
    storedEntitlement.version
  ) {
    await dependencies.repository.saveEntitlement(
      entitlement,
      storedEntitlement.version,
    )
  }

  return { session, user, entitlement }
}

export async function handleAuthLogin(
  request: Request,
  dependencies?: ServerApiDependencies,
) {
  if (request.method !== 'POST') {
    return methodNotAllowed('POST')
  }

  if (!hasTrustedMutationOrigin(request)) {
    return csrfRejected()
  }

  if (!dependencies) {
    return jsonResponse(
      {
        code: 'SERVER_IDENTITY_NOT_CONFIGURED',
        message:
          '계정 로그인 서버를 준비하고 있습니다.',
      },
      503,
    )
  }

  const parsedJson = await readJson(
    request,
    MAX_LOGIN_REQUEST_BYTES,
  )

  if (!parsedJson.ok) {
    return parsedJson.response
  }

  const loginRequest = parseLoginRequest(
    parsedJson.value,
  )

  if (!loginRequest) {
    return jsonResponse(
      {
        code: 'INVALID_LOGIN_REQUEST',
        message: '로그인 요청을 확인해 주세요.',
      },
      400,
    )
  }

  try {
    const identity =
      await dependencies.verifyGoogleAuthorizationCode(
        loginRequest.authorizationCode,
        loginRequest.redirectUri,
      )

    if (
      !identity.emailVerified ||
      !identity.subject
    ) {
      return jsonResponse(
        {
          code: 'GOOGLE_IDENTITY_INVALID',
          message:
            'Google 계정을 확인하지 못했습니다.',
        },
        401,
      )
    }

    const established =
      await establishVerifiedGoogleSession(
        {
          identity,
          deviceKey: loginRequest.deviceKey,
          ...(loginRequest.deviceName
            ? {
                deviceName:
                  loginRequest.deviceName,
              }
            : {}),
        },
        dependencies,
      )

    return jsonResponse(
      {
        authenticated: true,
        user: toClientUser(established.user),
        entitlement:
          toClientEntitlement(
            established.entitlement,
          ),
        deviceId:
          established.session.deviceId,
        expiresAt:
          established.session.expiresAt,
      },
      200,
      {
        'Set-Cookie': createSessionCookie(
          established.token,
        ),
      },
    )
  } catch {
    return jsonResponse(
      {
        code: 'AUTHENTICATION_FAILED',
        message:
          '로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      },
      502,
    )
  }
}

export async function handleAuthLogout(
  request: Request,
  dependencies?: ServerApiDependencies,
) {
  if (request.method !== 'POST') {
    return methodNotAllowed('POST')
  }

  if (!hasTrustedMutationOrigin(request)) {
    return csrfRejected()
  }

  const token = readSessionToken(
    request.headers.get('cookie'),
  )

  if (token && dependencies) {
    const tokenHash = await hashSessionToken(token)
    const session =
      await dependencies.repository.findSessionByTokenHash(
        tokenHash,
      )

    if (session) {
      await dependencies.repository.revokeSession(
        session.id,
        readNow(dependencies).toISOString(),
      )
    }
  }

  return jsonResponse(
    { authenticated: false },
    200,
    {
      'Set-Cookie':
        createExpiredSessionCookie(),
    },
  )
}

export async function handleAuthSession(
  request: Request,
  dependencies?: ServerApiDependencies,
) {
  if (request.method !== 'GET') {
    return methodNotAllowed('GET')
  }

  const token = readSessionToken(
    request.headers.get('cookie'),
  )

  if (!token) {
    return jsonResponse({
      authenticated: false,
      user: null,
      entitlement: null,
    })
  }

  if (!dependencies) {
    return jsonResponse(
      {
        code: 'SERVER_IDENTITY_NOT_CONFIGURED',
        message:
          '계정 세션 서버를 준비하고 있습니다.',
      },
      503,
    )
  }

  const context = await loadAuthContext(
    request,
    dependencies,
  )

  if (!context) {
    return jsonResponse(
      {
        authenticated: false,
        user: null,
        entitlement: null,
      },
      200,
      {
        'Set-Cookie':
          createExpiredSessionCookie(),
      },
    )
  }

  let nextCookie: string | undefined
  let expiresAt = context.session.expiresAt

  if (
    shouldRotateServerSession(
      context.session,
      readNow(dependencies),
    )
  ) {
    await dependencies.repository.revokeSession(
      context.session.id,
      readNow(dependencies).toISOString(),
    )
    const rotated = await createAndSaveSession(
      context.user.id,
      context.session.deviceId,
      dependencies,
    )
    nextCookie = createSessionCookie(rotated.token)
    expiresAt = rotated.session.expiresAt
  } else {
    await dependencies.repository.saveSession({
      ...context.session,
      lastUsedAt:
        readNow(dependencies).toISOString(),
    })
  }

  return jsonResponse(
    {
      authenticated: true,
      user: toClientUser(context.user),
      entitlement: toClientEntitlement(
        context.entitlement,
      ),
      deviceId: context.session.deviceId,
      expiresAt,
    },
    200,
    nextCookie
      ? { 'Set-Cookie': nextCookie }
      : undefined,
  )
}

export async function handleEntitlement(
  request: Request,
  dependencies?: ServerApiDependencies,
) {
  if (request.method !== 'GET') {
    return methodNotAllowed('GET')
  }

  if (!dependencies) {
    return jsonResponse(
      {
        code: 'SERVER_IDENTITY_NOT_CONFIGURED',
        message:
          '이용 권한 서버를 준비하고 있습니다.',
      },
      503,
    )
  }

  const context = await loadAuthContext(
    request,
    dependencies,
  )

  if (!context) {
    return jsonResponse(
      {
        code: 'AUTH_REQUIRED',
        message: 'Google 로그인이 필요합니다.',
      },
      401,
    )
  }

  return jsonResponse({
    entitlement: toClientEntitlement(
      context.entitlement,
    ),
  })
}

export async function handleAccountSync(
  request: Request,
  dependencies?: ServerApiDependencies,
) {
  if (
    request.method !== 'GET' &&
    request.method !== 'POST'
  ) {
    return methodNotAllowed('GET, POST')
  }

  if (
    request.method === 'POST' &&
    !hasTrustedMutationOrigin(request)
  ) {
    return csrfRejected()
  }

  if (!dependencies) {
    return jsonResponse(
      {
        code: 'SERVER_IDENTITY_NOT_CONFIGURED',
        message:
          '계정 동기화 서버를 준비하고 있습니다.',
      },
      503,
    )
  }

  const context = await loadAuthContext(
    request,
    dependencies,
  )

  if (!context) {
    return jsonResponse(
      {
        code: 'AUTH_REQUIRED',
        message: 'Google 로그인이 필요합니다.',
      },
      401,
    )
  }

  const stored =
    await dependencies.repository.findAccountSnapshot(
      context.user.id,
    )

  if (request.method === 'GET') {
    return jsonResponse({
      revision: stored?.revision ?? 0,
      snapshot: stored?.data ?? null,
      syncedAt:
        stored?.updatedAt ??
        readNow(dependencies).toISOString(),
    })
  }

  const parsedJson = await readJson(
    request,
    2_000_000,
  )

  if (!parsedJson.ok) {
    return parsedJson.response
  }

  if (
    !isRecord(parsedJson.value) ||
    !(
      parsedJson.value.baseRevision === null ||
      (typeof parsedJson.value.baseRevision ===
        'number' &&
        Number.isInteger(
          parsedJson.value.baseRevision,
        ) &&
        parsedJson.value.baseRevision >= 0)
    )
  ) {
    return jsonResponse(
      {
        code: 'ACCOUNT_SYNC_REQUEST_INVALID',
        message:
          '동기화 요청 형식을 확인해 주세요.',
      },
      400,
    )
  }

  const localSnapshot = parseAccountSyncSnapshot(
    parsedJson.value.snapshot,
  )
  const remoteSnapshot = stored
    ? parseAccountSyncSnapshot(stored.data)
    : null

  if (
    !localSnapshot ||
    (stored && !remoteSnapshot)
  ) {
    return jsonResponse(
      {
        code: 'ACCOUNT_SYNC_SNAPSHOT_INVALID',
        message:
          '동기화 데이터 형식을 확인해 주세요.',
      },
      400,
    )
  }

  const now = readNow(dependencies).toISOString()
  const revisionBasedLocalSnapshot =
    stored &&
    remoteSnapshot &&
    parsedJson.value.baseRevision === stored.revision
      ? addRecordDeletionTombstones(
          localSnapshot,
          remoteSnapshot,
          now,
        )
      : localSnapshot
  const merged = mergeAccountSyncSnapshots(
    revisionBasedLocalSnapshot,
    remoteSnapshot,
    now,
  )

  try {
    const saved =
      await dependencies.repository.saveAccountSnapshot(
        {
          userId: context.user.id,
          revision: (stored?.revision ?? 0) + 1,
          data: merged,
          updatedAt: now,
        },
        stored?.revision ?? null,
      )

    return jsonResponse({
      revision: saved.revision,
      snapshot: saved.data,
      syncedAt: saved.updatedAt,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        'ACCOUNT_SYNC_REVISION_CONFLICT'
    ) {
      const latest =
        await dependencies.repository.findAccountSnapshot(
          context.user.id,
        )
      const latestSnapshot = latest
        ? parseAccountSyncSnapshot(latest.data)
        : null

      if (latest && latestSnapshot) {
        try {
          const retriedAt =
            readNow(dependencies).toISOString()
          const retried =
            await dependencies.repository.saveAccountSnapshot(
              {
                userId: context.user.id,
                revision: latest.revision + 1,
                data: mergeAccountSyncSnapshots(
                  revisionBasedLocalSnapshot,
                  latestSnapshot,
                  retriedAt,
                ),
                updatedAt: retriedAt,
              },
              latest.revision,
            )

          return jsonResponse({
            revision: retried.revision,
            snapshot: retried.data,
            syncedAt: retried.updatedAt,
          })
        } catch {
          // 두 번째 경합은 클라이언트가 새 snapshot으로 다시 시도한다.
        }
      }

      return jsonResponse(
        {
          code: 'ACCOUNT_SYNC_CONFLICT',
          message:
            '다른 기기의 변경사항을 먼저 다시 받아와 주세요.',
        },
        409,
      )
    }

    return jsonResponse(
      {
        code: 'ACCOUNT_SYNC_FAILED',
        message:
          '데이터를 동기화하지 못했습니다.',
      },
      500,
    )
  }
}
