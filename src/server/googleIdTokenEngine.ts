import type {
  GoogleIdTokenVerification,
} from '../types/googleOAuth'

const GOOGLE_JWKS_URL =
  'https://www.googleapis.com/oauth2/v3/certs'
const GOOGLE_ISSUERS = new Set([
  'https://accounts.google.com',
  'accounts.google.com',
])
const CLOCK_SKEW_SECONDS = 60
const DEFAULT_JWKS_CACHE_MS = 60 * 60 * 1_000

type GoogleJwk = JsonWebKey & {
  kid: string
  kty: 'RSA'
}

type GoogleIdTokenHeader = {
  alg: string
  kid: string
  typ?: string
}

type GoogleIdTokenClaims = {
  iss: string
  sub: string
  aud: string | string[]
  azp?: string
  exp: number
  iat: number
  nonce: string
  email: string
  email_verified: boolean
  name?: string
  picture?: string
}

type JwksCache = {
  expiresAt: number
  keys: GoogleJwk[]
}

let jwksCache: JwksCache | null = null

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

function parseJwtPart(value: string) {
  return JSON.parse(
    new TextDecoder().decode(fromBase64Url(value)),
  ) as unknown
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

function parseHeader(
  value: unknown,
): GoogleIdTokenHeader | null {
  if (
    !isRecord(value) ||
    value.alg !== 'RS256' ||
    typeof value.kid !== 'string' ||
    !value.kid
  ) {
    return null
  }

  return {
    alg: 'RS256',
    kid: value.kid,
    ...(typeof value.typ === 'string'
      ? { typ: value.typ }
      : {}),
  }
}

function parseClaims(
  value: unknown,
): GoogleIdTokenClaims | null {
  if (
    !isRecord(value) ||
    typeof value.iss !== 'string' ||
    typeof value.sub !== 'string' ||
    !value.sub ||
    value.sub.length > 255 ||
    !(
      typeof value.aud === 'string' ||
      (Array.isArray(value.aud) &&
        value.aud.every(
          (audience) =>
            typeof audience === 'string',
        ))
    ) ||
    typeof value.exp !== 'number' ||
    !Number.isInteger(value.exp) ||
    typeof value.iat !== 'number' ||
    !Number.isInteger(value.iat) ||
    typeof value.nonce !== 'string' ||
    !value.nonce ||
    typeof value.email !== 'string' ||
    !value.email ||
    value.email_verified !== true ||
    (value.azp !== undefined &&
      typeof value.azp !== 'string') ||
    (value.name !== undefined &&
      typeof value.name !== 'string') ||
    (value.picture !== undefined &&
      typeof value.picture !== 'string')
  ) {
    return null
  }

  return {
    iss: value.iss,
    sub: value.sub,
    aud: value.aud,
    ...(typeof value.azp === 'string'
      ? { azp: value.azp }
      : {}),
    exp: value.exp,
    iat: value.iat,
    nonce: value.nonce,
    email: value.email,
    email_verified: true,
    ...(typeof value.name === 'string'
      ? { name: value.name }
      : {}),
    ...(typeof value.picture === 'string'
      ? { picture: value.picture }
      : {}),
  }
}

function parseCacheDuration(
  cacheControl: string | null,
) {
  const match = cacheControl?.match(
    /(?:^|,)\s*max-age=(\d+)/i,
  )
  const maxAge = match ? Number(match[1]) : NaN

  return Number.isFinite(maxAge)
    ? maxAge * 1_000
    : DEFAULT_JWKS_CACHE_MS
}

async function fetchGoogleJwks(
  fetcher: typeof fetch,
  now: Date,
) {
  if (
    jwksCache &&
    now.getTime() < jwksCache.expiresAt
  ) {
    return jwksCache.keys
  }

  const response = await fetcher(GOOGLE_JWKS_URL, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
  })

  if (!response.ok) {
    throw new Error('GOOGLE_JWKS_UNAVAILABLE')
  }

  const payload = (await response.json()) as unknown

  if (
    !isRecord(payload) ||
    !Array.isArray(payload.keys)
  ) {
    throw new Error('GOOGLE_JWKS_INVALID')
  }

  const keys = payload.keys.filter(
    (key): key is GoogleJwk =>
      isRecord(key) &&
      key.kty === 'RSA' &&
      typeof key.kid === 'string',
  )

  if (keys.length === 0) {
    throw new Error('GOOGLE_JWKS_INVALID')
  }

  jwksCache = {
    keys,
    expiresAt:
      now.getTime() +
      parseCacheDuration(
        response.headers.get('cache-control'),
      ),
  }

  return keys
}

function audienceMatches(
  claims: GoogleIdTokenClaims,
  clientId: string,
) {
  if (typeof claims.aud === 'string') {
    return claims.aud === clientId
  }

  return (
    claims.aud.includes(clientId) &&
    claims.azp === clientId
  )
}

function safePictureUrl(value: string | undefined) {
  if (!value) {
    return undefined
  }

  try {
    const url = new URL(value)
    return url.protocol === 'https:'
      ? url.toString()
      : undefined
  } catch {
    return undefined
  }
}

export async function verifyGoogleIdToken(
  idToken: string,
  input: {
    clientId: string
    nonce: string
    now?: Date
    fetcher?: typeof fetch
  },
): Promise<GoogleIdTokenVerification> {
  const parts = idToken.split('.')

  if (parts.length !== 3) {
    throw new Error('GOOGLE_ID_TOKEN_INVALID')
  }

  const [encodedHeader, encodedClaims, signature] =
    parts
  const header = parseHeader(
    parseJwtPart(encodedHeader),
  )
  const claims = parseClaims(
    parseJwtPart(encodedClaims),
  )

  if (!header || !claims) {
    throw new Error('GOOGLE_ID_TOKEN_INVALID')
  }

  const now = input.now ?? new Date()
  const nowSeconds = Math.floor(now.getTime() / 1_000)

  if (
    !GOOGLE_ISSUERS.has(claims.iss) ||
    !audienceMatches(claims, input.clientId) ||
    claims.exp <= nowSeconds - CLOCK_SKEW_SECONDS ||
    claims.iat >
      nowSeconds + CLOCK_SKEW_SECONDS ||
    claims.nonce !== input.nonce
  ) {
    throw new Error(
      'GOOGLE_ID_TOKEN_CLAIMS_INVALID',
    )
  }

  let keys = await fetchGoogleJwks(
    input.fetcher ?? fetch,
    now,
  )
  let jwk = keys.find(
    (candidate) => candidate.kid === header.kid,
  )

  if (!jwk) {
    jwksCache = null
    keys = await fetchGoogleJwks(
      input.fetcher ?? fetch,
      now,
    )
    jwk = keys.find(
      (candidate) =>
        candidate.kid === header.kid,
    )

    if (!jwk) {
      throw new Error(
        'GOOGLE_SIGNING_KEY_NOT_FOUND',
      )
    }
  }

  const publicKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify'],
  )
  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    fromBase64Url(signature),
    new TextEncoder().encode(
      `${encodedHeader}.${encodedClaims}`,
    ),
  )

  if (!verified) {
    throw new Error(
      'GOOGLE_ID_TOKEN_SIGNATURE_INVALID',
    )
  }

  const picture = safePictureUrl(claims.picture)

  return {
    identity: {
      subject: claims.sub,
      email: claims.email,
      emailVerified: true,
      displayName:
        claims.name?.trim() ||
        claims.email.split('@')[0],
      ...(picture ? { avatarUrl: picture } : {}),
    },
    expiresAt: new Date(
      claims.exp * 1_000,
    ).toISOString(),
  }
}

export function clearGoogleJwksCacheForTests() {
  jwksCache = null
}
