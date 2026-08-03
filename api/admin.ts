import {
  handleAdminAiSwitch,
  handleAdminDashboard,
  type AdminApiDependencies,
} from '../src/server/adminApiEngine.js'
import { getBusinessRepository } from '../src/server/businessRuntime.js'
import { getServerApiDependencies } from '../src/server/serverRuntime.js'

export type AdminApiAction =
  | 'dashboard'
  | 'ai-switch'

export function resolveAdminApiAction(
  request: Request,
): AdminApiAction | null {
  const url = new URL(request.url)

  if (url.pathname.endsWith('/dashboard')) {
    return 'dashboard'
  }

  if (url.pathname.endsWith('/ai-switch')) {
    return 'ai-switch'
  }

  const action = url.searchParams.get('action')

  return action === 'dashboard' || action === 'ai-switch'
    ? action
    : null
}

export function handleAdminRoute(
  request: Request,
  dependencies?: AdminApiDependencies,
) {
  const action = resolveAdminApiAction(request)

  if (action === 'dashboard') {
    return handleAdminDashboard(request, dependencies)
  }

  if (action === 'ai-switch') {
    return handleAdminAiSwitch(request, dependencies)
  }

  return Response.json(
    { code: 'ADMIN_ACTION_NOT_FOUND' },
    {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}

export default {
  fetch(request: Request) {
    const identity = getServerApiDependencies(process.env)
    const business = getBusinessRepository(process.env)

    return handleAdminRoute(
      request,
      identity && business
        ? {
            identity,
            business,
            environment: process.env,
          }
        : undefined,
    )
  },
}
