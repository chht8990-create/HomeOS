import {
  AUTH_API_PATHS,
  createAnonymousAuthSession,
  normalizeAuthReturnTo,
  parseAuthSession,
} from './authEngine'
import {
  cancelAccountSyncScheduler,
  dispatchAppliedStorageEvents,
  flushAccountSyncScheduler,
  setAccountSyncIdentity,
} from './accountSyncScheduler'
import { restoreAccountStorageFromServer } from './accountSyncClient'
import {
  deactivateAccountStorage,
  prepareAccountStorageForIdentity,
} from './accountStorageNamespace'
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
        if (options.storage) {
          const removedKeys = deactivateAccountStorage(
            options.storage,
          )
          dispatchAppliedStorageEvents(removedKeys)
        }
        return createAnonymousAuthSession()
      }

      const session = parseAuthSession(
        (await response.json()) as unknown,
      )

      if (session.status === 'authenticated') {
        if (options.storage) {
          prepareAccountStorageForIdentity(
            options.storage,
            session.user.id,
          )
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
            const restoreResult =
              await restoreAccountStorageFromServer({
                storage: options.storage,
                userId: session.user.id,
                ...(options.fetcher
                  ? { fetcher: options.fetcher }
                  : {}),
              })
            const syncResult =
              await flushAccountSyncScheduler({
                force: true,
              })
            const changedKeys = [
              ...new Set([
                ...restoreResult.changedKeys,
                ...syncResult.changedKeys,
              ]),
            ]

            if (restoreResult.changed) {
              dispatchAppliedStorageEvents(changedKeys)
            }

            if (
              (restoreResult.changed || syncResult.changed) &&
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
        if (options.storage) {
          const removedKeys = deactivateAccountStorage(
            options.storage,
          )
          dispatchAppliedStorageEvents(removedKeys)
        }
      }

      return session
    } catch {
      cancelAccountSyncScheduler()
      if (options.storage) {
        const removedKeys = deactivateAccountStorage(
          options.storage,
        )
        dispatchAppliedStorageEvents(removedKeys)
      }
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
  options: {
    storage?: Storage
    userId?: string
  } = {},
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

  if (options.storage) {
    const removedKeys = deactivateAccountStorage(
      options.storage,
      options.userId,
    )
    dispatchAppliedStorageEvents(removedKeys)
  }

  resetAuthSessionCache()
  return createAnonymousAuthSession()
}
