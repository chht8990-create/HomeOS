import postgres from 'postgres'
import type {
  ServerAccountSnapshot,
  ServerDevice,
  ServerEntitlement,
  ServerIdentityRepository,
  ServerSession,
  ServerStoredAuthContext,
  ServerUser,
} from '../types/serverIdentity.js'

type Sql = ReturnType<typeof postgres>
type SqlRow = Record<string, unknown>

function toIsoString(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'string') {
    const date = new Date(value)

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString()
    }
  }

  throw new Error('AUTH_STORE_DATE_INVALID')
}

function optionalIsoString(value: unknown) {
  return value === null ? null : toIsoString(value)
}

function parseUser(row: SqlRow): ServerUser {
  return {
    id: String(row.id),
    googleSubject: String(row.google_subject),
    email: String(row.email),
    emailVerified: Boolean(row.email_verified),
    displayName: String(row.display_name),
    ...(typeof row.avatar_url === 'string'
      ? { avatarUrl: row.avatar_url }
      : {}),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  }
}

function parseDevice(row: SqlRow): ServerDevice {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    deviceKey: String(row.device_key),
    ...(typeof row.display_name === 'string'
      ? { displayName: row.display_name }
      : {}),
    createdAt: toIsoString(row.created_at),
    lastSeenAt: toIsoString(row.last_seen_at),
    revokedAt: optionalIsoString(row.revoked_at),
  }
}

function parseSession(row: SqlRow): ServerSession {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    deviceId: String(row.device_id),
    tokenHash: String(row.token_hash),
    createdAt: toIsoString(row.created_at),
    lastUsedAt: toIsoString(row.last_used_at),
    rotatedAt: toIsoString(row.rotated_at),
    expiresAt: toIsoString(row.expires_at),
    revokedAt: optionalIsoString(row.revoked_at),
  }
}

function parseEntitlement(
  row: SqlRow,
): ServerEntitlement {
  const usage = row.usage

  if (
    typeof usage !== 'object' ||
    usage === null ||
    Array.isArray(usage)
  ) {
    throw new Error('AUTH_STORE_USAGE_INVALID')
  }

  const usageRecord = usage as Record<
    string,
    unknown
  >

  return {
    userId: String(row.user_id),
    plan: row.plan as ServerEntitlement['plan'],
    source:
      row.source as ServerEntitlement['source'],
    trialStartedAt: optionalIsoString(
      row.trial_started_at,
    ),
    trialEndsAt: optionalIsoString(
      row.trial_ends_at,
    ),
    trialConsumedAt: optionalIsoString(
      row.trial_consumed_at,
    ),
    premiumExpiresAt: optionalIsoString(
      row.premium_expires_at,
    ),
    usage: {
      mealPlanCount: Number(
        usageRecord.mealPlanCount,
      ),
      recipeCount: Number(
        usageRecord.recipeCount,
      ),
      recommendationCount: Number(
        usageRecord.recommendationCount,
      ),
      lastGenerationAt:
        usageRecord.lastGenerationAt === null
          ? null
          : String(
              usageRecord.lastGenerationAt,
            ),
    },
    version: Number(row.version),
    updatedAt: toIsoString(row.updated_at),
  }
}

function parseSnapshot(
  row: SqlRow,
): ServerAccountSnapshot {
  return {
    userId: String(row.user_id),
    revision: Number(row.revision),
    data: row.data,
    updatedAt: toIsoString(row.updated_at),
  }
}

function firstRow(
  rows: readonly SqlRow[],
) {
  return rows[0] ?? null
}

function readSqlRow(value: unknown): SqlRow | null {
  return typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
    ? (value as SqlRow)
    : null
}

export function createPostgresIdentityRepository(
  databaseUrl: string,
): ServerIdentityRepository {
  const sql: Sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  })

  return {
    async findUserById(userId) {
      const row = firstRow(
        await sql<SqlRow[]>`
          select *
          from auth_users
          where id = ${userId}
          limit 1
        `,
      )

      return row ? parseUser(row) : null
    },
    async findUserByGoogleSubject(googleSubject) {
      const row = firstRow(
        await sql<SqlRow[]>`
          select *
          from auth_users
          where google_subject = ${googleSubject}
          limit 1
        `,
      )

      return row ? parseUser(row) : null
    },
    async saveUser(user) {
      const row = firstRow(
        await sql<SqlRow[]>`
          insert into auth_users (
            id,
            google_subject,
            email,
            email_verified,
            display_name,
            avatar_url,
            created_at,
            updated_at
          )
          values (
            ${user.id},
            ${user.googleSubject},
            ${user.email},
            ${user.emailVerified},
            ${user.displayName},
            ${user.avatarUrl ?? null},
            ${user.createdAt},
            ${user.updatedAt}
          )
          on conflict (google_subject)
          do update set
            email = excluded.email,
            email_verified = excluded.email_verified,
            display_name = excluded.display_name,
            avatar_url = excluded.avatar_url,
            updated_at = excluded.updated_at
          returning *
        `,
      )

      if (!row) {
        throw new Error('AUTH_STORE_WRITE_FAILED')
      }

      return parseUser(row)
    },
    async findDevice(userId, deviceKey) {
      const row = firstRow(
        await sql<SqlRow[]>`
          select *
          from auth_devices
          where user_id = ${userId}
            and device_key = ${deviceKey}
          limit 1
        `,
      )

      return row ? parseDevice(row) : null
    },
    async saveDevice(device) {
      const row = firstRow(
        await sql<SqlRow[]>`
          insert into auth_devices (
            id,
            user_id,
            device_key,
            display_name,
            created_at,
            last_seen_at,
            revoked_at
          )
          values (
            ${device.id},
            ${device.userId},
            ${device.deviceKey},
            ${device.displayName ?? null},
            ${device.createdAt},
            ${device.lastSeenAt},
            ${device.revokedAt}
          )
          on conflict (user_id, device_key)
          do update set
            display_name = excluded.display_name,
            last_seen_at = excluded.last_seen_at,
            revoked_at = excluded.revoked_at
          returning *
        `,
      )

      if (!row) {
        throw new Error('AUTH_STORE_WRITE_FAILED')
      }

      return parseDevice(row)
    },
    async findSessionByTokenHash(tokenHash) {
      const row = firstRow(
        await sql<SqlRow[]>`
          select *
          from auth_sessions
          where token_hash = ${tokenHash}
          limit 1
        `,
      )

      return row ? parseSession(row) : null
    },
    async findAuthContextBySessionTokenHash(
      tokenHash,
    ): Promise<ServerStoredAuthContext | null> {
      const row = firstRow(
        await sql<SqlRow[]>`
          select
            row_to_json(s) as session_record,
            row_to_json(u) as user_record,
            row_to_json(e) as entitlement_record
          from auth_sessions s
          inner join auth_users u
            on u.id = s.user_id
          inner join auth_entitlements e
            on e.user_id = s.user_id
          where s.token_hash = ${tokenHash}
          limit 1
        `,
      )

      if (!row) {
        return null
      }

      const sessionRecord = readSqlRow(
        row.session_record,
      )
      const userRecord = readSqlRow(row.user_record)
      const entitlementRecord = readSqlRow(
        row.entitlement_record,
      )

      if (
        !sessionRecord ||
        !userRecord ||
        !entitlementRecord
      ) {
        throw new Error('AUTH_STORE_CONTEXT_INVALID')
      }

      return {
        session: parseSession(sessionRecord),
        user: parseUser(userRecord),
        entitlement: parseEntitlement(
          entitlementRecord,
        ),
      }
    },
    async saveSession(session) {
      const row = firstRow(
        await sql<SqlRow[]>`
          insert into auth_sessions (
            id,
            user_id,
            device_id,
            token_hash,
            created_at,
            last_used_at,
            rotated_at,
            expires_at,
            revoked_at
          )
          values (
            ${session.id},
            ${session.userId},
            ${session.deviceId},
            ${session.tokenHash},
            ${session.createdAt},
            ${session.lastUsedAt},
            ${session.rotatedAt},
            ${session.expiresAt},
            ${session.revokedAt}
          )
          on conflict (id)
          do update set
            last_used_at = excluded.last_used_at,
            expires_at = excluded.expires_at,
            revoked_at = excluded.revoked_at
          returning *
        `,
      )

      if (!row) {
        throw new Error('AUTH_STORE_WRITE_FAILED')
      }

      return parseSession(row)
    },
    async revokeSession(sessionId, revokedAt) {
      await sql`
        update auth_sessions
        set revoked_at = ${revokedAt}
        where id = ${sessionId}
      `
    },
    async findEntitlement(userId) {
      const row = firstRow(
        await sql<SqlRow[]>`
          select *
          from auth_entitlements
          where user_id = ${userId}
          limit 1
        `,
      )

      return row ? parseEntitlement(row) : null
    },
    async saveEntitlement(
      entitlement,
      expectedVersion,
    ) {
      const usage = sql.json(entitlement.usage)
      const rows =
        expectedVersion === null
          ? await sql<SqlRow[]>`
              insert into auth_entitlements (
                user_id,
                plan,
                source,
                trial_started_at,
                trial_ends_at,
                trial_consumed_at,
                premium_expires_at,
                usage,
                version,
                updated_at
              )
              values (
                ${entitlement.userId},
                ${entitlement.plan},
                ${entitlement.source},
                ${entitlement.trialStartedAt},
                ${entitlement.trialEndsAt},
                ${entitlement.trialConsumedAt},
                ${entitlement.premiumExpiresAt},
                ${usage},
                ${entitlement.version},
                ${entitlement.updatedAt}
              )
              on conflict (user_id) do nothing
              returning *
            `
          : await sql<SqlRow[]>`
              update auth_entitlements
              set
                plan = ${entitlement.plan},
                source = ${entitlement.source},
                trial_started_at = ${entitlement.trialStartedAt},
                trial_ends_at = ${entitlement.trialEndsAt},
                trial_consumed_at = ${entitlement.trialConsumedAt},
                premium_expires_at = ${entitlement.premiumExpiresAt},
                usage = ${usage},
                version = ${entitlement.version},
                updated_at = ${entitlement.updatedAt}
              where user_id = ${entitlement.userId}
                and version = ${expectedVersion}
              returning *
            `
      const row = firstRow(rows)

      if (!row) {
        throw new Error(
          'ENTITLEMENT_VERSION_CONFLICT',
        )
      }

      return parseEntitlement(row)
    },
    async findAccountSnapshot(userId) {
      const row = firstRow(
        await sql<SqlRow[]>`
          select *
          from account_snapshots
          where user_id = ${userId}
          limit 1
        `,
      )

      return row ? parseSnapshot(row) : null
    },
    async saveAccountSnapshot(
      snapshot,
      expectedRevision,
    ) {
      const data = sql.json(
        JSON.parse(
          JSON.stringify(snapshot.data),
        ),
      )
      const rows =
        expectedRevision === null
          ? await sql<SqlRow[]>`
              insert into account_snapshots (
                user_id,
                revision,
                data,
                updated_at
              )
              values (
                ${snapshot.userId},
                ${snapshot.revision},
                ${data},
                ${snapshot.updatedAt}
              )
              on conflict (user_id) do nothing
              returning *
            `
          : await sql<SqlRow[]>`
              update account_snapshots
              set
                revision = ${snapshot.revision},
                data = ${data},
                updated_at = ${snapshot.updatedAt}
              where user_id = ${snapshot.userId}
                and revision = ${expectedRevision}
              returning *
            `
      const row = firstRow(rows)

      if (!row) {
        throw new Error(
          'ACCOUNT_SYNC_REVISION_CONFLICT',
        )
      }

      return parseSnapshot(row)
    },
  }
}
