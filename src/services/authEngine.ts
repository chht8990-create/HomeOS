import type {
  AuthSession,
  AuthUser,
} from '../types/auth'

export const AUTH_API_PATHS = {
  login: '/api/auth/login',
  googleStart: '/api/auth/google/start',
  session: '/api/auth/session',
  logout: '/api/auth/logout',
  accountSync: '/api/account/sync',
  entitlement: '/api/entitlement',
} as const

export function createAnonymousAuthSession(): AuthSession {
  return {
    status: 'anonymous',
    user: null,
    expiresAt: null,
  }
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

function isValidDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    !Number.isNaN(Date.parse(value))
  )
}

function parseAuthUser(value: unknown): AuthUser | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    typeof value.id !== 'string' ||
    !value.id ||
    value.provider !== 'google' ||
    (value.providerSubject !== undefined &&
      (typeof value.providerSubject !== 'string' ||
        !value.providerSubject)) ||
    typeof value.email !== 'string' ||
    !value.email ||
    typeof value.emailVerified !== 'boolean' ||
    typeof value.displayName !== 'string' ||
    !value.displayName ||
    !isValidDate(value.createdAt) ||
    !isValidDate(value.updatedAt) ||
    (value.avatarUrl !== undefined &&
      typeof value.avatarUrl !== 'string') ||
    (value.locale !== undefined &&
      typeof value.locale !== 'string')
  ) {
    return null
  }

  return {
    id: value.id,
    provider: 'google',
    ...(typeof value.providerSubject === 'string'
      ? {
          providerSubject:
            value.providerSubject,
        }
      : {}),
    email: value.email,
    emailVerified: value.emailVerified,
    displayName: value.displayName,
    ...(value.avatarUrl
      ? { avatarUrl: value.avatarUrl }
      : {}),
    ...(value.locale ? { locale: value.locale } : {}),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

export function parseAuthSession(
  value: unknown,
): AuthSession {
  if (!isRecord(value)) {
    return createAnonymousAuthSession()
  }

  if (
    value.status === 'anonymous' ||
    value.authenticated === false
  ) {
    return createAnonymousAuthSession()
  }

  if (
    value.status !== 'authenticated' &&
    value.authenticated !== true
  ) {
    return createAnonymousAuthSession()
  }

  if (
    typeof value.deviceId !== 'string' ||
    !value.deviceId ||
    !isValidDate(value.expiresAt)
  ) {
    return createAnonymousAuthSession()
  }

  const user = parseAuthUser(value.user)

  if (!user) {
    return createAnonymousAuthSession()
  }

  return {
    status: 'authenticated',
    user,
    deviceId: value.deviceId,
    expiresAt: value.expiresAt,
  }
}

export function isAuthenticatedSession(
  session: AuthSession,
) {
  return session.status === 'authenticated'
}

export function normalizeAuthReturnTo(
  returnTo: string | undefined,
) {
  if (
    !returnTo ||
    !returnTo.startsWith('/') ||
    returnTo.startsWith('//')
  ) {
    return '/'
  }

  return returnTo
}

export function createGoogleSignInPath(
  returnTo?: string,
) {
  const search = new URLSearchParams({
    returnTo: normalizeAuthReturnTo(returnTo),
  })

  return `${AUTH_API_PATHS.googleStart}?${search.toString()}`
}
