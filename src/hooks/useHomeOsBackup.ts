import {
  createHomeOsBackup,
  createStorageFromHomeOsBackup,
  parseHomeOsBackupJson,
  type HomeOsBackup,
} from '../services/homeOsBackupEngine'

function readHomeOsStorage() {
  const storage: Record<string, string> = {}

  for (
    let index = 0;
    index < window.localStorage.length;
    index += 1
  ) {
    const key = window.localStorage.key(index)

    if (!key?.startsWith('homeos.')) {
      continue
    }

    const value = window.localStorage.getItem(key)

    if (value !== null) {
      storage[key] = value
    }
  }

  return storage
}

function createBackupFileName(
  prefix: string,
  exportedAt: string,
) {
  const timestamp = exportedAt
    .replace(/[:.]/g, '-')

  return `${prefix}-${timestamp}.json`
}

function downloadBackup(
  backup: HomeOsBackup,
  prefix: string,
) {
  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    {
      type: 'application/json',
    },
  )
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = createBackupFileName(
    prefix,
    backup.exportedAt,
  )
  anchor.click()
  URL.revokeObjectURL(url)
}

function useHomeOsBackup() {
  function createCurrentBackup() {
    return createHomeOsBackup(
      readHomeOsStorage(),
    )
  }

  function exportBackup() {
    const backup = createCurrentBackup()

    downloadBackup(backup, 'homeos-backup')
    return backup
  }

  function prepareImport(json: string) {
    return parseHomeOsBackupJson(json)
  }

  function applyImport(backup: HomeOsBackup) {
    const previousBackup = createCurrentBackup()

    downloadBackup(
      previousBackup,
      'homeos-backup-before-import',
    )

    const keysToRemove = Array.from(
      { length: window.localStorage.length },
      (_, index) => window.localStorage.key(index),
    ).filter(
      (key): key is string =>
        Boolean(key?.startsWith('homeos.')),
    )

    keysToRemove.forEach((key) => {
      window.localStorage.removeItem(key)
    })

    Object.entries(
      createStorageFromHomeOsBackup(backup),
    ).forEach(([key, value]) => {
      window.localStorage.setItem(key, value)
    })

    window.location.reload()
  }

  return {
    exportBackup,
    prepareImport,
    applyImport,
  }
}

export default useHomeOsBackup
