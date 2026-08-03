import {
  ACCOUNT_SYNC_METADATA_STORAGE_KEY,
  classifyAccountStorageKey,
} from './accountSyncEngine'
import {
  mergeAccountSyncSnapshots,
  parseAccountSyncSnapshot,
} from './accountSnapshotEngine'
import type {
  AccountSyncMetadata,
  AccountSyncResponse,
  AccountSyncSnapshot,
  AccountSyncSnapshotEntry,
} from '../types/accountSync'

type SyncStorage = Pick<
  Storage,
  | 'length'
  | 'key'
  | 'getItem'
  | 'setItem'
  | 'removeItem'
>

export function readAccountSyncMetadata(
  storage: SyncStorage,
): AccountSyncMetadata | null {
  try {
    const value = storage.getItem(
      ACCOUNT_SYNC_METADATA_STORAGE_KEY,
    )

    if (!value) {
      return null
    }

    const parsed = JSON.parse(value) as unknown

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null
    }

    const record = parsed as Record<
      string,
      unknown
    >

    if (
      record.formatVersion !== '1.0' ||
      typeof record.userId !== 'string' ||
      typeof record.deviceId !== 'string' ||
      !(
        record.serverRevision === null ||
        (typeof record.serverRevision ===
          'number' &&
          Number.isInteger(
            record.serverRevision,
          ))
      )
    ) {
      return null
    }

    return parsed as AccountSyncMetadata
  } catch {
    return null
  }
}

function findLatestTimestamp(
  value: unknown,
): number {
  if (Array.isArray(value)) {
    return value.reduce(
      (latest, item) =>
        Math.max(
          latest,
          findLatestTimestamp(item),
        ),
      Number.NEGATIVE_INFINITY,
    )
  }

  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return Number.NEGATIVE_INFINITY
  }

  const record = value as Record<string, unknown>
  let latest = Number.NEGATIVE_INFINITY

  for (const key of [
    'deletedAt',
    'updatedAt',
    'createdAt',
  ]) {
    if (typeof record[key] === 'string') {
      const timestamp = Date.parse(record[key])

      if (!Number.isNaN(timestamp)) {
        latest = Math.max(latest, timestamp)
      }
    }
  }

  for (const item of Object.values(record)) {
    latest = Math.max(
      latest,
      findLatestTimestamp(item),
    )
  }

  return latest
}

function readValueUpdatedAt(
  value: string,
  fallback: string,
  previousUpdatedAt?: string,
  previousHash?: string,
) {
  try {
    const latest = findLatestTimestamp(
      JSON.parse(value),
    )

    if (Number.isFinite(latest)) {
      return new Date(latest).toISOString()
    }

    return previousUpdatedAt &&
      previousHash === hashStorageValue(value)
      ? previousUpdatedAt
      : fallback
  } catch {
    return previousUpdatedAt &&
      previousHash === hashStorageValue(value)
      ? previousUpdatedAt
      : fallback
  }
}

function hashStorageValue(value: string) {
  let hash = 2_166_136_261

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }

  return (hash >>> 0).toString(36)
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function getSyncRecordIdentity(
  value: Record<string, unknown>,
) {
  if (typeof value.id === 'string' && value.id) {
    return value.id
  }

  if (
    typeof value.date === 'string' &&
    typeof value.type === 'string'
  ) {
    return `${value.date}:${value.type}`
  }

  return null
}

function parseSyncRecordArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown

    if (
      !Array.isArray(parsed) ||
      !parsed.every(
        (item) =>
          isRecord(item) &&
          getSyncRecordIdentity(item) !== null,
      )
    ) {
      return null
    }

    return parsed as Record<string, unknown>[]
  } catch {
    return null
  }
}

function materializeSnapshotValue(value: string) {
  const records = parseSyncRecordArray(value)

  if (!records) {
    return value
  }

  const visibleRecords = records.filter(
    (record) =>
      typeof record.deletedAt !== 'string',
  )

  return visibleRecords.length === records.length
    ? value
    : JSON.stringify(visibleRecords)
}

function appendMetadataRecordTombstones(
  key: string,
  value: string,
  capturedAt: string,
  metadata: AccountSyncMetadata | null,
) {
  const records = parseSyncRecordArray(value)
  const syncedRecords = metadata?.syncedRecords?.[key]

  if (!records || !syncedRecords) {
    return value
  }

  const currentIdentities = new Set(
    records.map((record) =>
      getSyncRecordIdentity(record),
    ),
  )
  const tombstones = Object.entries(syncedRecords)
    .filter(
      ([identity]) =>
        !currentIdentities.has(identity),
    )
    .map(([identity, version]) => {
      const deletedAt =
        version.deletedAt ?? capturedAt

      return {
        id: identity,
        updatedAt: deletedAt,
        deletedAt,
      }
    })

  return tombstones.length === 0
    ? value
    : JSON.stringify([...records, ...tombstones])
}

function collectSyncedRecordVersions(
  snapshot: AccountSyncSnapshot,
) {
  const syncedRecords: NonNullable<
    AccountSyncMetadata['syncedRecords']
  > = {}

  snapshot.entries.forEach((entry) => {
    if (entry.value === null || entry.deletedAt) {
      return
    }

    const records = parseSyncRecordArray(entry.value)

    if (!records) {
      return
    }

    const versions = Object.fromEntries(
      records.flatMap((record) => {
        const identity = getSyncRecordIdentity(record)
        const updatedAt =
          typeof record.updatedAt === 'string' &&
          !Number.isNaN(Date.parse(record.updatedAt))
            ? record.updatedAt
            : entry.updatedAt
        const deletedAt =
          typeof record.deletedAt === 'string' &&
          !Number.isNaN(Date.parse(record.deletedAt))
            ? record.deletedAt
            : null

        return identity
          ? [[identity, { updatedAt, deletedAt }]]
          : []
      }),
    )

    if (Object.keys(versions).length > 0) {
      syncedRecords[entry.key] = versions
    }
  })

  return syncedRecords
}

function isSyncableKey(key: string) {
  const policy = classifyAccountStorageKey(key)

  return (
    policy.scope === 'account' &&
    policy.conflictStrategy !==
      'server-authoritative'
  )
}

export function captureAccountSyncSnapshot(
  storage: SyncStorage,
  capturedAt = new Date().toISOString(),
  expectedUserId?: string,
): AccountSyncSnapshot {
  const entries: AccountSyncSnapshotEntry[] = []
  const currentKeys = new Set<string>()
  const storedMetadata =
    readAccountSyncMetadata(storage)
  const metadata =
    expectedUserId &&
    storedMetadata?.userId !== expectedUserId
      ? null
      : storedMetadata
  const previouslyDeletedKeys = new Set(
    Array.isArray(metadata?.deletedKeys)
      ? metadata.deletedKeys.filter(
          (key): key is string =>
            typeof key === 'string',
        )
      : [],
  )
  const previouslySyncedKeys =
    metadata?.syncedKeys &&
    typeof metadata.syncedKeys === 'object' &&
    !Array.isArray(metadata.syncedKeys)
      ? metadata.syncedKeys
      : {}
  const previouslySyncedValueHashes =
    metadata?.syncedValueHashes &&
    typeof metadata.syncedValueHashes ===
      'object' &&
    !Array.isArray(metadata.syncedValueHashes)
      ? metadata.syncedValueHashes
      : {}

  for (
    let index = 0;
    index < storage.length;
    index += 1
  ) {
    const key = storage.key(index)

    if (!key || !isSyncableKey(key)) {
      continue
    }

    const value = storage.getItem(key)

    if (value === null) {
      continue
    }

    currentKeys.add(key)
    const snapshotValue =
      appendMetadataRecordTombstones(
        key,
        value,
        capturedAt,
        metadata,
      )
    entries.push({
      key,
      value: snapshotValue,
      updatedAt: readValueUpdatedAt(
        snapshotValue,
        capturedAt,
        previouslySyncedKeys[key],
        previouslySyncedValueHashes[key],
      ),
      deletedAt: null,
    })
  }

  Object.entries(
    previouslySyncedKeys,
  ).forEach(([key, updatedAt]) => {
    if (
      isSyncableKey(key) &&
      !currentKeys.has(key)
    ) {
      entries.push({
        key,
        value: null,
        updatedAt,
        deletedAt:
          previouslyDeletedKeys.has(key)
            ? updatedAt
            : capturedAt,
      })
    }
  })

  return {
    formatVersion: '1.0',
    capturedAt,
    entries,
  }
}

export function applyAccountSyncSnapshot(
  storage: SyncStorage,
  snapshot: AccountSyncSnapshot,
) {
  let changed = false

  snapshot.entries.forEach((entry) => {
    const current = storage.getItem(entry.key)

    if (entry.deletedAt) {
      if (current !== null) {
        storage.removeItem(entry.key)
        changed = true
      }
      return
    }

    if (entry.value !== null) {
      const materializedValue =
        materializeSnapshotValue(entry.value)

      if (current === materializedValue) {
        return
      }

      storage.setItem(entry.key, materializedValue)
      changed = true
    }
  })

  return changed
}

export function createAccountSyncStorageFingerprint(
  storage: SyncStorage,
) {
  const values: string[] = []

  for (
    let index = 0;
    index < storage.length;
    index += 1
  ) {
    const key = storage.key(index)

    if (!key || !isSyncableKey(key)) {
      continue
    }

    const value = storage.getItem(key)

    if (value !== null) {
      values.push(`${key}\u0000${value}`)
    }
  }

  return hashStorageValue(values.sort().join('\u0001'))
}

export function markAccountSyncPending(
  storage: SyncStorage,
  identity: {
    userId: string
    deviceId: string
  },
) {
  const current = readAccountSyncMetadata(storage)

  if (current && current.userId !== identity.userId) {
    return false
  }

  const next: AccountSyncMetadata = current
    ? {
        ...current,
        deviceId: identity.deviceId,
        pendingChanges: Math.max(
          1,
          current.pendingChanges,
        ),
      }
    : {
        formatVersion: '1.0',
        userId: identity.userId,
        deviceId: identity.deviceId,
        serverRevision: null,
        lastSyncedAt: null,
        pendingChanges: 1,
        syncedKeys: {},
        deletedKeys: [],
        syncedValueHashes: {},
      }

  storage.setItem(
    ACCOUNT_SYNC_METADATA_STORAGE_KEY,
    JSON.stringify(next),
  )
  return true
}

function parseSyncResponse(
  value: unknown,
): AccountSyncResponse | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return null
  }

  const record = value as Record<string, unknown>
  const snapshot = parseAccountSyncSnapshot(
    record.snapshot,
  )

  if (
    typeof record.revision !== 'number' ||
    !Number.isInteger(record.revision) ||
    record.revision < 0 ||
    typeof record.syncedAt !== 'string' ||
    Number.isNaN(Date.parse(record.syncedAt)) ||
    !snapshot
  ) {
    return null
  }

  return {
    revision: record.revision,
    snapshot,
    syncedAt: record.syncedAt,
  }
}

export async function syncAccountStorage(
  input: {
    storage: SyncStorage
    userId: string
    deviceId: string
    fetcher?: typeof fetch
    signal?: AbortSignal
  },
) {
  const metadata = readAccountSyncMetadata(
    input.storage,
  )

  if (metadata && metadata.userId !== input.userId) {
    throw new Error('ACCOUNT_SYNC_USER_MISMATCH')
  }

  const storageFingerprintAtRequest =
    createAccountSyncStorageFingerprint(
      input.storage,
    )
  const snapshot = captureAccountSyncSnapshot(
    input.storage,
    new Date().toISOString(),
    input.userId,
  )
  const response = await (
    input.fetcher ?? fetch
  )('/api/account/sync', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    ...(input.signal
      ? { signal: input.signal }
      : {}),
    body: JSON.stringify({
      baseRevision:
        metadata?.serverRevision ?? null,
      snapshot,
    }),
  })

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? 'AUTH_REQUIRED'
        : 'ACCOUNT_SYNC_FAILED',
    )
  }

  const result = parseSyncResponse(
    (await response.json()) as unknown,
  )

  if (!result) {
    throw new Error('ACCOUNT_SYNC_RESPONSE_INVALID')
  }

  const latestLocalSnapshot =
    captureAccountSyncSnapshot(
      input.storage,
      new Date().toISOString(),
      input.userId,
    )
  const pendingLocalChanges =
    createAccountSyncStorageFingerprint(
      input.storage,
    ) !== storageFingerprintAtRequest
  const snapshotToApply = pendingLocalChanges
    ? mergeAccountSyncSnapshots(
        latestLocalSnapshot,
        result.snapshot,
      )
    : result.snapshot
  const changedKeys = snapshotToApply.entries
    .filter((entry) => {
      const current = input.storage.getItem(entry.key)

      return entry.deletedAt
        ? current !== null
        : entry.value !== null &&
            current !==
              materializeSnapshotValue(entry.value)
    })
    .map((entry) => entry.key)
  const changed = applyAccountSyncSnapshot(
    input.storage,
    snapshotToApply,
  )
  const syncedKeys = Object.fromEntries(
    result.snapshot.entries.map((entry) => [
      entry.key,
      entry.updatedAt,
    ]),
  )
  const deletedKeys = result.snapshot.entries
    .filter((entry) => entry.deletedAt !== null)
    .map((entry) => entry.key)
  const syncedValueHashes = Object.fromEntries(
    result.snapshot.entries
      .filter(
        (entry) =>
          entry.deletedAt === null &&
          entry.value !== null,
      )
      .map((entry) => [
        entry.key,
        hashStorageValue(
          materializeSnapshotValue(entry.value!),
        ),
      ]),
  )
  const nextMetadata: AccountSyncMetadata = {
    formatVersion: '1.0',
    userId: input.userId,
    deviceId: input.deviceId,
    serverRevision: result.revision,
    lastSyncedAt: result.syncedAt,
    pendingChanges: 0,
    syncedKeys,
    deletedKeys,
    syncedValueHashes,
    syncedRecords:
      collectSyncedRecordVersions(result.snapshot),
  }

  input.storage.setItem(
    ACCOUNT_SYNC_METADATA_STORAGE_KEY,
    JSON.stringify(nextMetadata),
  )

  return {
    changed,
    revision: result.revision,
    changedKeys,
    pendingLocalChanges,
  }
}
