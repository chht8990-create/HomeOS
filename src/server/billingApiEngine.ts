import {
  hashPurchaseToken,
  isPremiumBillingState,
  reconcileGooglePlayEntitlement,
} from './businessEngine.js'
import {
  acknowledgeGooglePlaySubscription,
  GooglePlayBillingError,
  parseBillingRestoreRequest,
  parseBillingVerificationRequest,
  parseGooglePlayBillingConfig,
  verifyGooglePlaySubscription,
  type GooglePlayBillingEnvironment,
} from './googlePlayBillingEngine.js'
import {
  loadAuthContext,
  type ServerApiDependencies,
} from './serverApiEngine.js'
import type {
  ServerBillingPurchase,
  ServerBusinessRepository,
  VerifiedGooglePlaySubscription,
} from '../types/business'
import type { ServerEntitlement } from '../types/serverIdentity.js'

const MAX_BILLING_REQUEST_BYTES = 100_000

export type BillingApiDependencies = {
  identity: ServerApiDependencies
  business: ServerBusinessRepository
  environment: GooglePlayBillingEnvironment
  fetcher?: typeof fetch
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

async function readJson(request: Request) {
  const contentType =
    request.headers.get('content-type') ?? ''

  if (
    !contentType
      .toLowerCase()
      .startsWith('application/json')
  ) {
    return null
  }

  const text = await request.text()

  if (
    new TextEncoder().encode(text).length >
    MAX_BILLING_REQUEST_BYTES
  ) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function toClientEntitlement(
  entitlement: ServerEntitlement,
) {
  return {
    plan: entitlement.plan,
    trialStartedAt: entitlement.trialStartedAt,
    trialEndsAt: entitlement.trialEndsAt,
    premiumExpiresAt: entitlement.premiumExpiresAt,
    usage: { ...entitlement.usage },
    updatedAt: entitlement.updatedAt,
  }
}

async function persistVerifiedPurchase(
  userId: string,
  purchase: VerifiedGooglePlaySubscription,
  dependencies: BillingApiDependencies,
) {
  const existing =
    await dependencies.business.findBillingPurchaseByTokenHash(
      purchase.purchaseTokenHash,
    )

  if (existing && existing.userId !== userId) {
    throw new GooglePlayBillingError(
      'PURCHASE_ALREADY_OWNED',
      409,
    )
  }

  if (purchase.linkedPurchaseTokenHash) {
    const linked =
      await dependencies.business.findBillingPurchaseByTokenHash(
        purchase.linkedPurchaseTokenHash,
      )

    if (linked && linked.userId !== userId) {
      throw new GooglePlayBillingError(
        'PURCHASE_ALREADY_OWNED',
        409,
      )
    }
  }

  const now = (dependencies.now?.() ?? new Date())
    .toISOString()
  const stored: ServerBillingPurchase = {
    ...purchase,
    userId,
    verifiedAt: now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  return dependencies.business.saveBillingPurchase(stored)
}

async function verifyAndStore(
  userId: string,
  purchaseToken: string,
  dependencies: BillingApiDependencies,
) {
  const config = parseGooglePlayBillingConfig(
    dependencies.environment,
  )

  if (!config) {
    throw new GooglePlayBillingError(
      'BILLING_NOT_CONFIGURED',
      503,
    )
  }

  const tokenHash = await hashPurchaseToken(purchaseToken)
  const existing =
    await dependencies.business.findBillingPurchaseByTokenHash(
      tokenHash,
    )

  if (existing && existing.userId !== userId) {
    throw new GooglePlayBillingError(
      'PURCHASE_ALREADY_OWNED',
      409,
    )
  }

  const purchase = await verifyGooglePlaySubscription(
    purchaseToken,
    config,
    {
      fetcher: dependencies.fetcher,
      now: dependencies.now?.(),
    },
  )
  await persistVerifiedPurchase(
    userId,
    purchase,
    dependencies,
  )

  return { purchase, config }
}

function billingErrorResponse(error: unknown) {
  if (error instanceof GooglePlayBillingError) {
    const messages: Record<string, string> = {
      BILLING_NOT_CONFIGURED:
        'Google Play 구매 확인을 준비하고 있어요.',
      BILLING_AUTH_FAILED:
        'Google Play 연결을 확인하지 못했어요.',
      BILLING_VERIFY_FAILED:
        '구매 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',
      PURCHASE_INVALID:
        '유효한 구독 구매를 확인하지 못했어요.',
      PURCHASE_ALREADY_OWNED:
        '이 구매는 다른 계정에 이미 연결되어 있어요.',
      BILLING_ACKNOWLEDGE_FAILED:
        '구매 승인을 완료하지 못했어요. 잠시 후 다시 확인해 주세요.',
    }

    return jsonResponse(
      {
        code: error.code,
        message:
          messages[error.code] ??
          '구매 상태를 확인하지 못했어요.',
      },
      error.status,
    )
  }

  return jsonResponse(
    {
      code: 'BILLING_INTERNAL_ERROR',
      message:
        '구매 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',
    },
    500,
  )
}

async function reconcilePremiumEntitlement(
  context: NonNullable<
    Awaited<ReturnType<typeof loadAuthContext>>
  >,
  dependencies: BillingApiDependencies,
) {
  const purchases =
    await dependencies.business.findBillingPurchasesByUserId(
      context.user.id,
    )
  const entitlement = reconcileGooglePlayEntitlement(
    context.entitlement,
    purchases,
    dependencies.now?.(),
  )

  if (entitlement.version === context.entitlement.version) {
    return context.entitlement
  }

  return dependencies.identity.repository.saveEntitlement(
    entitlement,
    context.entitlement.version,
  )
}

export async function handleBillingVerify(
  request: Request,
  dependencies?: BillingApiDependencies,
) {
  if (request.method !== 'POST') {
    return jsonResponse(
      { code: 'METHOD_NOT_ALLOWED' },
      405,
    )
  }

  if (!hasTrustedMutationOrigin(request)) {
    return jsonResponse({ code: 'CSRF_REJECTED' }, 403)
  }

  if (!dependencies) {
    return jsonResponse(
      { code: 'BILLING_NOT_CONFIGURED' },
      503,
    )
  }

  const context = await loadAuthContext(
    request,
    dependencies.identity,
  )

  if (!context) {
    return jsonResponse({ code: 'AUTH_REQUIRED' }, 401)
  }

  const input = parseBillingVerificationRequest(
    await readJson(request),
  )

  if (!input) {
    return jsonResponse(
      { code: 'BILLING_REQUEST_INVALID' },
      400,
    )
  }

  try {
    const { purchase, config } = await verifyAndStore(
      context.user.id,
      input.purchaseToken,
      dependencies,
    )
    let acknowledged =
      purchase.acknowledgementState === 'ACKNOWLEDGED'

    if (
      !acknowledged &&
      isPremiumBillingState(
        purchase.state,
        purchase.expiresAt,
        dependencies.now?.(),
      )
    ) {
      acknowledged =
        await acknowledgeGooglePlaySubscription(
          input.purchaseToken,
          purchase,
          config,
          {
            fetcher: dependencies.fetcher,
            now: dependencies.now?.(),
          },
        )

      if (acknowledged) {
        await persistVerifiedPurchase(
          context.user.id,
          {
            ...purchase,
            acknowledgementState: 'ACKNOWLEDGED',
          },
          dependencies,
        )
      }
    }

    const entitlement = await reconcilePremiumEntitlement(
      context,
      dependencies,
    )

    return jsonResponse({
      verified: true,
      granted: entitlement.plan === 'PREMIUM',
      acknowledged,
      productId: purchase.productId,
      purchaseState: purchase.state,
      entitlement: toClientEntitlement(entitlement),
    })
  } catch (error) {
    return billingErrorResponse(error)
  }
}

export async function handleBillingRestore(
  request: Request,
  dependencies?: BillingApiDependencies,
) {
  if (request.method !== 'POST') {
    return jsonResponse(
      { code: 'METHOD_NOT_ALLOWED' },
      405,
    )
  }

  if (!hasTrustedMutationOrigin(request)) {
    return jsonResponse({ code: 'CSRF_REJECTED' }, 403)
  }

  if (!dependencies) {
    return jsonResponse(
      { code: 'BILLING_NOT_CONFIGURED' },
      503,
    )
  }

  const context = await loadAuthContext(
    request,
    dependencies.identity,
  )

  if (!context) {
    return jsonResponse({ code: 'AUTH_REQUIRED' }, 401)
  }

  const input = parseBillingRestoreRequest(
    await readJson(request),
  )

  if (!input) {
    return jsonResponse(
      { code: 'BILLING_RESTORE_REQUEST_INVALID' },
      400,
    )
  }

  try {
    const purchases: VerifiedGooglePlaySubscription[] = []

    for (const purchaseToken of input.purchaseTokens) {
      const verified = await verifyAndStore(
        context.user.id,
        purchaseToken,
        dependencies,
      )
      let purchase = verified.purchase

      if (
        purchase.acknowledgementState === 'PENDING' &&
        isPremiumBillingState(
          purchase.state,
          purchase.expiresAt,
          dependencies.now?.(),
        )
      ) {
        await acknowledgeGooglePlaySubscription(
          purchaseToken,
          purchase,
          verified.config,
          {
            fetcher: dependencies.fetcher,
            now: dependencies.now?.(),
          },
        )
        purchase = {
          ...purchase,
          acknowledgementState: 'ACKNOWLEDGED',
        }
        await persistVerifiedPurchase(
          context.user.id,
          purchase,
          dependencies,
        )
      }

      purchases.push(purchase)
    }

    const entitlement = await reconcilePremiumEntitlement(
      context,
      dependencies,
    )

    return jsonResponse({
      restored: purchases.length,
      granted: entitlement.plan === 'PREMIUM',
      entitlement: toClientEntitlement(entitlement),
    })
  } catch (error) {
    return billingErrorResponse(error)
  }
}
