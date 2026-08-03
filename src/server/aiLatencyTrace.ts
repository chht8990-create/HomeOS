export type AiLatencyStage =
  | 'request_received'
  | 'auth_completed'
  | 'entitlement_completed'
  | 'runtime_settings_completed'
  | 'inventory_validation_completed'
  | 'prompt_created'
  | 'openai_request_started'
  | 'openai_headers_received'
  | 'openai_body_received'
  | 'json_parsed'
  | 'usage_saved'
  | 'response_returned'
  | 'request_failed'

export type AiLatencyTrace = {
  traceId: string
  startedAt: number
  lastAt: number
  model: string
  inventoryItemCount: number
}

type AiLatencyDetails = {
  at?: number
  httpStatus?: number | null
  errorCode?: string | null
  upstreamRequestId?: string | null
}

export function createAiLatencyTrace(
  model: string,
  inventoryItemCount: number,
  startedAt = Date.now(),
): AiLatencyTrace {
  return {
    traceId: crypto.randomUUID(),
    startedAt,
    lastAt: startedAt,
    model,
    inventoryItemCount,
  }
}

export function logAiLatencyStage(
  trace: AiLatencyTrace | undefined,
  stage: AiLatencyStage,
  details: AiLatencyDetails = {},
) {
  if (!trace) {
    return
  }

  const at = details.at ?? Date.now()
  const payload = {
    traceId: trace.traceId,
    stage,
    elapsedMs: Math.max(0, at - trace.startedAt),
    deltaMs: Math.max(0, at - trace.lastAt),
    httpStatus: details.httpStatus ?? null,
    errorCode: details.errorCode ?? null,
    model: trace.model,
    inventoryItemCount: trace.inventoryItemCount,
    ...(details.upstreamRequestId
      ? {
          upstreamRequestId:
            details.upstreamRequestId.slice(0, 120),
        }
      : {}),
  }

  trace.lastAt = at

  const message = `[today-table-ai-trace] ${JSON.stringify(payload)}`

  if (stage === 'request_failed') {
    console.error(message)
  } else {
    console.info(message)
  }
}
