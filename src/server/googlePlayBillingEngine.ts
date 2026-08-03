import {
  hashPurchaseToken,
  isPremiumBillingState,
  parseGooglePlaySubscription,
} from './businessEngine.js'
import type {
  VerifiedGooglePlaySubscription,
} from '../types/business.js'

const GOOGLE_OAUTH_TOKEN_URL =
  'https://oauth2.googleapis.com/token'
const GOOGLE_PLAY_API_ORIGIN =
  'https://androidpublisher.googleapis.com'
const ANDROID_PUBLISHER_SCOPE =
  'https://www.googleapis.com/auth/androidpublisher'
const MAX_PURCHASE_TOKEN_LENGTH = 4_000

export type GooglePlayBillingEnvironment = {
  GOOGLE_PLAY_PACKAGE_NAME?: string
  GOOGLE_PLAY_PREMIUM_PRODUCT_IDS?: string
  GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL?: string
  GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY?: string
}

export type GooglePlayBillingConfig = {
  packageName: string
  premiumProductIds: string[]
  serviceAccountEmail: string
  serviceAccountPrivateKey: string
}

export class GooglePlayBillingError extends Error {
  readonly code: string
  readonly status: number

  constructor(
    code: string,
    status: number,
  ) {
    super(code)
    this.code = code
    this.status = status
  }
}

function toBase64Url(value: string | Uint8Array) {
  const bytes =
    typeof value === 'string'
      ? new TextEncoder().encode(value)
      : value
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function parsePrivateKey(pem: string) {
  const normalized = pem
    .replace(/\\n/g, '\n')
    .replace(
      /-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,
      '',
    )

  if (!normalized) {
    throw new GooglePlayBillingError(
      'BILLING_NOT_CONFIGURED',
      503,
    )
  }

  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

async function createServiceAccountAssertion(
  config: GooglePlayBillingConfig,
  now: Date,
) {
  const issuedAt = Math.floor(now.getTime() / 1_000)
  const encodedHeader = toBase64Url(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
  )
  const encodedPayload = toBase64Url(
    JSON.stringify({
      iss: config.serviceAccountEmail,
      scope: ANDROID_PUBLISHER_SCOPE,
      aud: GOOGLE_OAUTH_TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + 3_600,
    }),
  )
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    parsePrivateKey(config.serviceAccountPrivateKey),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signingInput),
  )

  return `${signingInput}.${toBase64Url(
    new Uint8Array(signature),
  )}`
}

export function parseGooglePlayBillingConfig(
  environment: GooglePlayBillingEnvironment,
): GooglePlayBillingConfig | null {
  const packageName =
    environment.GOOGLE_PLAY_PACKAGE_NAME?.trim()
  const serviceAccountEmail =
    environment.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL?.trim()
  const serviceAccountPrivateKey =
    environment.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY?.trim()
  const premiumProductIds = (
    environment.GOOGLE_PLAY_PREMIUM_PRODUCT_IDS ?? ''
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (
    !packageName ||
    !serviceAccountEmail ||
    !serviceAccountPrivateKey ||
    premiumProductIds.length === 0
  ) {
    return null
  }

  return {
    packageName,
    serviceAccountEmail,
    serviceAccountPrivateKey,
    premiumProductIds: [
      ...new Set(premiumProductIds),
    ],
  }
}

export function parseBillingVerificationRequest(
  value: unknown,
) {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return null
  }

  const record = value as Record<string, unknown>
  const purchaseToken =
    typeof record.purchaseToken === 'string'
      ? record.purchaseToken.trim()
      : ''

  if (
    purchaseToken.length < 10 ||
    purchaseToken.length > MAX_PURCHASE_TOKEN_LENGTH
  ) {
    return null
  }

  return { purchaseToken }
}

export function parseBillingRestoreRequest(
  value: unknown,
) {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return null
  }

  const record = value as Record<string, unknown>

  if (
    !Array.isArray(record.purchaseTokens) ||
    record.purchaseTokens.length === 0 ||
    record.purchaseTokens.length > 20
  ) {
    return null
  }

  const purchaseTokens = record.purchaseTokens
    .map((value) =>
      typeof value === 'string' ? value.trim() : '',
    )
    .filter(
      (value) =>
        value.length >= 10 &&
        value.length <= MAX_PURCHASE_TOKEN_LENGTH,
    )

  if (
    purchaseTokens.length !==
    record.purchaseTokens.length
  ) {
    return null
  }

  return {
    purchaseTokens: [...new Set(purchaseTokens)],
  }
}

async function requestAccessToken(
  config: GooglePlayBillingConfig,
  fetcher: typeof fetch,
  now: Date,
) {
  const assertion = await createServiceAccountAssertion(
    config,
    now,
  )
  const response = await fetcher(
    GOOGLE_OAUTH_TOKEN_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type:
          'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    },
  )

  if (!response.ok) {
    throw new GooglePlayBillingError(
      'BILLING_AUTH_FAILED',
      502,
    )
  }

  const body = (await response.json()) as unknown

  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body) ||
    typeof (body as Record<string, unknown>)
      .access_token !== 'string'
  ) {
    throw new GooglePlayBillingError(
      'BILLING_AUTH_FAILED',
      502,
    )
  }

  return (body as { access_token: string })
    .access_token
}

export async function verifyGooglePlaySubscription(
  purchaseToken: string,
  config: GooglePlayBillingConfig,
  options: {
    fetcher?: typeof fetch
    now?: Date
    accessToken?: string
  } = {},
): Promise<VerifiedGooglePlaySubscription> {
  const fetcher = options.fetcher ?? fetch
  const now = options.now ?? new Date()
  const accessToken =
    options.accessToken ??
    (await requestAccessToken(config, fetcher, now))
  const response = await fetcher(
    `${GOOGLE_PLAY_API_ORIGIN}/androidpublisher/v3/applications/${encodeURIComponent(
      config.packageName,
    )}/purchases/subscriptionsv2/tokens/${encodeURIComponent(
      purchaseToken,
    )}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new GooglePlayBillingError(
      response.status === 404
        ? 'PURCHASE_INVALID'
        : 'BILLING_VERIFY_FAILED',
      response.status === 404 ? 400 : 502,
    )
  }

  const rawPurchase = (await response.json()) as unknown
  const purchaseTokenHash = await hashPurchaseToken(
    purchaseToken,
  )
  const parsed = parseGooglePlaySubscription(
    rawPurchase,
    {
      purchaseTokenHash,
      packageName: config.packageName,
      allowedProductIds: config.premiumProductIds,
    },
  )

  if (!parsed || parsed.state === 'INVALID') {
    throw new GooglePlayBillingError(
      'PURCHASE_INVALID',
      400,
    )
  }

  if (
    typeof rawPurchase === 'object' &&
    rawPurchase !== null &&
    !Array.isArray(rawPurchase) &&
    typeof (
      rawPurchase as Record<string, unknown>
    ).linkedPurchaseToken === 'string'
  ) {
    parsed.linkedPurchaseTokenHash =
      await hashPurchaseToken(
        (
          rawPurchase as Record<string, string>
        ).linkedPurchaseToken,
      )
  }

  return parsed
}

export async function acknowledgeGooglePlaySubscription(
  purchaseToken: string,
  purchase: VerifiedGooglePlaySubscription,
  config: GooglePlayBillingConfig,
  options: {
    fetcher?: typeof fetch
    now?: Date
    accessToken?: string
  } = {},
) {
  if (
    purchase.acknowledgementState !== 'PENDING' ||
    !isPremiumBillingState(
      purchase.state,
      purchase.expiresAt,
      options.now,
    )
  ) {
    return false
  }

  const fetcher = options.fetcher ?? fetch
  const accessToken =
    options.accessToken ??
    (await requestAccessToken(
      config,
      fetcher,
      options.now ?? new Date(),
    ))
  const response = await fetcher(
    `${GOOGLE_PLAY_API_ORIGIN}/androidpublisher/v3/applications/${encodeURIComponent(
      config.packageName,
    )}/purchases/subscriptions/${encodeURIComponent(
      purchase.productId,
    )}/tokens/${encodeURIComponent(
      purchaseToken,
    )}:acknowledge`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    },
  )

  if (!response.ok) {
    throw new GooglePlayBillingError(
      'BILLING_ACKNOWLEDGE_FAILED',
      502,
    )
  }

  return true
}
