import {
  resetAuthSessionCache,
  restoreAuthSession,
} from './authClient'

const GOOGLE_PLAY_PAYMENT_METHOD =
  'https://play.google.com/billing'

export type GooglePlayReplacementMode =
  | 'WITH_TIME_PRORATION'
  | 'CHARGE_PRORATED_PRICE'
  | 'WITHOUT_PRORATION'
  | 'CHARGE_FULL_PRICE'
  | 'DEFERRED'

export type GooglePlayPurchaseResult = {
  purchaseToken: string
  productId: string
  complete?: (
    result: 'success' | 'fail' | 'unknown',
  ) => Promise<void>
}

export type GooglePlayProductDetails = {
  productId: string
  title: string
  description: string
  price: string
}

export type TodayTablePlayBillingBridge = {
  version?: 2
  purchaseSubscription(
    input:
      | string
      | {
          productId: string
          offerToken?: string
        },
  ): Promise<GooglePlayPurchaseResult>
  queryPurchases?(): Promise<GooglePlayPurchaseResult[]>
  restoreSubscriptions?(): Promise<
    GooglePlayPurchaseResult[]
  >
  changeSubscription?(input: {
    productId: string
    oldPurchaseToken: string
    replacementMode: GooglePlayReplacementMode
    offerToken?: string
  }): Promise<GooglePlayPurchaseResult>
  queryProductDetails?(
    productIds: string[],
  ): Promise<GooglePlayProductDetails[]>
}

type DigitalGoodsPurchase = {
  itemId?: unknown
  purchaseToken?: unknown
}

type DigitalGoodsItemDetails = {
  itemId?: unknown
  title?: unknown
  description?: unknown
  price?: {
    value?: unknown
    currency?: unknown
  }
}

type DigitalGoodsService = {
  getDetails(
    itemIds: string[],
  ): Promise<DigitalGoodsItemDetails[]>
  listPurchases(): Promise<DigitalGoodsPurchase[]>
}

declare global {
  interface Window {
    TodayTablePlayBilling?: TodayTablePlayBillingBridge
    getDigitalGoodsService?: (
      paymentMethod: string,
    ) => Promise<DigitalGoodsService>
  }
}

function parsePurchase(
  value: unknown,
): GooglePlayPurchaseResult | null {
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
  const productId =
    typeof record.productId === 'string'
      ? record.productId.trim()
      : typeof record.itemId === 'string'
        ? record.itemId.trim()
        : ''

  if (!purchaseToken || !productId) {
    return null
  }

  return { purchaseToken, productId }
}

async function getDigitalGoodsService() {
  if (
    typeof window === 'undefined' ||
    !window.getDigitalGoodsService
  ) {
    return null
  }

  try {
    return await window.getDigitalGoodsService(
      GOOGLE_PLAY_PAYMENT_METHOD,
    )
  } catch {
    return null
  }
}

async function queryDigitalGoodsPurchases() {
  const service = await getDigitalGoodsService()

  if (!service) {
    throw new Error('GOOGLE_PLAY_BILLING_UNAVAILABLE')
  }

  const purchases = await service.listPurchases()

  return purchases
    .map(parsePurchase)
    .filter(
      (purchase): purchase is GooglePlayPurchaseResult =>
        purchase !== null,
    )
}

async function purchaseWithDigitalGoods(
  productId: string,
): Promise<GooglePlayPurchaseResult> {
  const service = await getDigitalGoodsService()

  if (!service || typeof PaymentRequest === 'undefined') {
    throw new Error('GOOGLE_PLAY_BILLING_UNAVAILABLE')
  }

  const request = new PaymentRequest(
    [
      {
        supportedMethods: GOOGLE_PLAY_PAYMENT_METHOD,
        data: { sku: productId },
      },
    ],
    {
      total: {
        label: productId,
        amount: { currency: 'KRW', value: '0' },
      },
    },
  )
  const response = await request.show()
  const parsed = parsePurchase({
    ...(typeof response.details === 'object' &&
    response.details !== null
      ? response.details
      : {}),
    productId,
  })

  if (!parsed) {
    await response.complete('fail')
    throw new Error('GOOGLE_PLAY_PURCHASE_INVALID')
  }

  return {
    ...parsed,
    complete: (result) => response.complete(result),
  }
}

export function isGooglePlayBillingAvailable() {
  return (
    typeof window !== 'undefined' &&
    Boolean(
      window.TodayTablePlayBilling ||
        (window.getDigitalGoodsService &&
          typeof PaymentRequest !== 'undefined'),
    )
  )
}

async function readResponse<T>(response: Response) {
  const body = (await response.json()) as T & {
    code?: string
  }

  if (!response.ok) {
    throw new Error(body.code ?? 'BILLING_REQUEST_FAILED')
  }

  return body
}

export function getGooglePlayBillingErrorMessage(
  error: unknown,
) {
  const code =
    error instanceof Error ? error.message : ''

  const messages: Record<string, string> = {
    GOOGLE_PLAY_BILLING_UNAVAILABLE:
      'Google Play 설치 앱에서만 구독할 수 있어요.',
    GOOGLE_PLAY_PURCHASE_INVALID:
      '구매 결과를 확인하지 못했어요. 다시 시도해 주세요.',
    SUBSCRIPTION_CHANGE_UNAVAILABLE:
      '현재 설치 환경에서는 구독을 변경할 수 없어요.',
    PURCHASE_ALREADY_OWNED:
      '이 구매는 다른 오늘식탁 계정에 이미 연결되어 있어요.',
    AUTH_REQUIRED:
      'Google 계정으로 로그인한 뒤 다시 시도해 주세요.',
    BILLING_NOT_CONFIGURED:
      'Google Play 구독 설정을 준비하고 있어요.',
    BILLING_VERIFY_FAILED:
      'Google Play에서 구매 상태를 확인하지 못했어요.',
    PURCHASE_INVALID:
      '유효한 Google Play 구독을 찾지 못했어요.',
  }

  return (
    messages[code] ??
    '구독을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'
  )
}

export async function verifyGooglePlayPurchase(
  purchaseToken: string,
) {
  return readResponse<{
    verified: boolean
    granted: boolean
    acknowledged: boolean
    productId: string
    purchaseState: string
    entitlement: {
      plan: 'FREE' | 'TRIAL' | 'PREMIUM'
      premiumExpiresAt: string | null
    }
  }>(
    await fetch('/api/billing/verify', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ purchaseToken }),
    }),
  )
}

export async function restoreGooglePlayPurchases(
  purchaseTokens: string[],
) {
  return readResponse<{
    restored: number
    granted: boolean
    entitlement: {
      plan: 'FREE' | 'TRIAL' | 'PREMIUM'
      premiumExpiresAt: string | null
    }
  }>(
    await fetch('/api/billing/restore', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ purchaseTokens }),
    }),
  )
}

export async function queryGooglePlayPurchases() {
  const bridge = window.TodayTablePlayBilling

  if (bridge?.queryPurchases) {
    return bridge.queryPurchases()
  }

  if (bridge?.restoreSubscriptions) {
    return bridge.restoreSubscriptions()
  }

  return queryDigitalGoodsPurchases()
}

export async function queryGooglePlayProductDetails(
  productIds: string[],
) {
  const bridge = window.TodayTablePlayBilling

  if (bridge?.queryProductDetails) {
    return bridge.queryProductDetails(productIds)
  }

  const service = await getDigitalGoodsService()

  if (!service) {
    throw new Error('GOOGLE_PLAY_BILLING_UNAVAILABLE')
  }

  const details = await service.getDetails(productIds)

  return details.map((detail) => ({
    productId:
      typeof detail.itemId === 'string'
        ? detail.itemId
        : '',
    title:
      typeof detail.title === 'string'
        ? detail.title
        : '',
    description:
      typeof detail.description === 'string'
        ? detail.description
        : '',
    price:
      typeof detail.price?.value === 'string'
        ? `${detail.price.value} ${
            typeof detail.price.currency === 'string'
              ? detail.price.currency
              : ''
          }`.trim()
        : '',
  }))
}

export async function purchasePremiumSubscription(
  productId: string,
  offerToken?: string,
) {
  const bridge = window.TodayTablePlayBilling
  const purchase = bridge
    ? await bridge.purchaseSubscription(
        bridge.version === 2
          ? {
              productId,
              ...(offerToken ? { offerToken } : {}),
            }
          : productId,
      )
    : await purchaseWithDigitalGoods(productId)

  try {
    const verification = await verifyGooglePlayPurchase(
      purchase.purchaseToken,
    )
    await purchase.complete?.('success')
    return verification
  } catch (error) {
    await purchase.complete?.('fail')
    throw error
  }
}

export async function restorePremiumSubscription() {
  const purchases = await queryGooglePlayPurchases()

  if (purchases.length === 0) {
    return {
      restored: 0,
      granted: false,
      entitlement: {
        plan: 'FREE' as const,
        premiumExpiresAt: null,
      },
    }
  }

  return restoreGooglePlayPurchases(
    [
      ...new Set(
        purchases.map(
          (purchase) => purchase.purchaseToken,
        ),
      ),
    ],
  )
}

export async function changePremiumSubscription(input: {
  productId: string
  oldPurchaseToken: string
  replacementMode: GooglePlayReplacementMode
  offerToken?: string
}) {
  const bridge = window.TodayTablePlayBilling

  if (!bridge?.changeSubscription) {
    throw new Error('SUBSCRIPTION_CHANGE_UNAVAILABLE')
  }

  const purchase = await bridge.changeSubscription(input)

  try {
    const verification = await verifyGooglePlayPurchase(
      purchase.purchaseToken,
    )
    await purchase.complete?.('success')
    return verification
  } catch (error) {
    await purchase.complete?.('fail')
    throw error
  }
}

export async function refreshBillingAccount() {
  resetAuthSessionCache()

  return restoreAuthSession({
    storage: window.localStorage,
    sync: true,
  })
}
