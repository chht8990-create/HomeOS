import { createPostgresIdentityRepository } from './postgresIdentityRepository.js'
import type { GoogleOAuthEnvironment } from '../types/googleOAuth.js'
import type { ServerApiDependencies } from './serverApiEngine.js'

export type ServerRuntimeEnvironment =
  GoogleOAuthEnvironment

let cachedDatabaseUrl: string | null = null
let cachedDependencies:
  | ServerApiDependencies
  | null = null

export function getServerApiDependencies(
  environment: ServerRuntimeEnvironment,
) {
  const databaseUrl =
    environment.DATABASE_URL?.trim()

  if (!databaseUrl) {
    return null
  }

  if (
    cachedDependencies &&
    cachedDatabaseUrl === databaseUrl
  ) {
    return cachedDependencies
  }

  cachedDatabaseUrl = databaseUrl
  cachedDependencies = {
    repository:
      createPostgresIdentityRepository(databaseUrl),
    async verifyGoogleAuthorizationCode() {
      throw new Error(
        'USE_GOOGLE_OAUTH_ROUTE_VERIFIER',
      )
    },
  }

  return cachedDependencies
}
