export type AiMealPlanPipelineStage =
  | 'DRAFT_GENERATION'
  | 'DRAFT_VALIDATION'
  | 'MENU_NORMALIZATION'
  | 'MENU_DIVERSITY_VALIDATION'
  | 'RECIPE_DETAIL_GENERATION'
  | 'INGREDIENT_NORMALIZATION'
  | 'IMAGE_RESOLUTION'
  | 'PLANNER_SAVE'
  | 'SHOPPING_PREPARE'
  | 'TRIAL_COMPLETE'
  | 'ROLLBACK'

export type AiMealPlanPipelineErrorCode =
  | 'NETWORK_ERROR'
  | 'API_ENV_MISSING'
  | 'OPENAI_TIMEOUT'
  | 'OPENAI_RESPONSE_INVALID'
  | 'MENU_NAME_INVALID'
  | 'MENU_DIVERSITY_INVALID'
  | 'RECIPE_DETAIL_FAILED'
  | 'INGREDIENT_NORMALIZATION_FAILED'
  | 'IMAGE_KEY_FAILED'
  | 'PLANNER_SAVE_FAILED'
  | 'SHOPPING_PREPARE_FAILED'
  | 'STORAGE_SAVE_FAILED'
  | 'TRIAL_COMPLETE_FAILED'

type PipelineTraceStatus = 'success' | 'failure'

export type AiMealPlanPipelineTraceEntry = {
  traceId: string
  stage: AiMealPlanPipelineStage
  status: PipelineTraceStatus
  errorCode?: AiMealPlanPipelineErrorCode
  durationMs: number
  menuCount: number
  savedCount: number
}

export class AiMealPlanPipelineError extends Error {
  code: AiMealPlanPipelineErrorCode
  stage: AiMealPlanPipelineStage
  causeCode?: string

  constructor(
    code: AiMealPlanPipelineErrorCode,
    stage: AiMealPlanPipelineStage,
    message: string,
    causeCode?: string,
  ) {
    super(message)
    this.name = 'AiMealPlanPipelineError'
    this.code = code
    this.stage = stage
    this.causeCode = causeCode
  }
}

export function createAiMealPlanPipelineTraceId() {
  if (typeof crypto.randomUUID === 'function') {
    return `ai-plan:${crypto.randomUUID()}`
  }

  return `ai-plan:${Date.now()}:${Math.random()
    .toString(16)
    .slice(2)}`
}

export function logAiMealPlanPipelineTrace(
  entry: AiMealPlanPipelineTraceEntry,
) {
  console.info(
    '[today-table-ai-pipeline]',
    JSON.stringify(entry),
  )
}

export function mapAiMealPlanPipelineErrorCode(
  code: string | undefined,
  fallback: AiMealPlanPipelineErrorCode,
): AiMealPlanPipelineErrorCode {
  switch (code) {
    case 'AI_NOT_CONFIGURED':
      return 'API_ENV_MISSING'
    case 'API_REQUEST_FAILED':
      return 'NETWORK_ERROR'
    case 'OPENAI_TIMEOUT':
    case 'PIPELINE_TIMEOUT':
      return 'OPENAI_TIMEOUT'
    case 'MENU_NAME_INVALID':
      return 'MENU_NAME_INVALID'
    case 'MENU_DIVERSITY_INVALID':
      return 'MENU_DIVERSITY_INVALID'
    case 'OPENAI_RESPONSE_INVALID':
    case 'SCHEMA_VALIDATION_FAILED':
    case 'JSON_PARSE_FAILED':
    case 'AI_RESPONSE_TOO_LARGE':
      return 'OPENAI_RESPONSE_INVALID'
    case 'STORAGE_SAVE_FAILED':
    case 'RECIPE_SAVE_FAILED':
      return 'STORAGE_SAVE_FAILED'
    case 'PLAN_SAVE_FAILED':
      return 'PLANNER_SAVE_FAILED'
    default:
      return fallback
  }
}

export function createAiMealPlanPipelineError(
  error: unknown,
  stage: AiMealPlanPipelineStage,
  fallback: AiMealPlanPipelineErrorCode,
  message: string,
) {
  if (error instanceof AiMealPlanPipelineError) {
    return error
  }

  const causeCode =
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : undefined

  return new AiMealPlanPipelineError(
    mapAiMealPlanPipelineErrorCode(
      causeCode,
      fallback,
    ),
    stage,
    message,
    causeCode,
  )
}

export function isAiMealPlanPipelineError(
  error: unknown,
): error is AiMealPlanPipelineError {
  return error instanceof AiMealPlanPipelineError
}
