export type AiAccessPlan =
  | 'FREE'
  | 'TRIAL'
  | 'PREMIUM'

export type AiGenerationKind =
  | 'meal-plan'
  | 'recipe'
  | 'recommendation'

export type AiAccessUsage = {
  formatVersion: '1.1'
  trialStart: string | null
  trialEnd: string | null
  plan: AiAccessPlan
  mealPlanCount: number
  recipeCount: number
  recommendationCount: number
  lastGenerationAt: string | null
}

export type AiSubscriptionStatus = {
  plan: AiAccessPlan
  canUseAI: boolean
  remainingTrialDays: number
  trialStart: string | null
  trialEnd: string | null
}

export type AiGenerationRecordResult = {
  recorded: boolean
  usage: AiAccessUsage
}
