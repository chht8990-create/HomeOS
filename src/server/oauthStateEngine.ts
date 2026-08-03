import type { OAuthTransaction } from '../types/googleOAuth'

export const OAUTH_TRANSACTION_COOKIE_NAME =
  '__Host-today_table_oauth'
export const DEVICE_COOKIE_NAME =
  '__Host-today_table_device'
export const OAUTH_TRANSACTION_DURATION_MS =
  10 * 60 * 1_000
export const DEVICE_COOKIE_MAX_AGE_SECONDS =
  365 * 24 * 60 * 60

const OAUTH_COOKIE_AAD =
  'today-table:google-oauth:v1'

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

function fromBase64Url(value: string) {
  const normalized = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const padding = '='.repeat(
    (4 - (normalized.length % 4)) % 4,
  )
  const binary = atob(normalized + padding)
  const bytes = new Uint8Array(binary.length)

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function randomBase64Url(byteLength = 32) {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return toBase64Url(bytes)
}

async function deriveCookieKey(secret: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(secret),
  )

  return crypto.subtle.importKey(
    'raw',
    digest,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
}

export function constantTimeEqual(
  left: string,
  right: string,
) {
  const leftBytes = new TextEncoder().encode(left)
  const rightBytes = new TextEncoder().encode(right)
  const maxLength = Math.max(
    leftBytes.length,
    rightBytes.length,
  )
  let difference =
    leftBytes.length ^ rightBytes.length

  for (
    let index = 0;
    index < maxLength;
    index += 1
  ) {
    difference |=
      (leftBytes[index] ?? 0) ^
      (rightBytes[index] ?? 0)
  }

  return difference === 0
}

export function createOAuthTransaction(
  input: {
    redirectUri: string
    returnTo: string
    deviceKey?: string
  },
  now: Date = new Date(),
): OAuthTransaction {
  return {
    formatVersion: '1.0',
    state: randomBase64Url(),
    nonce: randomBase64Url(),
    codeVerifier: randomBase64Url(48),
    redirectUri: input.redirectUri,
    returnTo: input.returnTo,
    deviceKey:
      input.deviceKey ?? randomBase64Url(),
    createdAt: now.toISOString(),
    expiresAt: new Date(
      now.getTime() +
        OAUTH_TRANSACTION_DURATION_MS,
    ).toISOString(),
  }
}

export async function createPkceCodeChallenge(
  codeVerifier: string,
) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(codeVerifier),
  )

  return toBase64Url(new Uint8Array(digest))
}

export async function sealOAuthTransaction(
  transaction: OAuthTransaction,
  secret: string,
) {
  const iv = new Uint8Array(12)
  crypto.getRandomValues(iv)
  const key = await deriveCookieKey(secret)
  const plaintext = new TextEncoder().encode(
    JSON.stringify(transaction),
  )
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: new TextEncoder().encode(
        OAUTH_COOKIE_AAD,
      ),
    },
    key,
    plaintext,
  )

  return `v1.${toBase64Url(iv)}.${toBase64Url(
    new Uint8Array(encrypted),
  )}`
}

function isOAuthTransaction(
  value: unknown,
): value is OAuthTransaction {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return false
  }

  const transaction = value as Record<
    string,
    unknown
  >

  return (
    transaction.formatVersion === '1.0' &&
    typeof transaction.state === 'string' &&
    transaction.state.length >= 32 &&
    typeof transaction.nonce === 'string' &&
    transaction.nonce.length >= 32 &&
    typeof transaction.codeVerifier === 'string' &&
    transaction.codeVerifier.length >= 43 &&
    typeof transaction.redirectUri === 'string' &&
    typeof transaction.returnTo === 'string' &&
    typeof transaction.deviceKey === 'string' &&
    transaction.deviceKey.length >= 32 &&
    typeof transaction.createdAt === 'string' &&
    !Number.isNaN(
      Date.parse(transaction.createdAt),
    ) &&
    typeof transaction.expiresAt === 'string' &&
    !Number.isNaN(
      Date.parse(transaction.expiresAt),
    )
  )
}

export async function openOAuthTransaction(
  value: string,
  secret: string,
  now: Date = new Date(),
) {
  const [version, encodedIv, encodedCiphertext] =
    value.split('.')

  if (
    version !== 'v1' ||
    !encodedIv ||
    !encodedCiphertext
  ) {
    return null
  }

  try {
    const key = await deriveCookieKey(secret)
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: fromBase64Url(encodedIv),
        additionalData: new TextEncoder().encode(
          OAUTH_COOKIE_AAD,
        ),
      },
      key,
      fromBase64Url(encodedCiphertext),
    )
    const parsed = JSON.parse(
      new TextDecoder().decode(plaintext),
    ) as unknown

    if (
      !isOAuthTransaction(parsed) ||
      now.getTime() >=
        Date.parse(parsed.expiresAt)
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function createCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
) {
  return [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ].join('; ')
}

export function createOAuthTransactionCookie(
  value: string,
) {
  return createCookie(
    OAUTH_TRANSACTION_COOKIE_NAME,
    value,
    Math.floor(
      OAUTH_TRANSACTION_DURATION_MS / 1_000,
    ),
  )
}

export function createExpiredOAuthTransactionCookie() {
  return createCookie(
    OAUTH_TRANSACTION_COOKIE_NAME,
    '',
    0,
  )
}

export function createDeviceCookie(
  deviceKey: string,
) {
  return createCookie(
    DEVICE_COOKIE_NAME,
    deviceKey,
    DEVICE_COOKIE_MAX_AGE_SECONDS,
  )
}

export function readCookie(
  cookieHeader: string | null,
  name: string,
) {
  if (!cookieHeader) {
    return null
  }

  for (const part of cookieHeader.split(';')) {
    const [candidateName, ...valueParts] =
      part.trim().split('=')

    if (candidateName === name) {
      const value = valueParts.join('=').trim()
      return value || null
    }
  }

  return null
}
