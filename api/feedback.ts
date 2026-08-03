import {
  escapeFeedbackText,
  feedbackCategoryLabels,
  validateFeedbackPayload,
} from '../src/services/feedbackEngine.js'
import type { FeedbackPayload } from '../src/types/feedback.js'
import { getBusinessRepository } from '../src/server/businessRuntime.js'

const MAX_REQUEST_BYTES = 16_000
const DELIVERY_TIMEOUT_MS = 8_000
const RATE_WINDOW_MS = 10 * 60 * 1_000
const RATE_LIMIT = 5
const DUPLICATE_WINDOW_MS = 60_000

export type FeedbackServerEnvironment = {
  FEEDBACK_WEBHOOK_URL?: string
  FEEDBACK_WEBHOOK_TOKEN?: string
}

type FeedbackDelivery = (
  feedback: FeedbackPayload,
  environment: FeedbackServerEnvironment,
) => Promise<void>

type RequestWindow = {
  startedAt: number
  count: number
}

const requestWindows = new Map<string, RequestWindow>()
const recentSubmissions = new Map<string, number>()

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type':
        'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function hashValue(value: string) {
  let hash = 5381

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index)
  }

  return (hash >>> 0).toString(36)
}

function readClientKey(request: Request) {
  const forwardedFor =
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    'unknown'
  const userAgent =
    request.headers.get('user-agent') ?? 'unknown'

  return hashValue(
    `${forwardedFor.split(',')[0].trim()}:${userAgent}`,
  )
}

function isRateLimited(
  clientKey: string,
  now: number,
) {
  const current = requestWindows.get(clientKey)

  if (
    !current ||
    now - current.startedAt >= RATE_WINDOW_MS
  ) {
    requestWindows.set(clientKey, {
      startedAt: now,
      count: 1,
    })
    return false
  }

  if (current.count >= RATE_LIMIT) {
    return true
  }

  current.count += 1
  return false
}

function createDuplicateKey(
  clientKey: string,
  feedback: FeedbackPayload,
) {
  return hashValue(
    `${clientKey}:${feedback.category}:${feedback.message}:${feedback.contact ?? ''}`,
  )
}

function pruneRequestGuards(now: number) {
  requestWindows.forEach((window, key) => {
    if (now - window.startedAt > RATE_WINDOW_MS) {
      requestWindows.delete(key)
    }
  })
  recentSubmissions.forEach((createdAt, key) => {
    if (now - createdAt > DUPLICATE_WINDOW_MS) {
      recentSubmissions.delete(key)
    }
  })
}

function sanitizeFeedback(
  feedback: FeedbackPayload,
): FeedbackPayload {
  return {
    category: feedback.category,
    message: escapeFeedbackText(feedback.message),
    ...(feedback.contact
      ? {
          contact: escapeFeedbackText(
            feedback.contact,
          ),
        }
      : {}),
    diagnostics: {
      ...feedback.diagnostics,
      appVersion: escapeFeedbackText(
        feedback.diagnostics.appVersion,
      ),
      currentPage: escapeFeedbackText(
        feedback.diagnostics.currentPage,
      ),
      userAgent: escapeFeedbackText(
        feedback.diagnostics.userAgent,
      ),
      language: escapeFeedbackText(
        feedback.diagnostics.language,
      ),
    },
  }
}

async function deliverFeedback(
  feedback: FeedbackPayload,
  environment: FeedbackServerEnvironment,
) {
  const webhookUrl =
    environment.FEEDBACK_WEBHOOK_URL?.trim()

  if (!webhookUrl) {
    throw new Error('FEEDBACK_NOT_CONFIGURED')
  }

  let parsedUrl: URL

  try {
    parsedUrl = new URL(webhookUrl)
  } catch {
    throw new Error('FEEDBACK_NOT_CONFIGURED')
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('FEEDBACK_NOT_CONFIGURED')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(),
    DELIVERY_TIMEOUT_MS,
  )

  try {
    const response = await fetch(parsedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(environment.FEEDBACK_WEBHOOK_TOKEN
          ? {
              Authorization: `Bearer ${environment.FEEDBACK_WEBHOOK_TOKEN}`,
            }
          : {}),
      },
      body: JSON.stringify({
        source: '오늘식탁',
        category:
          feedbackCategoryLabels[feedback.category],
        feedback: sanitizeFeedback(feedback),
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error('FEEDBACK_DELIVERY_FAILED')
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function handleFeedback(
  request: Request,
  environment: FeedbackServerEnvironment,
  delivery: FeedbackDelivery = deliverFeedback,
) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: 'POST, OPTIONS',
        'Cache-Control': 'no-store',
      },
    })
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      {
        code: 'METHOD_NOT_ALLOWED',
        message: 'POST 요청만 지원합니다.',
      },
      405,
    )
  }

  const contentType =
    request.headers.get('content-type') ?? ''

  if (
    !contentType
      .toLowerCase()
      .startsWith('application/json')
  ) {
    return jsonResponse(
      {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'JSON 형식으로 보내 주세요.',
      },
      415,
    )
  }

  const contentLength = Number(
    request.headers.get('content-length'),
  )

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_REQUEST_BYTES
  ) {
    return jsonResponse(
      {
        code: 'REQUEST_TOO_LARGE',
        message: '전송할 내용이 너무 깁니다.',
      },
      413,
    )
  }

  let requestText: string

  try {
    requestText = await request.text()
  } catch {
    return jsonResponse(
      {
        code: 'INVALID_REQUEST',
        message: '요청을 읽을 수 없습니다.',
      },
      400,
    )
  }

  if (
    new TextEncoder().encode(requestText).length >
    MAX_REQUEST_BYTES
  ) {
    return jsonResponse(
      {
        code: 'REQUEST_TOO_LARGE',
        message: '전송할 내용이 너무 깁니다.',
      },
      413,
    )
  }

  let requestBody: unknown

  try {
    requestBody = JSON.parse(requestText)
  } catch {
    return jsonResponse(
      {
        code: 'INVALID_JSON',
        message: 'JSON 형식이 올바르지 않습니다.',
      },
      400,
    )
  }

  const validation =
    validateFeedbackPayload(requestBody)

  if (!validation.ok) {
    return jsonResponse(
      {
        code: validation.code,
        message: validation.message,
      },
      400,
    )
  }

  const now = Date.now()
  pruneRequestGuards(now)
  const clientKey = readClientKey(request)

  if (isRateLimited(clientKey, now)) {
    return jsonResponse(
      {
        code: 'RATE_LIMITED',
        message:
          '잠시 후 다시 의견을 보내 주세요.',
      },
      429,
    )
  }

  const duplicateKey = createDuplicateKey(
    clientKey,
    validation.data,
  )
  const lastSubmittedAt =
    recentSubmissions.get(duplicateKey)

  if (
    lastSubmittedAt &&
    now - lastSubmittedAt < DUPLICATE_WINDOW_MS
  ) {
    return jsonResponse({
      ok: true,
      duplicate: true,
    })
  }

  try {
    await delivery(validation.data, environment)
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'FEEDBACK_NOT_CONFIGURED'
    ) {
      return jsonResponse(
        {
          code: 'FEEDBACK_NOT_CONFIGURED',
          message:
            '의견 수신 설정을 준비하고 있습니다.',
        },
        503,
      )
    }

    return jsonResponse(
      {
        code: 'FEEDBACK_DELIVERY_FAILED',
        message:
          '의견을 보내지 못했습니다.',
      },
      502,
    )
  }

  recentSubmissions.set(duplicateKey, now)

  return jsonResponse({ ok: true })
}

export default {
  async fetch(request: Request) {
    let category = 'unknown'

    try {
      const body = (await request.clone().json()) as {
        category?: unknown
      }

      if (typeof body.category === 'string') {
        category = body.category.slice(0, 50)
      }
    } catch {
      // Validation response remains owned by handleFeedback.
    }

    const response = await handleFeedback(
      request,
      process.env,
    )
    const business = getBusinessRepository(process.env)

    if (business) {
      try {
        await business.recordFeedbackEvent({
          id: `feedback_event_${crypto.randomUUID()}`,
          category,
          success: response.ok,
          createdAt: new Date().toISOString(),
        })
      } catch {
        console.warn(
          '[today-table-feedback-metric]',
          JSON.stringify({
            code: 'FEEDBACK_METRIC_STORE_FAILED',
            success: response.ok,
          }),
        )
      }
    }

    return response
  },
}
