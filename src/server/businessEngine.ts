import type {
  AiOperationKind,
  BillingAcknowledgementState,
  BillingPurchaseState,
  ServerAiUsageEvent,
  VerifiedGooglePlaySubscription,
} from '../types/business.js'
import type { ServerEntitlement } from '../types/serverIdentity.js'

const DEFAULT_AI_PRICING_USD_PER_MILLION = {
  'gpt-5.6-sol': { input: 5, output: 30 },
  'gpt-5.6': { input: 5, output: 30 },
  'gpt-5.6-terra': { input: 2.5, output: 15 },
  'gpt-5.6-luna': { input: 1, output: 6 },
} as const
const AI_CACHE_SCHEMA_VERSION = 'r5-v1'
const AI_CACHE_VOLATILE_KEYS = new Set([
  'traceId',
  'requestId',
])

type GoogleSubscriptionLineItem = {
  productId?: unknown
  expiryTime?: unknown
  autoRenewingPlan?: {
    autoRenewEnabled?: unknown
  }
  offerDetails?: {
    basePlanId?: unknown
  }
}

type GoogleSubscriptionPurchase = {
  subscriptionState?: unknown
  acknowledgementState?: unknown
  startTime?: unknown
  latestOrderId?: unknown
  linkedPurchaseToken?: unknown
  testPurchase?: unknown
  lineItems?: unknown
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

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    !Number.isNaN(Date.parse(value))
  )
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

export async function hashPurchaseToken(
  purchaseToken: string,
) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(purchaseToken),
  )

  return toBase64Url(new Uint8Array(digest))
}

export function normalizeBillingPurchaseState(
  value: unknown,
): BillingPurchaseState {
  switch (value) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
      return 'ACTIVE'
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      return 'GRACE_PERIOD'
    case 'SUBSCRIPTION_STATE_PAUSED':
      return 'PAUSED'
    case 'SUBSCRIPTION_STATE_ON_HOLD':
      return 'ON_HOLD'
    case 'SUBSCRIPTION_STATE_CANCELED':
      return 'CANCELED'
    case 'SUBSCRIPTION_STATE_EXPIRED':
      return 'EXPIRED'
    case 'SUBSCRIPTION_STATE_PENDING':
    case 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED':
      return 'PENDING'
    default:
      return 'INVALID'
  }
}

export function normalizeBillingAcknowledgementState(
  value: unknown,
): BillingAcknowledgementState {
  if (value === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED') {
    return 'ACKNOWLEDGED'
  }

  if (value === 'ACKNOWLEDGEMENT_STATE_PENDING') {
    return 'PENDING'
  }

  return 'UNKNOWN'
}

export function isPremiumBillingState(
  state: BillingPurchaseState,
  expiresAt: string | null,
  now: Date | string = new Date(),
) {
  if (
    state !== 'ACTIVE' &&
    state !== 'GRACE_PERIOD' &&
    state !== 'CANCELED'
  ) {
    return false
  }

  if (!expiresAt) {
    return state !== 'CANCELED'
  }

  const currentDate =
    now instanceof Date ? now : new Date(now)
  const expiryDate = new Date(expiresAt)

  return (
    !Number.isNaN(currentDate.getTime()) &&
    !Number.isNaN(expiryDate.getTime()) &&
    expiryDate.getTime() > currentDate.getTime()
  )
}

export function parseGooglePlaySubscription(
  value: unknown,
  input: {
    purchaseTokenHash: string
    packageName: string
    allowedProductIds: readonly string[]
  },
): VerifiedGooglePlaySubscription | null {
  if (!isRecord(value)) {
    return null
  }

  const purchase = value as GoogleSubscriptionPurchase

  if (
    !Array.isArray(purchase.lineItems) ||
    purchase.lineItems.length === 0 ||
    !isIsoDate(purchase.startTime)
  ) {
    return null
  }

  const lineItems = purchase.lineItems.filter(
    (lineItem): lineItem is GoogleSubscriptionLineItem =>
      isRecord(lineItem),
  )
  const allowedLineItem = lineItems.find(
    (lineItem) =>
      typeof lineItem.productId === 'string' &&
      input.allowedProductIds.includes(
        lineItem.productId,
      ),
  )

  if (!allowedLineItem) {
    return null
  }

  const expiryTimes = lineItems
    .filter(
      (lineItem) =>
        lineItem.productId ===
        allowedLineItem.productId,
    )
    .map((lineItem) => lineItem.expiryTime)
    .filter(isIsoDate)
    .sort(
      (left, right) =>
        Date.parse(right) - Date.parse(left),
    )
  const basePlanId = isRecord(
    allowedLineItem.offerDetails,
  )
    ? allowedLineItem.offerDetails.basePlanId
    : null

  if (!expiryTimes[0]) {
    return null
  }

  return {
    purchaseTokenHash: input.purchaseTokenHash,
    packageName: input.packageName,
    productId: allowedLineItem.productId as string,
    basePlanId:
      typeof basePlanId === 'string'
        ? basePlanId
        : null,
    orderId:
      typeof purchase.latestOrderId === 'string'
        ? purchase.latestOrderId
        : null,
    state: normalizeBillingPurchaseState(
      purchase.subscriptionState,
    ),
    acknowledgementState:
      normalizeBillingAcknowledgementState(
        purchase.acknowledgementState,
      ),
    startAt: purchase.startTime as string,
    expiresAt: expiryTimes[0],
    linkedPurchaseTokenHash: null,
    testPurchase: isRecord(purchase.testPurchase),
  }
}

export function applyVerifiedPurchaseToEntitlement(
  entitlement: ServerEntitlement,
  purchase: VerifiedGooglePlaySubscription,
  now: Date | string = new Date(),
) {
  const currentDate =
    now instanceof Date ? now : new Date(now)

  if (
    !isPremiumBillingState(
      purchase.state,
      purchase.expiresAt,
      currentDate,
    )
  ) {
    return {
      granted: false,
      entitlement: {
        ...entitlement,
        usage: { ...entitlement.usage },
      },
    }
  }

  if (
    entitlement.plan === 'PREMIUM' &&
    entitlement.source === 'google-play' &&
    entitlement.premiumExpiresAt === purchase.expiresAt
  ) {
    return {
      granted: true,
      entitlement: {
        ...entitlement,
        usage: { ...entitlement.usage },
      },
    }
  }

  return {
    granted: true,
    entitlement: {
      ...entitlement,
      plan: 'PREMIUM' as const,
      source: 'google-play' as const,
      premiumExpiresAt: purchase.expiresAt,
      version: entitlement.version + 1,
      updatedAt: currentDate.toISOString(),
      usage: { ...entitlement.usage },
    },
  }
}

export function reconcileGooglePlayEntitlement(
  entitlement: ServerEntitlement,
  purchases: readonly VerifiedGooglePlaySubscription[],
  now: Date | string = new Date(),
) {
  const currentDate =
    now instanceof Date ? now : new Date(now)
  const activePurchase = purchases
    .filter(
      (purchase) =>
        purchase.acknowledgementState ===
          'ACKNOWLEDGED' &&
        isPremiumBillingState(
          purchase.state,
          purchase.expiresAt,
          currentDate,
        ),
    )
    .sort(
      (left, right) =>
        Date.parse(right.expiresAt ?? '9999-12-31') -
        Date.parse(left.expiresAt ?? '9999-12-31'),
    )[0]

  if (activePurchase) {
    return applyVerifiedPurchaseToEntitlement(
      entitlement,
      activePurchase,
      currentDate,
    ).entitlement
  }

  if (entitlement.source !== 'google-play') {
    return {
      ...entitlement,
      usage: { ...entitlement.usage },
    }
  }

  return {
    ...entitlement,
    plan: 'FREE' as const,
    source: 'none' as const,
    premiumExpiresAt: null,
    version: entitlement.version + 1,
    updatedAt: currentDate.toISOString(),
    usage: { ...entitlement.usage },
  }
}

export function estimateAiCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  overrides?: {
    inputUsdPerMillion?: number
    outputUsdPerMillion?: number
  },
) {
  const defaultPricing =
    DEFAULT_AI_PRICING_USD_PER_MILLION[
      model as keyof typeof DEFAULT_AI_PRICING_USD_PER_MILLION
    ]
  const inputPrice =
    overrides?.inputUsdPerMillion ??
    defaultPricing?.input ??
    0
  const outputPrice =
    overrides?.outputUsdPerMillion ??
    defaultPricing?.output ??
    0

  return Number(
    (
      (Math.max(0, inputTokens) * inputPrice +
        Math.max(0, outputTokens) * outputPrice) /
      1_000_000
    ).toFixed(8),
  )
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue)
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .filter(
          (key) => !AI_CACHE_VOLATILE_KEYS.has(key),
        )
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    )
  }

  return value
}

export async function createAiCacheKey(
  operation: AiOperationKind,
  model: string,
  input: unknown,
) {
  return hashPurchaseToken(
    JSON.stringify({
      schemaVersion: AI_CACHE_SCHEMA_VERSION,
      operation,
      model,
      input: stableValue(input),
    }),
  )
}

export function createAiUsageEvent(input: {
  id: string
  userId: string
  operation: AiOperationKind
  model: string
  inputTokens?: number | null
  outputTokens?: number | null
  success: boolean
  errorCode?: string | null
  cacheHit?: boolean
  createdAt: string
  inputUsdPerMillion?: number
  outputUsdPerMillion?: number
}): ServerAiUsageEvent {
  const inputTokens = Math.max(
    0,
    Math.trunc(input.inputTokens ?? 0),
  )
  const outputTokens = Math.max(
    0,
    Math.trunc(input.outputTokens ?? 0),
  )

  return {
    id: input.id,
    userId: input.userId,
    operation: input.operation,
    model: input.model,
    inputTokens,
    outputTokens,
    estimatedCostUsd: estimateAiCostUsd(
      input.model,
      inputTokens,
      outputTokens,
      {
        ...(input.inputUsdPerMillion !== undefined
          ? {
              inputUsdPerMillion:
                input.inputUsdPerMillion,
            }
          : {}),
        ...(input.outputUsdPerMillion !== undefined
          ? {
              outputUsdPerMillion:
                input.outputUsdPerMillion,
            }
          : {}),
      },
    ),
    success: input.success,
    errorCode: input.errorCode ?? null,
    cacheHit: input.cacheHit ?? false,
    createdAt: input.createdAt,
  }
}
