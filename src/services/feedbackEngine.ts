import type {
  FeedbackCategory,
  FeedbackDiagnostics,
  FeedbackPayload,
} from '../types/feedback'

export const feedbackCategories = [
  'issue',
  'positive',
  'feature',
] as const

export const FEEDBACK_MESSAGE_MIN_LENGTH = 5
export const FEEDBACK_MESSAGE_MAX_LENGTH = 1_000
export const FEEDBACK_CONTACT_MAX_LENGTH = 200

export const feedbackCategoryLabels: Record<
  FeedbackCategory,
  string
> = {
  issue: '불편한 점',
  positive: '좋았던 점',
  feature: '추가했으면 하는 기능',
}

type FeedbackValidationResult =
  | {
      ok: true
      data: FeedbackPayload
    }
  | {
      ok: false
      code:
        | 'INVALID_BODY'
        | 'INVALID_CATEGORY'
        | 'INVALID_MESSAGE'
        | 'INVALID_CONTACT'
        | 'INVALID_DIAGNOSTICS'
        | 'UNEXPECTED_FIELD'
      message: string
    }

const payloadKeys = new Set([
  'category',
  'message',
  'contact',
  'diagnostics',
])
const diagnosticKeys = new Set([
  'appVersion',
  'currentPage',
  'createdAt',
  'userAgent',
  'viewport',
  'displayMode',
  'online',
  'language',
])
const viewportKeys = new Set(['width', 'height'])

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: Set<string>,
) {
  return Object.keys(value).every((key) =>
    allowedKeys.has(key),
  )
}

function isBoundedString(
  value: unknown,
  maximumLength: number,
  allowEmpty = false,
): value is string {
  return (
    typeof value === 'string' &&
    value.length <= maximumLength &&
    (allowEmpty || value.trim().length > 0)
  )
}

function isViewportSize(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= 10_000
  )
}

function validateDiagnostics(
  value: unknown,
): FeedbackDiagnostics | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, diagnosticKeys) ||
    !isRecord(value.viewport) ||
    !hasOnlyKeys(value.viewport, viewportKeys) ||
    !isBoundedString(value.appVersion, 20) ||
    !isBoundedString(value.currentPage, 60) ||
    !isBoundedString(value.createdAt, 40) ||
    Number.isNaN(Date.parse(value.createdAt)) ||
    !isBoundedString(value.userAgent, 500, true) ||
    !isViewportSize(value.viewport.width) ||
    !isViewportSize(value.viewport.height) ||
    (value.displayMode !== 'standalone' &&
      value.displayMode !== 'browser') ||
    typeof value.online !== 'boolean' ||
    !isBoundedString(value.language, 35)
  ) {
    return null
  }

  return {
    appVersion: value.appVersion.trim(),
    currentPage: value.currentPage.trim(),
    createdAt: value.createdAt,
    userAgent: value.userAgent.trim(),
    viewport: {
      width: value.viewport.width,
      height: value.viewport.height,
    },
    displayMode: value.displayMode,
    online: value.online,
    language: value.language.trim(),
  }
}

export function validateFeedbackPayload(
  value: unknown,
): FeedbackValidationResult {
  if (!isRecord(value)) {
    return {
      ok: false,
      code: 'INVALID_BODY',
      message: '요청 형식이 올바르지 않습니다.',
    }
  }

  if (!hasOnlyKeys(value, payloadKeys)) {
    return {
      ok: false,
      code: 'UNEXPECTED_FIELD',
      message: '허용되지 않은 정보가 포함되어 있습니다.',
    }
  }

  if (
    typeof value.category !== 'string' ||
    !feedbackCategories.includes(
      value.category as FeedbackCategory,
    )
  ) {
    return {
      ok: false,
      code: 'INVALID_CATEGORY',
      message: '의견 유형을 선택해 주세요.',
    }
  }

  if (typeof value.message !== 'string') {
    return {
      ok: false,
      code: 'INVALID_MESSAGE',
      message: '의견 내용을 입력해 주세요.',
    }
  }

  const message = value.message.trim()

  if (
    message.length < FEEDBACK_MESSAGE_MIN_LENGTH ||
    message.length > FEEDBACK_MESSAGE_MAX_LENGTH
  ) {
    return {
      ok: false,
      code: 'INVALID_MESSAGE',
      message: `의견은 ${FEEDBACK_MESSAGE_MIN_LENGTH}자 이상 ${FEEDBACK_MESSAGE_MAX_LENGTH.toLocaleString('ko-KR')}자 이하로 입력해 주세요.`,
    }
  }

  if (
    value.contact !== undefined &&
    typeof value.contact !== 'string'
  ) {
    return {
      ok: false,
      code: 'INVALID_CONTACT',
      message: '연락처 형식이 올바르지 않습니다.',
    }
  }

  const contact =
    typeof value.contact === 'string'
      ? value.contact.trim()
      : ''

  if (contact.length > FEEDBACK_CONTACT_MAX_LENGTH) {
    return {
      ok: false,
      code: 'INVALID_CONTACT',
      message: `연락처는 ${FEEDBACK_CONTACT_MAX_LENGTH}자 이하로 입력해 주세요.`,
    }
  }

  const diagnostics = validateDiagnostics(
    value.diagnostics,
  )

  if (!diagnostics) {
    return {
      ok: false,
      code: 'INVALID_DIAGNOSTICS',
      message: '앱 진단 정보가 올바르지 않습니다.',
    }
  }

  return {
    ok: true,
    data: {
      category: value.category as FeedbackCategory,
      message,
      ...(contact ? { contact } : {}),
      diagnostics,
    },
  }
}

export function escapeFeedbackText(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] ?? character,
  )
}
