import { createPostgresBusinessRepository } from './postgresBusinessRepository.js'
import type { ServerBusinessRepository } from '../types/business.js'

export type BusinessRuntimeEnvironment = {
  DATABASE_URL?: string
  ADMIN_USER_IDS?: string
}

let cachedDatabaseUrl: string | null = null
let cachedRepository: ServerBusinessRepository | null = null

export function getBusinessRepository(
  environment: BusinessRuntimeEnvironment,
) {
  const databaseUrl = environment.DATABASE_URL?.trim()

  if (!databaseUrl) {
    return null
  }

  if (
    cachedRepository &&
    cachedDatabaseUrl === databaseUrl
  ) {
    return cachedRepository
  }

  cachedDatabaseUrl = databaseUrl
  cachedRepository =
    createPostgresBusinessRepository(databaseUrl)

  return cachedRepository
}

export function parseAdminUserIds(
  environment: BusinessRuntimeEnvironment,
) {
  return new Set(
    (environment.ADMIN_USER_IDS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  )
}

export function isAdminUser(
  userId: string,
  environment: BusinessRuntimeEnvironment,
) {
  return parseAdminUserIds(environment).has(userId)
}
