import type { AiAccessPlan } from './aiAccess.js'

export type AiOperationKind =
  | 'mealPlan'
  | 'recipe'
  | 'recommendation'

export type BillingPurchaseState =
  | 'PENDING'
  | 'ACTIVE'
  | 'GRACE_PERIOD'
  | 'PAUSED'
  | 'ON_HOLD'
  | 'CANCELED'
  | 'EXPIRED'
  | 'INVALID'

export type BillingAcknowledgementState =
  | 'PENDING'
  | 'ACKNOWLEDGED'
  | 'UNKNOWN'

export type VerifiedGooglePlaySubscription = {
  purchaseTokenHash: string
  packageName: string
  productId: string
  basePlanId: string | null
  orderId: string | null
  state: BillingPurchaseState
  acknowledgementState: BillingAcknowledgementState
  startAt: string
  expiresAt: string | null
  linkedPurchaseTokenHash: string | null
  testPurchase: boolean
}

export type ServerBillingPurchase =
  VerifiedGooglePlaySubscription & {
    userId: string
    verifiedAt: string
    createdAt: string
    updatedAt: string
  }

export type ServerAiUsageEvent = {
  id: string
  userId: string
  operation: AiOperationKind
  model: string
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
  success: boolean
  errorCode: string | null
  cacheHit: boolean
  createdAt: string
}

export type ServerAiResultCache = {
  userId: string
  operation: AiOperationKind
  cacheKey: string
  model: string
  response: unknown
  inputTokens: number
  outputTokens: number
  createdAt: string
  expiresAt: string
}

export type ServerRuntimeSetting = {
  key: string
  value: unknown
  updatedBy: string
  updatedAt: string
}

export type AdminUserSummary = {
  userId: string
  plan: AiAccessPlan
  trialEndsAt: string | null
  premiumExpiresAt: string | null
  deviceCount: number
  lastLoginAt: string | null
  mealPlanCount: number
  recipeCount: number
  recommendationCount: number
  estimatedCostUsd: number
}

export type AdminDashboardSummary = {
  generatedAt: string
  subscribers: number
  plans: Record<AiAccessPlan, number>
  aiEnabled: boolean
  todayAiCalls: number
  todayEstimatedCostUsd: number
  monthEstimatedCostUsd: number
  todayErrors: number
  feedbackCount: number
  billing: {
    active: number
    expired: number
    pending: number
    canceled: number
    onHold: number
    paused: number
  }
  system: {
    openAi: boolean
    database: boolean
    oauth: boolean
    billing: boolean
  }
  users: AdminUserSummary[]
}

export type ServerBusinessRepository = {
  findBillingPurchaseByTokenHash(
    purchaseTokenHash: string,
  ): Promise<ServerBillingPurchase | null>
  findBillingPurchasesByUserId(
    userId: string,
  ): Promise<ServerBillingPurchase[]>
  saveBillingPurchase(
    purchase: ServerBillingPurchase,
  ): Promise<ServerBillingPurchase>
  saveAiUsageEvent(
    event: ServerAiUsageEvent,
  ): Promise<void>
  findAiResultCache(
    userId: string,
    operation: AiOperationKind,
    cacheKey: string,
    now: string,
  ): Promise<ServerAiResultCache | null>
  saveAiResultCache(
    cache: ServerAiResultCache,
  ): Promise<void>
  saveAiResultCacheWithUsage?(
    cache: ServerAiResultCache,
    event: ServerAiUsageEvent,
  ): Promise<void>
  findRuntimeSetting(
    key: string,
  ): Promise<ServerRuntimeSetting | null>
  saveRuntimeSetting(
    setting: ServerRuntimeSetting,
  ): Promise<ServerRuntimeSetting>
  recordFeedbackEvent(input: {
    id: string
    category: string
    success: boolean
    createdAt: string
  }): Promise<void>
  getAdminDashboardSummary(
    now: string,
    limit: number,
  ): Promise<AdminDashboardSummary>
}
