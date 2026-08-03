import {
  createAccountSyncStorageFingerprint,
  markAccountSyncPending,
  readAccountSyncMetadata,
  syncAccountStorage,
} from './accountSyncClient'
import { mirrorActiveAccountStorage } from './accountStorageNamespace'

export const ACCOUNT_SYNC_DEBOUNCE_MS = 750
export const ACCOUNT_SYNC_APPLIED_EVENT =
  'today-table:account-sync-applied'

export const ACCOUNT_SYNC_MUTATION_EVENTS = [
  'homeos:inventory-changed',
  'homeos:shopping-changed',
  'homeos:meal-plan-changed',
  'homeos:recipes-changed',
  'today-table:ai-recipes-changed',
  'today-table:measurement-tools-changed',
  'homeos:meal-recipe-matched',
  'homeos:meal-cleared',
] as const

type AccountSyncStorage = Parameters<
  typeof syncAccountStorage
>[0]['storage']

export type AccountSyncIdentity = {
  storage: AccountSyncStorage
  userId: string
  deviceId: string
  fetcher?: typeof fetch
}

type AccountSyncResult = Awaited<
  ReturnType<typeof syncAccountStorage>
>

type AccountSyncSchedulerOptions = {
  debounceMs?: number
  isOnline?: () => boolean
  setTimer?: (
    callback: () => void,
    delay: number,
  ) => ReturnType<typeof setTimeout>
  clearTimer?: (
    timer: ReturnType<typeof setTimeout>,
  ) => void
  sync?: (
    identity: AccountSyncIdentity,
    signal: AbortSignal,
  ) => Promise<AccountSyncResult>
  onApplied?: (changedKeys: string[]) => void
}

export function createAccountSyncScheduler(
  schedulerOptions: AccountSyncSchedulerOptions = {},
) {
  const debounceMs =
    schedulerOptions.debounceMs ??
    ACCOUNT_SYNC_DEBOUNCE_MS
  const isOnline =
    schedulerOptions.isOnline ?? (() => true)
  const setTimer =
    schedulerOptions.setTimer ??
    ((callback, delay) =>
      setTimeout(callback, delay))
  const clearTimer =
    schedulerOptions.clearTimer ??
    ((timer) => clearTimeout(timer))
  const sync =
    schedulerOptions.sync ??
    ((identity, signal) =>
      syncAccountStorage({
        ...identity,
        signal,
      }))

  let identity: AccountSyncIdentity | null = null
  let timer: ReturnType<typeof setTimeout> | null =
    null
  let inFlight: Promise<AccountSyncResult> | null =
    null
  let abortController: AbortController | null = null
  let generation = 0
  let pending = false
  let blockedByAccountMismatch = false
  let lastSyncedFingerprint: string | null = null

  function cancelTimer() {
    if (timer !== null) {
      clearTimer(timer)
      timer = null
    }
  }

  function cancelCurrentIdentity() {
    generation += 1
    cancelTimer()
    abortController?.abort()
    abortController = null
    inFlight = null
    pending = false
    blockedByAccountMismatch = false
    lastSyncedFingerprint = null
  }

  function setIdentity(
    nextIdentity: AccountSyncIdentity | null,
  ) {
    const isSameIdentity = Boolean(
      identity &&
        nextIdentity &&
        identity.userId === nextIdentity.userId &&
        identity.deviceId === nextIdentity.deviceId,
    )

    if (isSameIdentity) {
      identity = nextIdentity
      return
    }

    const anonymousPending = !identity && pending

    cancelCurrentIdentity()
    identity = nextIdentity

    if (!identity) {
      return
    }

    const metadata = readAccountSyncMetadata(
      identity.storage,
    )

    blockedByAccountMismatch = Boolean(
      metadata && metadata.userId !== identity.userId,
    )
    pending = Boolean(
      !blockedByAccountMismatch &&
        (anonymousPending ||
          (metadata?.pendingChanges ?? 0) > 0),
    )
  }

  function schedule(delay = debounceMs) {
    if (
      identity &&
      !blockedByAccountMismatch &&
      !inFlight &&
      !pending &&
      lastSyncedFingerprint !== null &&
      createAccountSyncStorageFingerprint(
        identity.storage,
      ) === lastSyncedFingerprint
    ) {
      return
    }

    pending = true

    if (!identity || blockedByAccountMismatch) {
      return
    }

    if (!isOnline()) {
      markAccountSyncPending(
        identity.storage,
        identity,
      )
      return
    }

    if (inFlight) {
      return
    }

    cancelTimer()
    timer = setTimer(() => {
      timer = null
      void flush().catch(() => undefined)
    }, delay)
  }

  async function flush(
    options: { force?: boolean } = {},
  ): Promise<AccountSyncResult> {
    if (!identity) {
      throw new Error('ACCOUNT_SYNC_IDENTITY_MISSING')
    }

    if (blockedByAccountMismatch) {
      throw new Error('ACCOUNT_SYNC_USER_MISMATCH')
    }

    if (!isOnline()) {
      pending = true
      markAccountSyncPending(identity.storage, identity)
      throw new Error('ACCOUNT_SYNC_OFFLINE')
    }

    if (inFlight) {
      pending = true
      return inFlight
    }

    cancelTimer()

    const fingerprint =
      createAccountSyncStorageFingerprint(
        identity.storage,
      )

    if (
      !options.force &&
      !pending &&
      fingerprint === lastSyncedFingerprint
    ) {
      return {
        changed: false,
        revision:
          readAccountSyncMetadata(identity.storage)
            ?.serverRevision ?? 0,
        changedKeys: [],
        pendingLocalChanges: false,
      }
    }

    const runIdentity = identity
    const runGeneration = generation
    pending = false
    abortController = new AbortController()

    inFlight = sync(
      runIdentity,
      abortController.signal,
    )
    let syncSucceeded = false

    try {
      const result = await inFlight

      if (
        runGeneration !== generation ||
        identity?.userId !== runIdentity.userId ||
        identity?.deviceId !== runIdentity.deviceId
      ) {
        throw new Error('ACCOUNT_SYNC_CANCELLED')
      }

      lastSyncedFingerprint =
        createAccountSyncStorageFingerprint(
          runIdentity.storage,
        )
      schedulerOptions.onApplied?.(
        result.changedKeys,
      )
      syncSucceeded = true

      if (result.pendingLocalChanges || pending) {
        pending = true
      }

      return result
    } catch (error) {
      if (
        runGeneration === generation &&
        identity?.userId === runIdentity.userId
      ) {
        pending = true
        markAccountSyncPending(
          runIdentity.storage,
          runIdentity,
        )
      }

      throw error
    } finally {
      if (runGeneration === generation) {
        inFlight = null
        abortController = null

        if (
          syncSucceeded &&
          pending &&
          identity &&
          isOnline()
        ) {
          schedule()
        }
      }
    }
  }

  return {
    setIdentity,
    schedule,
    flush,
    cancel() {
      identity = null
      cancelCurrentIdentity()
    },
    getState() {
      return {
        hasIdentity: Boolean(identity),
        pending,
        inFlight: Boolean(inFlight),
        blockedByAccountMismatch,
      }
    },
  }
}

let isDispatchingRemoteSnapshot = false
let browserSchedulerStarted = false

export function dispatchAppliedStorageEvents(
  changedKeys: string[],
) {
  if (
    typeof window === 'undefined' ||
    changedKeys.length === 0
  ) {
    return
  }

  const events = new Set<string>()

  changedKeys.forEach((key) => {
    if (key === 'homeos.inventory') {
      events.add('homeos:inventory-changed')
    } else if (key === 'homeos.shopping.items') {
      events.add('homeos:shopping-changed')
    } else if (key === 'homeos.mealPlan.items') {
      events.add('homeos:meal-plan-changed')
    } else if (key === 'homeos.recipes.imported') {
      events.add('homeos:recipes-changed')
    } else if (key === 'today-table.aiRecipes.v1') {
      events.add('today-table:ai-recipes-changed')
    } else if (
      key === 'today-table.measurement-tools.v1'
    ) {
      events.add(
        'today-table:measurement-tools-changed',
      )
    }
  })

  isDispatchingRemoteSnapshot = true

  try {
    events.forEach((eventName) => {
      window.dispatchEvent(new Event(eventName))
    })
    window.dispatchEvent(
      new CustomEvent(ACCOUNT_SYNC_APPLIED_EVENT, {
        detail: { changedKeys },
      }),
    )
  } finally {
    isDispatchingRemoteSnapshot = false
  }
}

const browserAccountSyncScheduler =
  createAccountSyncScheduler({
    isOnline: () =>
      typeof navigator === 'undefined' ||
      navigator.onLine,
    onApplied: dispatchAppliedStorageEvents,
  })

export function startAccountSyncScheduler() {
  if (
    typeof window === 'undefined' ||
    browserSchedulerStarted
  ) {
    return
  }

  const handleMutation = () => {
    if (!isDispatchingRemoteSnapshot) {
      mirrorActiveAccountStorage()
      browserAccountSyncScheduler.schedule()
    }
  }

  ACCOUNT_SYNC_MUTATION_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, handleMutation)
  })
  browserSchedulerStarted = true
}

export function setAccountSyncIdentity(
  identity: AccountSyncIdentity | null,
) {
  browserAccountSyncScheduler.setIdentity(identity)
}

export function flushAccountSyncScheduler(
  options: { force?: boolean } = {},
) {
  return browserAccountSyncScheduler.flush(options)
}

export function cancelAccountSyncScheduler() {
  browserAccountSyncScheduler.cancel()
}
