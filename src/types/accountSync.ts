export type AccountSyncDataset =
  | 'inventory'
  | 'shopping'
  | 'meal-plan'
  | 'meal'
  | 'recipes'
  | 'meal-pack'
  | 'recommendation'
  | 'ai-access'
  | 'ai-meal-plan-trial'
  | 'measurement-preferences'

export type AccountSyncConflictStrategy =
  | 'record-updated-at'
  | 'slot-updated-at'
  | 'server-authoritative'

export type AccountSyncStorageScope =
  | 'account'
  | 'device'
  | 'unsupported'

export type AccountSyncStoragePolicy = {
  match: 'exact' | 'prefix'
  storageKey: string
  scope: AccountSyncStorageScope
  dataset?: AccountSyncDataset
  conflictStrategy?: AccountSyncConflictStrategy
}

export type AccountSyncRecord<T = unknown> = {
  id: string
  value: T
  updatedAt: string
  deletedAt?: string
}

export type AccountSyncEnvelope<T = unknown> = {
  formatVersion: '1.0'
  userId: string
  deviceId: string
  dataset: AccountSyncDataset
  baseRevision: number | null
  capturedAt: string
  records: AccountSyncRecord<T>[]
}

export type AccountSyncMetadata = {
  formatVersion: '1.0'
  userId: string
  deviceId: string
  serverRevision: number | null
  lastSyncedAt: string | null
  pendingChanges: number
  syncedKeys?: Record<string, string>
  deletedKeys?: string[]
  syncedValueHashes?: Record<string, string>
  syncedRecords?: Record<
    string,
    Record<
      string,
      {
        updatedAt: string
        deletedAt: string | null
      }
    >
  >
}

export type InitialAccountSyncStrategy =
  | 'nothing'
  | 'upload-local'
  | 'restore-remote'
  | 'merge'

export type AccountSyncSnapshotEntry = {
  key: string
  value: string | null
  updatedAt: string
  deletedAt: string | null
}

export type AccountSyncSnapshot = {
  formatVersion: '1.0'
  capturedAt: string
  entries: AccountSyncSnapshotEntry[]
}

export type AccountSyncRequest = {
  baseRevision: number | null
  snapshot: AccountSyncSnapshot
}

export type AccountSyncResponse = {
  revision: number
  snapshot: AccountSyncSnapshot
  syncedAt: string
}
