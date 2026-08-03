import type {
  AiAccessPlan,
  AiAccessUsage,
  AiGenerationKind,
  AiGenerationRecordResult,
  AiSubscriptionStatus,
} from '../types/aiAccess.js'

export const AI_ACCESS_FORMAT_VERSION = '1.1'
export const AI_TRIAL_DURATION_DAYS = 7

const LEGACY_AI_ACCESS_FORMAT_VERSION = '1.0'
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

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isAiAccessPlan(
  value: unknown,
): value is AiAccessPlan {
  return (
    value === 'FREE' ||
    value === 'TRIAL' ||
    value === 'PREMIUM'
  )
}

function isCount(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0
  )
}

function isOptionalDate(
  value: unknown,
): value is string | null {
  return (
    value === null ||
    (typeof value === 'string' &&
      toDate(value) !== null)
  )
}

function hasValidLastGenerationAt(
  value: unknown,
): value is string | null {
  return isOptionalDate(value)
}

export function createInitialAiAccessUsage(): AiAccessUsage {
  return {
    formatVersion: AI_ACCESS_FORMAT_VERSION,
    trialStart: null,
    trialEnd: null,
    plan: 'FREE',
    mealPlanCount: 0,
    recipeCount: 0,
    recommendationCount: 0,
    lastGenerationAt: null,
  }
}

export function createTrialAiAccessUsage(
  startedAt: Date | string = new Date(),
  trialDurationDays = AI_TRIAL_DURATION_DAYS,
): AiAccessUsage {
  const trialStart =
    toDate(startedAt) ?? new Date()
  const safeDurationDays =
    Number.isInteger(trialDurationDays) &&
    trialDurationDays > 0
      ? trialDurationDays
      : AI_TRIAL_DURATION_DAYS
  const trialEnd = new Date(
    trialStart.getTime() +
      safeDurationDays * MILLISECONDS_PER_DAY,
  )

  return {
    ...createInitialAiAccessUsage(),
    trialStart: trialStart.toISOString(),
    trialEnd: trialEnd.toISOString(),
    plan: 'TRIAL',
  }
}

function parseCurrentAiAccessUsage(
  value: Record<string, unknown>,
): AiAccessUsage | null {
  if (
    value.formatVersion !==
      AI_ACCESS_FORMAT_VERSION ||
    !isOptionalDate(value.trialStart) ||
    !isOptionalDate(value.trialEnd) ||
    !isAiAccessPlan(value.plan) ||
    !isCount(value.mealPlanCount) ||
    !isCount(value.recipeCount) ||
    !isCount(value.recommendationCount) ||
    !hasValidLastGenerationAt(
      value.lastGenerationAt,
    )
  ) {
    return null
  }

  if (
    value.plan === 'TRIAL' &&
    (!value.trialStart || !value.trialEnd)
  ) {
    return null
  }

  return {
    formatVersion: AI_ACCESS_FORMAT_VERSION,
    trialStart: value.trialStart,
    trialEnd: value.trialEnd,
    plan: value.plan,
    mealPlanCount: value.mealPlanCount,
    recipeCount: value.recipeCount,
    recommendationCount:
      value.recommendationCount,
    lastGenerationAt: value.lastGenerationAt,
  }
}

function migrateLegacyAiAccessUsage(
  value: Record<string, unknown>,
): AiAccessUsage | null {
  if (
    value.formatVersion !==
      LEGACY_AI_ACCESS_FORMAT_VERSION ||
    typeof value.trialStart !== 'string' ||
    toDate(value.trialStart) === null ||
    typeof value.trialEnd !== 'string' ||
    toDate(value.trialEnd) === null ||
    !isAiAccessPlan(value.plan) ||
    !isCount(value.aiGenerationCount) ||
    !hasValidLastGenerationAt(
      value.lastGenerationAt,
    )
  ) {
    return null
  }

  return {
    formatVersion: AI_ACCESS_FORMAT_VERSION,
    trialStart: value.trialStart,
    trialEnd: value.trialEnd,
    plan: value.plan,
    mealPlanCount: value.aiGenerationCount,
    recipeCount: 0,
    recommendationCount: 0,
    lastGenerationAt: value.lastGenerationAt,
  }
}

export function parseAiAccessUsage(
  value: unknown,
): AiAccessUsage | null {
  if (!isRecord(value)) {
    return null
  }

  return (
    parseCurrentAiAccessUsage(value) ??
    migrateLegacyAiAccessUsage(value)
  )
}

export function resolveAiAccessUsage(
  usage: AiAccessUsage,
  now: Date | string = new Date(),
): AiAccessUsage {
  if (usage.plan !== 'TRIAL') {
    return { ...usage }
  }

  const currentDate = toDate(now) ?? new Date()
  const trialEnd = toDate(usage.trialEnd)

  if (
    !trialEnd ||
    currentDate.getTime() >= trialEnd.getTime()
  ) {
    return {
      ...usage,
      plan: 'FREE',
    }
  }

  return { ...usage }
}

export function getRemainingTrialDays(
  usage: AiAccessUsage,
  now: Date | string = new Date(),
) {
  const resolvedUsage = resolveAiAccessUsage(
    usage,
    now,
  )

  if (resolvedUsage.plan !== 'TRIAL') {
    return 0
  }

  const currentDate = toDate(now) ?? new Date()
  const trialEnd = toDate(resolvedUsage.trialEnd)

  if (!trialEnd) {
    return 0
  }

  return Math.max(
    0,
    Math.ceil(
      (trialEnd.getTime() - currentDate.getTime()) /
        MILLISECONDS_PER_DAY,
    ),
  )
}

export function canUseAI(
  usage: AiAccessUsage,
  now: Date | string = new Date(),
) {
  return (
    resolveAiAccessUsage(usage, now).plan !==
    'FREE'
  )
}

export function canGenerateMealPlan(
  usage: AiAccessUsage,
  now: Date | string = new Date(),
) {
  return canUseAI(usage, now)
}

export function canGenerateRecipe(
  usage: AiAccessUsage,
  now: Date | string = new Date(),
) {
  return canUseAI(usage, now)
}

export function getSubscriptionStatus(
  usage: AiAccessUsage,
  now: Date | string = new Date(),
): AiSubscriptionStatus {
  const resolvedUsage = resolveAiAccessUsage(
    usage,
    now,
  )

  return {
    plan: resolvedUsage.plan,
    canUseAI: canUseAI(resolvedUsage, now),
    remainingTrialDays: getRemainingTrialDays(
      resolvedUsage,
      now,
    ),
    trialStart: resolvedUsage.trialStart,
    trialEnd: resolvedUsage.trialEnd,
  }
}

export function recordAiGeneration(
  usage: AiAccessUsage,
  kind: AiGenerationKind,
  generatedAt: Date | string = new Date(),
): AiGenerationRecordResult {
  const currentDate =
    toDate(generatedAt) ?? new Date()
  const resolvedUsage = resolveAiAccessUsage(
    usage,
    currentDate,
  )

  if (!canUseAI(resolvedUsage, currentDate)) {
    return {
      recorded: false,
      usage: resolvedUsage,
    }
  }

  const nextUsage = {
    ...resolvedUsage,
    mealPlanCount:
      resolvedUsage.mealPlanCount +
      (kind === 'meal-plan' ? 1 : 0),
    recipeCount:
      resolvedUsage.recipeCount +
      (kind === 'recipe' ? 1 : 0),
    recommendationCount:
      resolvedUsage.recommendationCount +
      (kind === 'recommendation' ? 1 : 0),
    lastGenerationAt:
      currentDate.toISOString(),
  }

  return {
    recorded: true,
    usage: nextUsage,
  }
}
