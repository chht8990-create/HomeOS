import type {
  AccountSyncRecord,
  AccountSyncStoragePolicy,
  InitialAccountSyncStrategy,
} from '../types/accountSync.js'

export const ACCOUNT_SYNC_FORMAT_VERSION = '1.0'
export const ACCOUNT_SYNC_METADATA_STORAGE_KEY =
  'today-table.account-sync.v1'

export const accountSyncStoragePolicies: readonly AccountSyncStoragePolicy[] =
  [
    {
      match: 'exact',
      storageKey: 'homeos.inventory',
      scope: 'account',
      dataset: 'inventory',
      conflictStrategy: 'record-updated-at',
    },
    {
      match: 'exact',
      storageKey: 'homeos.shopping.items',
      scope: 'account',
      dataset: 'shopping',
      conflictStrategy: 'record-updated-at',
    },
    {
      match: 'exact',
      storageKey: 'homeos.mealPlan.items',
      scope: 'account',
      dataset: 'meal-plan',
      conflictStrategy: 'slot-updated-at',
    },
    {
      match: 'prefix',
      storageKey: 'homeos.meal.',
      scope: 'account',
      dataset: 'meal',
      conflictStrategy: 'slot-updated-at',
    },
    {
      match: 'exact',
      storageKey: 'homeos.recipes.imported',
      scope: 'account',
      dataset: 'recipes',
      conflictStrategy: 'record-updated-at',
    },
    {
      match: 'exact',
      storageKey: 'today-table.aiRecipes.v1',
      scope: 'account',
      dataset: 'recipes',
      conflictStrategy: 'record-updated-at',
    },
    {
      match: 'prefix',
      storageKey: 'homeos.mealPack.',
      scope: 'account',
      dataset: 'meal-pack',
      conflictStrategy: 'record-updated-at',
    },
    {
      match: 'prefix',
      storageKey: 'homeos.recommendation.',
      scope: 'account',
      dataset: 'recommendation',
      conflictStrategy: 'record-updated-at',
    },
    {
      match: 'exact',
      storageKey: 'today-table.ai-access.v1',
      scope: 'account',
      dataset: 'ai-access',
      conflictStrategy: 'server-authoritative',
    },
    {
      match: 'exact',
      storageKey: 'today-table.aiMealPlanTrial.v1',
      scope: 'account',
      dataset: 'ai-meal-plan-trial',
      conflictStrategy: 'server-authoritative',
    },
    {
      match: 'exact',
      storageKey: 'today-table.measurement-tools.v1',
      scope: 'account',
      dataset: 'measurement-preferences',
      conflictStrategy: 'record-updated-at',
    },
    {
      match: 'exact',
      storageKey: 'today-table.tutorial-settings.v1',
      scope: 'device',
    },
    {
      match: 'exact',
      storageKey: 'today-table.mealPlanWelcome.v1',
      scope: 'device',
    },
    {
      match: 'exact',
      storageKey: 'today-table.planner.sections.v1',
      scope: 'device',
    },
    {
      match: 'exact',
      storageKey: 'today-table.shopping.purchase-help.v1',
      scope: 'device',
    },
    {
      match: 'exact',
      storageKey:
        ACCOUNT_SYNC_METADATA_STORAGE_KEY,
      scope: 'device',
    },
  ]

export function classifyAccountStorageKey(
  storageKey: string,
): AccountSyncStoragePolicy {
  const policy = accountSyncStoragePolicies.find(
    (candidate) =>
      candidate.match === 'exact'
        ? candidate.storageKey === storageKey
        : storageKey.startsWith(
            candidate.storageKey,
          ),
  )

  return (
    policy ?? {
      match: 'exact',
      storageKey,
      scope: 'unsupported',
    }
  )
}

export function chooseInitialAccountSyncStrategy(
  hasLocalData: boolean,
  hasRemoteData: boolean,
): InitialAccountSyncStrategy {
  if (hasLocalData && hasRemoteData) {
    return 'merge'
  }

  if (hasLocalData) {
    return 'upload-local'
  }

  if (hasRemoteData) {
    return 'restore-remote'
  }

  return 'nothing'
}

function getRecordTimestamp(
  record: AccountSyncRecord,
) {
  const timestamp = record.deletedAt ?? record.updatedAt
  const milliseconds = Date.parse(timestamp)

  return Number.isNaN(milliseconds)
    ? Number.NEGATIVE_INFINITY
    : milliseconds
}

export function resolveLatestAccountSyncRecord<T>(
  localRecord: AccountSyncRecord<T>,
  remoteRecord: AccountSyncRecord<T>,
) {
  const localTimestamp =
    getRecordTimestamp(localRecord)
  const remoteTimestamp =
    getRecordTimestamp(remoteRecord)

  if (localTimestamp > remoteTimestamp) {
    return {
      source: 'local' as const,
      record: {
        ...localRecord,
      },
    }
  }

  return {
    source: 'remote' as const,
    record: {
      ...remoteRecord,
    },
  }
}
