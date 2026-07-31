import { APP_VERSION } from '../config/app'
import {
  validateFeedbackPayload,
} from './feedbackEngine'
import type {
  FeedbackCategory,
  FeedbackPayload,
} from '../types/feedback'

export class FeedbackSubmissionError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'FeedbackSubmissionError'
    this.code = code
  }
}

export function createFeedbackPayload(
  category: FeedbackCategory,
  message: string,
  contact: string,
  currentPage: string,
): FeedbackPayload {
  const isStandalone =
    window.matchMedia(
      '(display-mode: standalone)',
    ).matches

  return {
    category,
    message,
    ...(contact.trim()
      ? { contact: contact.trim() }
      : {}),
    diagnostics: {
      appVersion: APP_VERSION,
      currentPage,
      createdAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      displayMode: isStandalone
        ? 'standalone'
        : 'browser',
      online: navigator.onLine,
      language: navigator.language,
    },
  }
}

export async function submitFeedback(
  payload: FeedbackPayload,
) {
  const validation =
    validateFeedbackPayload(payload)

  if (!validation.ok) {
    throw new FeedbackSubmissionError(
      validation.code,
      validation.message,
    )
  }

  if (!navigator.onLine) {
    throw new FeedbackSubmissionError(
      'OFFLINE',
      '인터넷 연결을 확인해 주세요.',
    )
  }

  let response: Response

  try {
    response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validation.data),
    })
  } catch {
    throw new FeedbackSubmissionError(
      'NETWORK_ERROR',
      '인터넷 연결을 확인해 주세요.',
    )
  }

  const body = (await response
    .json()
    .catch(() => null)) as {
    code?: string
    message?: string
  } | null

  if (!response.ok) {
    throw new FeedbackSubmissionError(
      body?.code ?? 'SUBMISSION_FAILED',
      body?.message ??
        '의견을 보내지 못했습니다.',
    )
  }
}
