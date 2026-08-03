import {
  ACCOUNT_SYNC_METADATA_STORAGE_KEY,
  classifyAccountStorageKey,
} from './accountSyncEngine'

type NamespaceStorage = Pick<
  Storage,
  | 'length'
  | 'key'
  | 'getItem'
  | 'setItem'
  | 'removeItem'
>

const ACCOUNT_NAMESPACE_PREFIX =
  'today-table.account-storage.v1.'
const LEGACY_QUARANTINE_PREFIX =
  'today-table.account-storage-quarantine.v1.'
const MIGRATION_MARKER_PREFIX =
  'today-table.account-storage-migrated.v1.'

let activeIdentity: {
  storage: NamespaceStorage
  userId: string
} | null = null

function encodeKey(value: string) {
  return encodeURIComponent(value)
}

function decodeKey(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

function getNamespacePrefix(userId: string) {
  return `${ACCOUNT_NAMESPACE_PREFIX}${encodeKey(userId)}::`
}

function getNamespaceKey(
  userId: string,
  storageKey: string,
) {
  return `${getNamespacePrefix(userId)}${encodeKey(storageKey)}`
}

function getQuarantineOwnerToken(userId: string | null) {
  return userId ? `user-${encodeKey(userId)}` : 'unowned'
}

function getQuarantinePrefix(userId: string | null) {
  return `${LEGACY_QUARANTINE_PREFIX}${getQuarantineOwnerToken(userId)}::`
}

function getQuarantineKey(
  userId: string | null,
  storageKey: string,
) {
  return `${getQuarantinePrefix(userId)}${encodeKey(storageKey)}`
}

function getMigrationMarkerKey(userId: string) {
  return `${MIGRATION_MARKER_PREFIX}${encodeKey(userId)}`
}

function listStorageKeys(storage: NamespaceStorage) {
  const keys: string[] = []

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)

    if (key) {
      keys.push(key)
    }
  }

  return keys
}

export function isActiveAccountStorageKey(key: string) {
  return (
    key === ACCOUNT_SYNC_METADATA_STORAGE_KEY ||
    classifyAccountStorageKey(key).scope === 'account'
  )
}

function listActiveAccountStorageKeys(
  storage: NamespaceStorage,
) {
  return listStorageKeys(storage).filter(
    isActiveAccountStorageKey,
  )
}

function readMetadataUserId(storage: NamespaceStorage) {
  try {
    const raw = storage.getItem(
      ACCOUNT_SYNC_METADATA_STORAGE_KEY,
    )

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as unknown

    return typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      'userId' in parsed &&
      typeof parsed.userId === 'string'
      ? parsed.userId
      : null
  } catch {
    return null
  }
}

function copyValueOrThrow(
  storage: NamespaceStorage,
  sourceKey: string,
  destinationKey: string,
) {
  const value = storage.getItem(sourceKey)

  if (value === null) {
    return false
  }

  storage.setItem(destinationKey, value)

  if (storage.getItem(destinationKey) !== value) {
    throw new Error('ACCOUNT_STORAGE_NAMESPACE_WRITE_FAILED')
  }

  return true
}

function clearActiveAccountStorage(
  storage: NamespaceStorage,
) {
  const removedKeys = listActiveAccountStorageKeys(storage)

  removedKeys.forEach((key) => storage.removeItem(key))
  return removedKeys
}

export function hasAccountNamespace(
  storage: NamespaceStorage,
  userId: string,
) {
  const prefix = getNamespacePrefix(userId)

  return listStorageKeys(storage).some((key) =>
    key.startsWith(prefix),
  )
}

export function persistActiveAccountNamespace(
  storage: NamespaceStorage,
  userId: string,
) {
  const prefix = getNamespacePrefix(userId)
  const activeKeys = listActiveAccountStorageKeys(storage)
  const activeKeySet = new Set(activeKeys)

  activeKeys.forEach((key) => {
    copyValueOrThrow(
      storage,
      key,
      getNamespaceKey(userId, key),
    )
  })

  listStorageKeys(storage)
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => {
      const logicalKey = decodeKey(key.slice(prefix.length))

      if (!logicalKey || !activeKeySet.has(logicalKey)) {
        storage.removeItem(key)
      }
    })

  return activeKeys
}

function quarantineActiveAccountStorage(
  storage: NamespaceStorage,
  ownerUserId: string | null,
) {
  const activeKeys = listActiveAccountStorageKeys(storage)

  activeKeys.forEach((key) => {
    copyValueOrThrow(
      storage,
      key,
      getQuarantineKey(ownerUserId, key),
    )
  })

  clearActiveAccountStorage(storage)
  return activeKeys
}

function migrateOwnedQuarantine(
  storage: NamespaceStorage,
  userId: string,
) {
  const prefix = getQuarantinePrefix(userId)
  let migrated = false

  listStorageKeys(storage)
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => {
      const logicalKey = decodeKey(key.slice(prefix.length))

      if (!logicalKey) {
        return
      }

      const destinationKey = getNamespaceKey(userId, logicalKey)
      const destinationValue = storage.getItem(destinationKey)

      if (destinationValue === null) {
        copyValueOrThrow(storage, key, destinationKey)
        storage.removeItem(key)
        migrated = true
      } else if (destinationValue === storage.getItem(key)) {
        storage.removeItem(key)
      }
    })

  return migrated
}

function restoreNamespaceToActive(
  storage: NamespaceStorage,
  userId: string,
) {
  const prefix = getNamespacePrefix(userId)
  const restoredKeys: string[] = []

  listStorageKeys(storage)
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => {
      const logicalKey = decodeKey(key.slice(prefix.length))
      const value = storage.getItem(key)

      if (!logicalKey || value === null) {
        return
      }

      storage.setItem(logicalKey, value)
      restoredKeys.push(logicalKey)
    })

  return restoredKeys
}

function writeMigrationMarker(
  storage: NamespaceStorage,
  userId: string,
) {
  storage.setItem(
    getMigrationMarkerKey(userId),
    JSON.stringify({
      formatVersion: '1.0',
      completedAt: new Date().toISOString(),
    }),
  )
}

function hasMigrationMarker(
  storage: NamespaceStorage,
  userId: string,
) {
  return storage.getItem(
    getMigrationMarkerKey(userId),
  ) !== null
}

export function prepareAccountStorageForIdentity(
  storage: NamespaceStorage,
  userId: string,
) {
  const activeKeys = listActiveAccountStorageKeys(storage)
  const metadataUserId = readMetadataUserId(storage)
  const previousIdentity =
    activeIdentity?.storage === storage
      ? activeIdentity.userId
      : null
  let migratedLegacy = false
  let quarantinedLegacy = false

  if (activeKeys.length > 0) {
    const ownerUserId = previousIdentity ?? metadataUserId

    if (ownerUserId === userId) {
      const isLegacyMigration =
        !hasAccountNamespace(storage, userId) &&
        !hasMigrationMarker(storage, userId)

      persistActiveAccountNamespace(storage, userId)
      if (isLegacyMigration) {
        writeMigrationMarker(storage, userId)
        migratedLegacy = true
      }
      clearActiveAccountStorage(storage)
    } else {
      quarantineActiveAccountStorage(storage, ownerUserId)
      quarantinedLegacy = true
    }
  }

  if (migrateOwnedQuarantine(storage, userId)) {
    writeMigrationMarker(storage, userId)
    migratedLegacy = true
  }

  clearActiveAccountStorage(storage)
  const restoredKeys = restoreNamespaceToActive(storage, userId)

  activeIdentity = { storage, userId }

  return {
    userId,
    restoredKeys,
    hasNamespace: hasAccountNamespace(storage, userId),
    migratedLegacy,
    quarantinedLegacy,
  }
}

export function mirrorActiveAccountStorage() {
  if (!activeIdentity) {
    return []
  }

  return persistActiveAccountNamespace(
    activeIdentity.storage,
    activeIdentity.userId,
  )
}

export function deactivateAccountStorage(
  storage: NamespaceStorage,
  expectedUserId?: string,
) {
  const activeKeys = listActiveAccountStorageKeys(storage)
  const activeUserId =
    activeIdentity?.storage === storage
      ? activeIdentity.userId
      : null
  const metadataUserId = readMetadataUserId(storage)
  const ownerUserId = activeUserId ?? metadataUserId

  if (
    ownerUserId &&
    ((activeUserId && ownerUserId === activeUserId) ||
      (expectedUserId && ownerUserId === expectedUserId))
  ) {
    persistActiveAccountNamespace(storage, ownerUserId)
  } else if (activeKeys.length > 0) {
    quarantineActiveAccountStorage(storage, ownerUserId)
  }

  clearActiveAccountStorage(storage)
  activeIdentity = null
  return activeKeys
}

export function persistCurrentAccountStorage(
  storage: NamespaceStorage,
  userId: string,
) {
  if (
    !activeIdentity ||
    activeIdentity.storage !== storage ||
    activeIdentity.userId !== userId
  ) {
    return false
  }

  persistActiveAccountNamespace(storage, userId)
  return true
}

export function getAccountStorageNamespaceState(
  storage: NamespaceStorage,
  userId: string,
) {
  return {
    activeKeys: listActiveAccountStorageKeys(storage),
    namespaceKeys: listStorageKeys(storage)
      .filter((key) => key.startsWith(getNamespacePrefix(userId)))
      .map((key) => decodeKey(key.slice(getNamespacePrefix(userId).length)))
      .filter((key): key is string => Boolean(key)),
    quarantineKeys: listStorageKeys(storage).filter((key) =>
      key.startsWith(LEGACY_QUARANTINE_PREFIX),
    ),
  }
}
