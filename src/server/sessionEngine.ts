import type { ServerSession } from '../types/serverIdentity.js'

export const SERVER_SESSION_COOKIE_NAME =
  '__Host-today_table_session'
export const SERVER_SESSION_DURATION_MS =
  30 * 24 * 60 * 60 * 1_000
export const SERVER_SESSION_ROTATION_MS =
  24 * 60 * 60 * 1_000

function toDate(value: Date | string) {
  const date =
    value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export function createOpaqueSessionToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return toBase64Url(bytes)
}

export async function hashSessionToken(
  token: string,
) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  )

  return toBase64Url(new Uint8Array(digest))
}

export function createServerSession(
  input: {
    id: string
    userId: string
    deviceId: string
    tokenHash: string
  },
  now: Date | string = new Date(),
): ServerSession {
  const createdAt = toDate(now) ?? new Date()

  return {
    ...input,
    createdAt: createdAt.toISOString(),
    lastUsedAt: createdAt.toISOString(),
    rotatedAt: createdAt.toISOString(),
    expiresAt: new Date(
      createdAt.getTime() +
        SERVER_SESSION_DURATION_MS,
    ).toISOString(),
    revokedAt: null,
  }
}

export function isServerSessionActive(
  session: ServerSession,
  now: Date | string = new Date(),
) {
  if (session.revokedAt) {
    return false
  }

  const currentDate = toDate(now) ?? new Date()
  const expiresAt = toDate(session.expiresAt)

  return Boolean(
    expiresAt &&
      currentDate.getTime() <
        expiresAt.getTime(),
  )
}

export function shouldRotateServerSession(
  session: ServerSession,
  now: Date | string = new Date(),
) {
  if (!isServerSessionActive(session, now)) {
    return false
  }

  const currentDate = toDate(now) ?? new Date()
  const rotatedAt = toDate(session.rotatedAt)

  return Boolean(
    rotatedAt &&
      currentDate.getTime() -
        rotatedAt.getTime() >=
        SERVER_SESSION_ROTATION_MS,
  )
}

export function createSessionCookie(
  token: string,
  maxAgeSeconds = Math.floor(
    SERVER_SESSION_DURATION_MS / 1_000,
  ),
) {
  return [
    `${SERVER_SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ].join('; ')
}

export function createExpiredSessionCookie() {
  return createSessionCookie('', 0)
}

export function readSessionToken(
  cookieHeader: string | null,
) {
  if (!cookieHeader) {
    return null
  }

  for (const part of cookieHeader.split(';')) {
    const [name, ...valueParts] =
      part.trim().split('=')

    if (name === SERVER_SESSION_COOKIE_NAME) {
      const value = valueParts.join('=').trim()
      return value || null
    }
  }

  return null
}
