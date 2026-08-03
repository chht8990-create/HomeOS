import { classifyAccountStorageKey } from './accountSyncEngine.js'
import type {
  AccountSyncSnapshot,
  AccountSyncSnapshotEntry,
} from '../types/accountSync.js'

const MAX_SYNC_ENTRIES = 500
const MAX_SYNC_VALUE_BYTES = 500_000

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    !Number.isNaN(Date.parse(value))
  )
}

function isAllowedSyncKey(key: string) {
  const policy = classifyAccountStorageKey(key)

  return (
    policy.scope === 'account' &&
    policy.conflictStrategy !==
      'server-authoritative'
  )
}

function parseEntry(
  value: unknown,
): AccountSyncSnapshotEntry | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    typeof value.key !== 'string' ||
    !isAllowedSyncKey(value.key) ||
    (value.value !== null &&
      typeof value.value !== 'string') ||
    !isIsoDate(value.updatedAt) ||
    (value.deletedAt !== null &&
      !isIsoDate(value.deletedAt)) ||
    (value.deletedAt === null &&
      value.value === null)
  ) {
    return null
  }

  if (
    typeof value.value === 'string' &&
    new TextEncoder().encode(value.value).length >
      MAX_SYNC_VALUE_BYTES
  ) {
    return null
  }

  return {
    key: value.key,
    value: value.value,
    updatedAt: value.updatedAt,
    deletedAt: value.deletedAt,
  }
}

export function parseAccountSyncSnapshot(
  value: unknown,
): AccountSyncSnapshot | null {
  if (
    !isRecord(value) ||
    value.formatVersion !== '1.0' ||
    !isIsoDate(value.capturedAt) ||
    !Array.isArray(value.entries) ||
    value.entries.length > MAX_SYNC_ENTRIES
  ) {
    return null
  }

  const entries = value.entries.map(parseEntry)

  if (
    entries.some((entry) => entry === null)
  ) {
    return null
  }

  const parsedEntries =
    entries as AccountSyncSnapshotEntry[]
  const uniqueKeys = new Set(
    parsedEntries.map((entry) => entry.key),
  )

  if (uniqueKeys.size !== parsedEntries.length) {
    return null
  }

  return {
    formatVersion: '1.0',
    capturedAt: value.capturedAt,
    entries: parsedEntries.map((entry) => ({
      ...entry,
    })),
  }
}

function entryTimestamp(
  entry: AccountSyncSnapshotEntry,
) {
  return Date.parse(
    entry.deletedAt ?? entry.updatedAt,
  )
}

function getRecordIdentity(
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

function getRecordTimestamp(
  value: Record<string, unknown>,
) {
  for (const key of ['deletedAt', 'updatedAt']) {
    if (typeof value[key] === 'string') {
      const timestamp = Date.parse(value[key])

      if (!Number.isNaN(timestamp)) {
        return timestamp
      }
    }
  }

  return Number.NEGATIVE_INFINITY
}

function parseRecordArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown

    if (
      !Array.isArray(parsed) ||
      !parsed.every(
        (item) =>
          isRecord(item) &&
          getRecordIdentity(item) !== null,
      )
    ) {
      return null
    }

    return parsed as Record<string, unknown>[]
  } catch {
    return null
  }
}

function mergeRecordValues(
  local: AccountSyncSnapshotEntry,
  remote: AccountSyncSnapshotEntry,
) {
  if (
    local.value === null ||
    remote.value === null ||
    local.deletedAt ||
    remote.deletedAt
  ) {
    return null
  }

  const policy = classifyAccountStorageKey(
    local.key,
  )

  if (
    policy.conflictStrategy !==
      'record-updated-at' &&
    policy.conflictStrategy !==
      'slot-updated-at'
  ) {
    return null
  }

  const localRecords = parseRecordArray(local.value)
  const remoteRecords = parseRecordArray(
    remote.value,
  )

  if (!localRecords || !remoteRecords) {
    return null
  }

  const records = new Map<
    string,
    Record<string, unknown>
  >()

  remoteRecords.forEach((record) => {
    records.set(getRecordIdentity(record)!, record)
  })
  localRecords.forEach((record) => {
    const identity = getRecordIdentity(record)!
    const current = records.get(identity)

    if (
      !current ||
      getRecordTimestamp(record) >
        getRecordTimestamp(current)
    ) {
      records.set(identity, record)
    }
  })

  return {
    key: local.key,
    value: JSON.stringify([...records.values()]),
    updatedAt: new Date(
      Math.max(
        Date.parse(local.updatedAt),
        Date.parse(remote.updatedAt),
      ),
    ).toISOString(),
    deletedAt: null,
  } satisfies AccountSyncSnapshotEntry
}

function createRecordTombstone(
  identity: string,
  deletedAt: string,
  previousRecord?: Record<string, unknown>,
) {
  const requestedTimestamp = Date.parse(deletedAt)
  const previousTimestamp = previousRecord
    ? getRecordTimestamp(previousRecord)
    : Number.NEGATIVE_INFINITY
  const authoritativeDeletedAt = new Date(
    Math.max(
      requestedTimestamp,
      Number.isFinite(previousTimestamp)
        ? previousTimestamp + 1
        : requestedTimestamp,
    ),
  ).toISOString()

  return {
    id: identity,
    updatedAt: authoritativeDeletedAt,
    deletedAt: authoritativeDeletedAt,
  }
}

export function addRecordDeletionTombstones(
  local: AccountSyncSnapshot,
  remote: AccountSyncSnapshot | null,
  deletedAt: string = new Date().toISOString(),
): AccountSyncSnapshot {
  if (!remote) {
    return local
  }

  const remoteEntries = new Map(
    remote.entries.map((entry) => [entry.key, entry]),
  )

  return {
    ...local,
    entries: local.entries.map((entry) => {
      const remoteEntry = remoteEntries.get(entry.key)

      if (
        !remoteEntry ||
        entry.deletedAt ||
        remoteEntry.deletedAt ||
        entry.value === null ||
        remoteEntry.value === null
      ) {
        return entry
      }

      const localRecords = parseRecordArray(entry.value)
      const remoteRecords = parseRecordArray(
        remoteEntry.value,
      )

      if (!localRecords || !remoteRecords) {
        return entry
      }

      const remoteActiveRecords = new Map(
        remoteRecords
          .filter((record) => !record.deletedAt)
          .map((record) => [
            getRecordIdentity(record)!,
            record,
          ]),
      )
      let refreshedTombstone = false
      const timestampedLocalRecords = localRecords.map(
        (record) => {
          const identity = getRecordIdentity(record)!

          if (
            record.deletedAt &&
            remoteActiveRecords.has(identity)
          ) {
            refreshedTombstone = true
            return createRecordTombstone(
              identity,
              deletedAt,
              remoteActiveRecords.get(identity),
            )
          }

          return record
        },
      )
      const localIdentities = new Set(
        timestampedLocalRecords.map((record) =>
          getRecordIdentity(record),
        ),
      )
      const missingRecords = remoteRecords.filter(
        (record) =>
          !record.deletedAt &&
          !localIdentities.has(
            getRecordIdentity(record),
          ),
      )

      if (
        missingRecords.length === 0 &&
        !refreshedTombstone
      ) {
        return entry
      }

      const tombstones = missingRecords.map((record) =>
        createRecordTombstone(
          getRecordIdentity(record)!,
          deletedAt,
          record,
        ),
      )

      return {
        ...entry,
        value: JSON.stringify([
          ...timestampedLocalRecords,
          ...tombstones,
        ]),
        updatedAt: deletedAt,
      }
    }),
  }
}

export function mergeAccountSyncSnapshots(
  local: AccountSyncSnapshot,
  remote: AccountSyncSnapshot | null,
  mergedAt: string = new Date().toISOString(),
): AccountSyncSnapshot {
  const merged = new Map<
    string,
    AccountSyncSnapshotEntry
  >()

  remote?.entries.forEach((entry) => {
    merged.set(entry.key, { ...entry })
  })

  local.entries.forEach((entry) => {
    const existing = merged.get(entry.key)
    const mergedRecords = existing
      ? mergeRecordValues(entry, existing)
      : null

    if (mergedRecords) {
      merged.set(entry.key, mergedRecords)
    } else if (
      !existing ||
      entryTimestamp(entry) >
        entryTimestamp(existing)
    ) {
      merged.set(entry.key, { ...entry })
    }
  })

  return {
    formatVersion: '1.0',
    capturedAt: mergedAt,
    entries: [...merged.values()].sort(
      (left, right) =>
        left.key.localeCompare(right.key),
    ),
  }
}
