import type { AdminDashboardSummary } from '../types/business'

type ApiError = {
  code?: string
  message?: string
}

async function readResponse<T>(response: Response) {
  const body = (await response.json()) as T | ApiError

  if (!response.ok) {
    const error = body as ApiError
    throw new Error(
      error.code ?? 'ADMIN_REQUEST_FAILED',
    )
  }

  return body as T
}

export async function fetchAdminDashboard() {
  return readResponse<AdminDashboardSummary>(
    await fetch('/api/admin/dashboard', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    }),
  )
}

export async function updateAdminAiSwitch(
  enabled: boolean,
) {
  return readResponse<{
    aiEnabled: boolean
    updatedAt: string
  }>(
    await fetch('/api/admin/ai-switch', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ enabled }),
    }),
  )
}
