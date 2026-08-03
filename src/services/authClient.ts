import {
  AUTH_API_PATHS,
  createAnonymousAuthSession,
  normalizeAuthReturnTo,
  parseAuthSession,
} from './authEngine'
import {
  cancelAccountSyncScheduler,
  flushAccountSyncScheduler,
  setAccountSyncIdentity,
} from './accountSyncScheduler'
import type { AuthSession } from '../types/auth'

let restorePromise: Promise<AuthSession> | null =
  null

export async function restoreAuthSession(
  options: {
    fetcher?: typeof fetch
    storage?: Storage
    sync?: boolean
    reloadOnSyncChange?: boolean
  } = {},
) {
  if (restorePromise) {
    return restorePromise
  }

  restorePromise = (async () => {
    try {
      const response = await (
        options.fetcher ?? fetch
      )(AUTH_API_PATHS.session, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        cancelAccountSyncScheduler()
        return createAnonymousAuthSession()
      }

      const session = parseAuthSession(
        (await response.json()) as unknown,
      )

      if (session.status === 'authenticated') {
        if (options.storage) {
          setAccountSyncIdentity({
            storage: options.storage,
            userId: session.user.id,
            deviceId: session.deviceId,
            ...(options.fetcher
              ? { fetcher: options.fetcher }
              : {}),
          })
        }

        if (
          options.sync !== false &&
          options.storage
        ) {
          try {
            const syncResult =
              await flushAccountSyncScheduler({
                force: true,
              })

            if (
              syncResult.changed &&
              options.reloadOnSyncChange &&
              typeof window !== 'undefined'
            ) {
              const reloadKey =
                'today-table.account-sync-reload.v1'

              if (
                window.sessionStorage.getItem(
                  reloadKey,
                ) !== '1'
              ) {
                window.sessionStorage.setItem(
                  reloadKey,
                  '1',
                )
                window.location.reload()
              }
            } else if (
              typeof window !== 'undefined'
            ) {
              window.sessionStorage.removeItem(
                'today-table.account-sync-reload.v1',
              )
            }
          } catch {
            // Offline or temporary failures keep local data pending.
          }
        }
      } else {
        cancelAccountSyncScheduler()
      }

      return session
    } catch {
      cancelAccountSyncScheduler()
      return createAnonymousAuthSession()
    }
  })()

  return restorePromise
}

export function resetAuthSessionCache() {
  restorePromise = null
}

export function startGoogleLogin(
  returnTo = window.location.pathname,
) {
  const search = new URLSearchParams({
    returnTo: normalizeAuthReturnTo(returnTo),
  })

  window.location.assign(
    `${AUTH_API_PATHS.login}?${search.toString()}`,
  )
}

export async function logoutAuthSession(
  fetcher: typeof fetch = fetch,
) {
  cancelAccountSyncScheduler()

  const response = await fetcher(
    AUTH_API_PATHS.logout,
    {
      method: 'POST',
      credentials: 'same-origin',
    },
  )

  if (!response.ok) {
    throw new Error('LOGOUT_FAILED')
  }

  resetAuthSessionCache()
  return createAnonymousAuthSession()
}
