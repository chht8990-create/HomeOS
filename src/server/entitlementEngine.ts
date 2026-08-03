import { AI_TRIAL_DURATION_DAYS } from '../services/aiAccessEngine.js'
import type { AiGenerationKind } from '../types/aiAccess.js'
import type { ServerEntitlement } from '../types/serverIdentity.js'

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1_000

function toDate(value: Date | string | null) {
  if (value === null) {
    return null
  }

  const date =
    value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

export function createServerEntitlement(
  userId: string,
  now: Date | string = new Date(),
): ServerEntitlement {
  const createdAt = toDate(now) ?? new Date()

  return {
    userId,
    plan: 'FREE',
    source: 'none',
    trialStartedAt: null,
    trialEndsAt: null,
    trialConsumedAt: null,
    premiumExpiresAt: null,
    usage: {
      mealPlanCount: 0,
      recipeCount: 0,
      recommendationCount: 0,
      lastGenerationAt: null,
    },
    version: 0,
    updatedAt: createdAt.toISOString(),
  }
}

export function startTrialAfterGoogleLogin(
  entitlement: ServerEntitlement,
  now: Date | string = new Date(),
  trialDurationDays = AI_TRIAL_DURATION_DAYS,
) {
  if (
    entitlement.plan === 'PREMIUM' ||
    entitlement.trialConsumedAt
  ) {
    return {
      started: false,
      entitlement: {
        ...entitlement,
        usage: { ...entitlement.usage },
      },
    }
  }

  const startedAt = toDate(now) ?? new Date()
  const safeDurationDays =
    Number.isInteger(trialDurationDays) &&
    trialDurationDays > 0
      ? trialDurationDays
      : AI_TRIAL_DURATION_DAYS
  const endsAt = new Date(
    startedAt.getTime() +
      safeDurationDays * MILLISECONDS_PER_DAY,
  )

  return {
    started: true,
    entitlement: {
      ...entitlement,
      plan: 'TRIAL' as const,
      source: 'trial' as const,
      trialStartedAt: startedAt.toISOString(),
      trialEndsAt: endsAt.toISOString(),
      trialConsumedAt: startedAt.toISOString(),
      version: entitlement.version + 1,
      updatedAt: startedAt.toISOString(),
      usage: { ...entitlement.usage },
    },
  }
}

export function resolveServerEntitlement(
  entitlement: ServerEntitlement,
  now: Date | string = new Date(),
): ServerEntitlement {
  const currentDate = toDate(now) ?? new Date()

  if (
    entitlement.plan === 'PREMIUM' &&
    entitlement.source === 'google-play' &&
    entitlement.premiumExpiresAt
  ) {
    const premiumExpiresAt = toDate(
      entitlement.premiumExpiresAt,
    )

    if (
      !premiumExpiresAt ||
      currentDate.getTime() >= premiumExpiresAt.getTime()
    ) {
      return {
        ...entitlement,
        plan: 'FREE',
        source: 'none',
        premiumExpiresAt: null,
        version: entitlement.version + 1,
        updatedAt: currentDate.toISOString(),
        usage: { ...entitlement.usage },
      }
    }
  }

  if (entitlement.plan !== 'TRIAL') {
    return {
      ...entitlement,
      usage: { ...entitlement.usage },
    }
  }

  const trialEndsAt = toDate(
    entitlement.trialEndsAt,
  )

  if (
    trialEndsAt &&
    currentDate.getTime() <
      trialEndsAt.getTime()
  ) {
    return {
      ...entitlement,
      usage: { ...entitlement.usage },
    }
  }

  return {
    ...entitlement,
    plan: 'FREE',
    source: 'none',
    version: entitlement.version + 1,
    updatedAt: currentDate.toISOString(),
    usage: { ...entitlement.usage },
  }
}

export function canUseServerAI(
  entitlement: ServerEntitlement,
  now: Date | string = new Date(),
) {
  return (
    resolveServerEntitlement(entitlement, now)
      .plan !== 'FREE'
  )
}

export function recordServerAiGeneration(
  entitlement: ServerEntitlement,
  kind: AiGenerationKind,
  generatedAt: Date | string = new Date(),
) {
  const currentDate =
    toDate(generatedAt) ?? new Date()
  const resolved = resolveServerEntitlement(
    entitlement,
    currentDate,
  )

  if (!canUseServerAI(resolved, currentDate)) {
    return {
      recorded: false,
      entitlement: resolved,
    }
  }

  return {
    recorded: true,
    entitlement: {
      ...resolved,
      usage: {
        mealPlanCount:
          resolved.usage.mealPlanCount +
          (kind === 'meal-plan' ? 1 : 0),
        recipeCount:
          resolved.usage.recipeCount +
          (kind === 'recipe' ? 1 : 0),
        recommendationCount:
          resolved.usage.recommendationCount +
          (kind === 'recommendation' ? 1 : 0),
        lastGenerationAt:
          currentDate.toISOString(),
      },
      version: resolved.version + 1,
      updatedAt: currentDate.toISOString(),
    },
  }
}
