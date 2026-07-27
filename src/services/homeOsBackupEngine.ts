import { parseMealPlans } from './mealPlanEngine'
import { parseRecipeCollection } from './mealPackEngine'

export const HOMEOS_BACKUP_FORMAT_VERSION = '1.0'

export type HomeOsBackupData = {
  inventory: unknown[]
  shopping: unknown[]
  planner: unknown[]
  recipes: unknown[]
  meals: Record<string, unknown>
  mealPack: Record<string, unknown>
  recommendation: Record<string, unknown>
  additional: Record<string, unknown>
}

export type HomeOsBackup = {
  formatVersion: string
  exportedAt: string
  data: HomeOsBackupData
}

export type HomeOsBackupParseResult =
  | {
      success: true
      backup: HomeOsBackup
    }
  | {
      success: false
      errors: string[]
    }

const inventoryStorageKey = 'homeos.inventory'
const shoppingStorageKey = 'homeos.shopping.items'
const plannerStorageKey = 'homeos.mealPlan.items'
const recipesStorageKey = 'homeos.recipes.imported'
const fixedStorageKeys = new Set([
  inventoryStorageKey,
  shoppingStorageKey,
  plannerStorageKey,
  recipesStorageKey,
])

type UnknownRecord = Record<string, unknown>

function isSensitiveStorageKey(key: string) {
  return /password|token|secret|credential|authorization|session/i.test(
    key,
  )
}

function asRecord(value: unknown): UnknownRecord | null {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return null
  }

  return value as UnknownRecord
}

function parseStorageValue(
  value: string | undefined,
  fallback: unknown,
) {
  if (value === undefined) {
    return fallback
  }

  try {
    return JSON.parse(value) as unknown
  } catch {
    return value
  }
}

function isInventoryItem(value: unknown) {
  const item = asRecord(value)

  return Boolean(
    item &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.quantity === 'number' &&
      Number.isFinite(item.quantity) &&
      typeof item.unit === 'string' &&
      (item.location === 'fridge' ||
        item.location === 'freezer' ||
        item.location === 'pantry') &&
      typeof item.createdAt === 'string' &&
      typeof item.updatedAt === 'string',
  )
}

function isShoppingItem(value: unknown) {
  const item = asRecord(value)

  return Boolean(
    item &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.completed === 'boolean' &&
      (item.source === undefined ||
        item.source === 'manual' ||
        item.source === 'meal') &&
      (item.quantity === undefined ||
        (typeof item.quantity === 'number' &&
          Number.isFinite(item.quantity))) &&
      (item.unit === undefined ||
        typeof item.unit === 'string') &&
      (item.sourceId === undefined ||
        typeof item.sourceId === 'string') &&
      typeof item.createdAt === 'string' &&
      typeof item.updatedAt === 'string',
  )
}

function isStoredMeal(value: unknown) {
  const meal = asRecord(value)
  const isMealType =
    meal?.type === 'breakfast' ||
    meal?.type === 'lunch' ||
    meal?.type === 'dinner' ||
    meal?.type === 'snack'

  return Boolean(
    meal &&
      typeof meal.id === 'string' &&
      typeof meal.date === 'string' &&
      isMealType &&
      (meal.status === 'planned' ||
        meal.status === 'skipped') &&
      (meal.status !== 'planned' ||
        typeof meal.name === 'string') &&
      typeof meal.createdAt === 'string' &&
      typeof meal.updatedAt === 'string',
  )
}

function isSection(
  value: unknown,
  keyMatches: (key: string) => boolean,
  valueMatches: (value: unknown) => boolean = () =>
    true,
) {
  const section = asRecord(value)

  return Boolean(
    section &&
      Object.entries(section).every(
        ([key, item]) =>
          keyMatches(key) && valueMatches(item),
      ),
  )
}

function readArray(
  value: unknown,
  itemMatches: (item: unknown) => boolean,
) {
  return (
    Array.isArray(value) &&
    value.every(itemMatches)
  )
}

function collectSection(
  storage: Record<string, string>,
  keyMatches: (key: string) => boolean,
) {
  return Object.fromEntries(
    Object.entries(storage)
      .filter(
        ([key]) =>
          keyMatches(key) &&
          !isSensitiveStorageKey(key),
      )
      .map(([key, value]) => [
        key,
        parseStorageValue(value, null),
      ]),
  )
}

export function createHomeOsBackup(
  storage: Record<string, string>,
  exportedAt = new Date().toISOString(),
): HomeOsBackup {
  const knownDynamicKey = (key: string) =>
    key.startsWith('homeos.meal.') ||
    key.startsWith('homeos.mealPack.') ||
    key.startsWith('homeos.recommendation.')

  return {
    formatVersion: HOMEOS_BACKUP_FORMAT_VERSION,
    exportedAt,
    data: {
      inventory: parseStorageValue(
        storage[inventoryStorageKey],
        [],
      ) as unknown[],
      shopping: parseStorageValue(
        storage[shoppingStorageKey],
        [],
      ) as unknown[],
      planner: parseStorageValue(
        storage[plannerStorageKey],
        [],
      ) as unknown[],
      recipes: parseStorageValue(
        storage[recipesStorageKey],
        [],
      ) as unknown[],
      meals: collectSection(
        storage,
        (key) => key.startsWith('homeos.meal.'),
      ),
      mealPack: collectSection(
        storage,
        (key) =>
          key.startsWith('homeos.mealPack.'),
      ),
      recommendation: collectSection(
        storage,
        (key) =>
          key.startsWith('homeos.recommendation.'),
      ),
      additional: collectSection(
        storage,
        (key) =>
          key.startsWith('homeos.') &&
          !fixedStorageKeys.has(key) &&
          !knownDynamicKey(key),
      ),
    },
  }
}

export function parseHomeOsBackupJson(
  json: string,
): HomeOsBackupParseResult {
  let value: unknown

  try {
    value = JSON.parse(json)
  } catch {
    return {
      success: false,
      errors: ['JSON 형식이 올바르지 않습니다.'],
    }
  }

  const backup = asRecord(value)

  if (!backup) {
    return {
      success: false,
      errors: ['백업 최상위 값은 객체여야 합니다.'],
    }
  }

  if (
    backup.formatVersion !==
    HOMEOS_BACKUP_FORMAT_VERSION
  ) {
    return {
      success: false,
      errors: [
        `지원하는 백업 형식 버전은 ${HOMEOS_BACKUP_FORMAT_VERSION}입니다.`,
      ],
    }
  }

  const errors: string[] = []
  const data = asRecord(backup.data)

  if (
    typeof backup.exportedAt !== 'string' ||
    Number.isNaN(Date.parse(backup.exportedAt))
  ) {
    errors.push(
      'exportedAt은 유효한 날짜·시간이어야 합니다.',
    )
  }

  if (!data) {
    errors.push('data 객체가 필요합니다.')
  } else {
    if (
      !readArray(data.inventory, isInventoryItem)
    ) {
      errors.push(
        'data.inventory 구조가 올바르지 않습니다.',
      )
    }

    if (!readArray(data.shopping, isShoppingItem)) {
      errors.push(
        'data.shopping 구조가 올바르지 않습니다.',
      )
    }

    if (
      !Array.isArray(data.planner) ||
      parseMealPlans(data.planner).length !==
        data.planner.length
    ) {
      errors.push(
        'data.planner 구조가 올바르지 않습니다.',
      )
    }

    if (
      !Array.isArray(data.recipes) ||
      parseRecipeCollection(data.recipes).length !==
        data.recipes.length
    ) {
      errors.push(
        'data.recipes 구조가 올바르지 않습니다.',
      )
    }

    if (
      !isSection(
        data.meals,
        (key) =>
          key.startsWith('homeos.meal.') &&
          !isSensitiveStorageKey(key),
        isStoredMeal,
      )
    ) {
      errors.push(
        'data.meals 구조가 올바르지 않습니다.',
      )
    }

    if (
      !isSection(
        data.mealPack,
        (key) =>
          key.startsWith('homeos.mealPack.') &&
          !isSensitiveStorageKey(key),
      )
    ) {
      errors.push(
        'data.mealPack 구조가 올바르지 않습니다.',
      )
    }

    if (
      !isSection(
        data.recommendation,
        (key) =>
          key.startsWith('homeos.recommendation.') &&
          !isSensitiveStorageKey(key),
      )
    ) {
      errors.push(
        'data.recommendation 구조가 올바르지 않습니다.',
      )
    }

    if (
      !isSection(
        data.additional,
        (key) =>
          key.startsWith('homeos.') &&
          !fixedStorageKeys.has(key) &&
          !isSensitiveStorageKey(key),
      )
    ) {
      errors.push(
        'data.additional 구조가 올바르지 않습니다.',
      )
    }
  }

  if (errors.length > 0 || !data) {
    return {
      success: false,
      errors,
    }
  }

  return {
    success: true,
    backup: {
      formatVersion:
        HOMEOS_BACKUP_FORMAT_VERSION,
      exportedAt: backup.exportedAt as string,
      data: data as HomeOsBackupData,
    },
  }
}

export function createStorageFromHomeOsBackup(
  backup: HomeOsBackup,
) {
  const storage: Record<string, string> = {
    [inventoryStorageKey]: JSON.stringify(
      backup.data.inventory,
    ),
    [shoppingStorageKey]: JSON.stringify(
      backup.data.shopping,
    ),
    [plannerStorageKey]: JSON.stringify(
      backup.data.planner,
    ),
    [recipesStorageKey]: JSON.stringify(
      backup.data.recipes,
    ),
  }

  const dynamicSections = [
    backup.data.meals,
    backup.data.mealPack,
    backup.data.recommendation,
    backup.data.additional,
  ]

  dynamicSections.forEach((section) => {
    Object.entries(section).forEach(
      ([key, value]) => {
        storage[key] = JSON.stringify(value)
      },
    )
  })

  return storage
}
