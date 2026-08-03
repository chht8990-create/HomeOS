import type {
  AiAccessPlan,
  AiGenerationKind,
} from './aiAccess.js'

export type ServerUser = {
  id: string
  googleSubject: string
  email: string
  emailVerified: boolean
  displayName: string
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

export type ServerDevice = {
  id: string
  userId: string
  deviceKey: string
  displayName?: string
  createdAt: string
  lastSeenAt: string
  revokedAt: string | null
}

export type ServerSession = {
  id: string
  userId: string
  deviceId: string
  tokenHash: string
  createdAt: string
  lastUsedAt: string
  rotatedAt: string
  expiresAt: string
  revokedAt: string | null
}

export type ServerAiUsage = {
  mealPlanCount: number
  recipeCount: number
  recommendationCount: number
  lastGenerationAt: string | null
}

export type ServerEntitlementSource =
  | 'none'
  | 'trial'
  | 'google-play'
  | 'admin'

export type ServerEntitlement = {
  userId: string
  plan: AiAccessPlan
  source: ServerEntitlementSource
  trialStartedAt: string | null
  trialEndsAt: string | null
  trialConsumedAt: string | null
  premiumExpiresAt: string | null
  usage: ServerAiUsage
  version: number
  updatedAt: string
}

export type VerifiedGoogleIdentity = {
  subject: string
  email: string
  emailVerified: boolean
  displayName: string
  avatarUrl?: string
}

export type ServerAiUsageIncrement = {
  kind: AiGenerationKind
  generatedAt: string
}

export type ServerAccountSnapshot = {
  userId: string
  revision: number
  data: unknown
  updatedAt: string
}

export type ServerStoredAuthContext = {
  session: ServerSession
  user: ServerUser
  entitlement: ServerEntitlement
}

export type ServerIdentityRepository = {
  findUserById(
    userId: string,
  ): Promise<ServerUser | null>
  findUserByGoogleSubject(
    googleSubject: string,
  ): Promise<ServerUser | null>
  saveUser(user: ServerUser): Promise<ServerUser>
  findDevice(
    userId: string,
    deviceKey: string,
  ): Promise<ServerDevice | null>
  saveDevice(
    device: ServerDevice,
  ): Promise<ServerDevice>
  findSessionByTokenHash(
    tokenHash: string,
  ): Promise<ServerSession | null>
  findAuthContextBySessionTokenHash?(
    tokenHash: string,
  ): Promise<ServerStoredAuthContext | null>
  saveSession(
    session: ServerSession,
  ): Promise<ServerSession>
  revokeSession(
    sessionId: string,
    revokedAt: string,
  ): Promise<void>
  findEntitlement(
    userId: string,
  ): Promise<ServerEntitlement | null>
  saveEntitlement(
    entitlement: ServerEntitlement,
    expectedVersion: number | null,
  ): Promise<ServerEntitlement>
  findAccountSnapshot(
    userId: string,
  ): Promise<ServerAccountSnapshot | null>
  saveAccountSnapshot(
    snapshot: ServerAccountSnapshot,
    expectedRevision: number | null,
  ): Promise<ServerAccountSnapshot>
}
