import postgres from 'postgres'
import type {
  AdminDashboardSummary,
  AdminUserSummary,
  ServerAiResultCache,
  ServerAiUsageEvent,
  ServerBillingPurchase,
  ServerBusinessRepository,
  ServerRuntimeSetting,
} from '../types/business.js'
import type { AiAccessPlan } from '../types/aiAccess.js'

type Sql = ReturnType<typeof postgres>
type SqlRow = Record<string, unknown>

function firstRow(rows: readonly SqlRow[]) {
  return rows[0] ?? null
}

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

  throw new Error('BUSINESS_STORE_DATE_INVALID')
}

function optionalIsoString(value: unknown) {
  return value === null || value === undefined
    ? null
    : toIsoString(value)
}

function parseBillingPurchase(
  row: SqlRow,
): ServerBillingPurchase {
  return {
    purchaseTokenHash: String(
      row.purchase_token_hash,
    ),
    userId: String(row.user_id),
    packageName: String(row.package_name),
    productId: String(row.product_id),
    basePlanId:
      row.base_plan_id === null
        ? null
        : String(row.base_plan_id),
    orderId:
      row.order_id === null
        ? null
        : String(row.order_id),
    state:
      row.state as ServerBillingPurchase['state'],
    acknowledgementState:
      row.acknowledgement_state as ServerBillingPurchase['acknowledgementState'],
    startAt: toIsoString(row.start_at),
    expiresAt: optionalIsoString(row.expires_at),
    linkedPurchaseTokenHash:
      row.linked_purchase_token_hash === null
        ? null
        : String(row.linked_purchase_token_hash),
    testPurchase: Boolean(row.test_purchase),
    verifiedAt: toIsoString(row.verified_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  }
}

function parseAiCache(row: SqlRow): ServerAiResultCache {
  return {
    userId: String(row.user_id),
    operation:
      row.operation as ServerAiResultCache['operation'],
    cacheKey: String(row.cache_key),
    model: String(row.model),
    response: row.response,
    inputTokens: Number(row.input_tokens),
    outputTokens: Number(row.output_tokens),
    createdAt: toIsoString(row.created_at),
    expiresAt: toIsoString(row.expires_at),
  }
}

function parseRuntimeSetting(
  row: SqlRow,
): ServerRuntimeSetting {
  return {
    key: String(row.key),
    value: row.value,
    updatedBy: String(row.updated_by),
    updatedAt: toIsoString(row.updated_at),
  }
}

function readPlan(value: unknown): AiAccessPlan {
  if (
    value === 'TRIAL' ||
    value === 'PREMIUM'
  ) {
    return value
  }

  return 'FREE'
}

function parseAdminUser(row: SqlRow): AdminUserSummary {
  return {
    userId: String(row.user_id),
    plan: readPlan(row.plan),
    trialEndsAt: optionalIsoString(row.trial_ends_at),
    premiumExpiresAt: optionalIsoString(
      row.premium_expires_at,
    ),
    deviceCount: Number(row.device_count),
    lastLoginAt: optionalIsoString(row.last_login_at),
    mealPlanCount: Number(row.meal_plan_count),
    recipeCount: Number(row.recipe_count),
    recommendationCount: Number(
      row.recommendation_count,
    ),
    estimatedCostUsd: Number(
      row.estimated_cost_usd,
    ),
  }
}

export function createPostgresBusinessRepository(
  databaseUrl: string,
): ServerBusinessRepository {
  const sql: Sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  })

  return {
    async findBillingPurchaseByTokenHash(
      purchaseTokenHash,
    ) {
      const row = firstRow(
        await sql<SqlRow[]>`
          select *
          from billing_purchases
          where purchase_token_hash = ${purchaseTokenHash}
          limit 1
        `,
      )

      return row ? parseBillingPurchase(row) : null
    },

    async findBillingPurchasesByUserId(userId) {
      const rows = await sql<SqlRow[]>`
        select *
        from billing_purchases
        where user_id = ${userId}
        order by verified_at desc
      `

      return rows.map(parseBillingPurchase)
    },

    async saveBillingPurchase(purchase) {
      const row = firstRow(
        await sql<SqlRow[]>`
          insert into billing_purchases (
            purchase_token_hash,
            user_id,
            package_name,
            product_id,
            base_plan_id,
            order_id,
            state,
            acknowledgement_state,
            start_at,
            expires_at,
            linked_purchase_token_hash,
            test_purchase,
            verified_at,
            created_at,
            updated_at
          ) values (
            ${purchase.purchaseTokenHash},
            ${purchase.userId},
            ${purchase.packageName},
            ${purchase.productId},
            ${purchase.basePlanId},
            ${purchase.orderId},
            ${purchase.state},
            ${purchase.acknowledgementState},
            ${purchase.startAt},
            ${purchase.expiresAt},
            ${purchase.linkedPurchaseTokenHash},
            ${purchase.testPurchase},
            ${purchase.verifiedAt},
            ${purchase.createdAt},
            ${purchase.updatedAt}
          )
          on conflict (purchase_token_hash)
          do update set
            state = excluded.state,
            acknowledgement_state = excluded.acknowledgement_state,
            expires_at = excluded.expires_at,
            linked_purchase_token_hash = excluded.linked_purchase_token_hash,
            verified_at = excluded.verified_at,
            updated_at = excluded.updated_at
          where billing_purchases.user_id = excluded.user_id
          returning *
        `,
      )

      if (!row) {
        throw new Error('PURCHASE_ALREADY_OWNED')
      }

      return parseBillingPurchase(row)
    },

    async saveAiUsageEvent(event) {
      await sql`
        insert into ai_usage_events (
          id,
          user_id,
          operation,
          model,
          input_tokens,
          output_tokens,
          estimated_cost_usd,
          success,
          error_code,
          cache_hit,
          created_at
        ) values (
          ${event.id},
          ${event.userId},
          ${event.operation},
          ${event.model},
          ${event.inputTokens},
          ${event.outputTokens},
          ${event.estimatedCostUsd},
          ${event.success},
          ${event.errorCode},
          ${event.cacheHit},
          ${event.createdAt}
        )
        on conflict (id) do nothing
      `
    },

    async findAiResultCache(
      userId,
      operation,
      cacheKey,
      now,
    ) {
      const row = firstRow(
        await sql<SqlRow[]>`
          select *
          from ai_result_cache
          where user_id = ${userId}
            and operation = ${operation}
            and cache_key = ${cacheKey}
            and expires_at > ${now}
          limit 1
        `,
      )

      return row ? parseAiCache(row) : null
    },

    async saveAiResultCache(cache) {
      const response = sql.json(
        JSON.parse(JSON.stringify(cache.response)),
      )

      await sql`
        insert into ai_result_cache (
          user_id,
          operation,
          cache_key,
          model,
          response,
          input_tokens,
          output_tokens,
          created_at,
          expires_at
        ) values (
          ${cache.userId},
          ${cache.operation},
          ${cache.cacheKey},
          ${cache.model},
          ${response},
          ${cache.inputTokens},
          ${cache.outputTokens},
          ${cache.createdAt},
          ${cache.expiresAt}
        )
        on conflict (user_id, operation, cache_key)
        do update set
          model = excluded.model,
          response = excluded.response,
          input_tokens = excluded.input_tokens,
          output_tokens = excluded.output_tokens,
          created_at = excluded.created_at,
          expires_at = excluded.expires_at
      `
    },

    async saveAiResultCacheWithUsage(
      cache,
      event,
    ): Promise<void> {
      const response = sql.json(
        JSON.parse(JSON.stringify(cache.response)),
      )
      const usageEvent: ServerAiUsageEvent = event

      await sql`
        with saved_cache as (
          insert into ai_result_cache (
            user_id,
            operation,
            cache_key,
            model,
            response,
            input_tokens,
            output_tokens,
            created_at,
            expires_at
          ) values (
            ${cache.userId},
            ${cache.operation},
            ${cache.cacheKey},
            ${cache.model},
            ${response},
            ${cache.inputTokens},
            ${cache.outputTokens},
            ${cache.createdAt},
            ${cache.expiresAt}
          )
          on conflict (user_id, operation, cache_key)
          do update set
            model = excluded.model,
            response = excluded.response,
            input_tokens = excluded.input_tokens,
            output_tokens = excluded.output_tokens,
            created_at = excluded.created_at,
            expires_at = excluded.expires_at
          returning 1
        )
        insert into ai_usage_events (
          id,
          user_id,
          operation,
          model,
          input_tokens,
          output_tokens,
          estimated_cost_usd,
          success,
          error_code,
          cache_hit,
          created_at
        )
        select
          ${usageEvent.id},
          ${usageEvent.userId},
          ${usageEvent.operation},
          ${usageEvent.model},
          ${usageEvent.inputTokens},
          ${usageEvent.outputTokens},
          ${usageEvent.estimatedCostUsd},
          ${usageEvent.success},
          ${usageEvent.errorCode},
          ${usageEvent.cacheHit},
          ${usageEvent.createdAt}
        from saved_cache
        on conflict (id) do nothing
      `
    },

    async findRuntimeSetting(key) {
      const row = firstRow(
        await sql<SqlRow[]>`
          select *
          from runtime_settings
          where key = ${key}
          limit 1
        `,
      )

      return row ? parseRuntimeSetting(row) : null
    },

    async saveRuntimeSetting(setting) {
      const value = sql.json(
        JSON.parse(JSON.stringify(setting.value)),
      )
      const row = firstRow(
        await sql<SqlRow[]>`
          insert into runtime_settings (
            key,
            value,
            updated_by,
            updated_at
          ) values (
            ${setting.key},
            ${value},
            ${setting.updatedBy},
            ${setting.updatedAt}
          )
          on conflict (key)
          do update set
            value = excluded.value,
            updated_by = excluded.updated_by,
            updated_at = excluded.updated_at
          returning *
        `,
      )

      if (!row) {
        throw new Error('RUNTIME_SETTING_WRITE_FAILED')
      }

      return parseRuntimeSetting(row)
    },

    async recordFeedbackEvent(input) {
      await sql`
        insert into feedback_events (
          id,
          category,
          success,
          created_at
        ) values (
          ${input.id},
          ${input.category},
          ${input.success},
          ${input.createdAt}
        )
        on conflict (id) do nothing
      `
    },

    async getAdminDashboardSummary(now, limit) {
      const currentDate = new Date(now)
      const startOfDay = new Date(currentDate)
      startOfDay.setUTCHours(0, 0, 0, 0)
      const startOfMonth = new Date(
        Date.UTC(
          currentDate.getUTCFullYear(),
          currentDate.getUTCMonth(),
          1,
        ),
      )
      const [overviewRow, planRows, userRows] =
        await Promise.all([
          firstRow(
            await sql<SqlRow[]>`
              select
                (select count(*) from auth_users) as subscribers,
                (select count(*) from ai_usage_events
                  where created_at >= ${startOfDay.toISOString()}
                    and cache_hit = false) as today_ai_calls,
                (select coalesce(sum(estimated_cost_usd), 0)
                  from ai_usage_events
                  where created_at >= ${startOfDay.toISOString()}) as today_cost,
                (select coalesce(sum(estimated_cost_usd), 0)
                  from ai_usage_events
                  where created_at >= ${startOfMonth.toISOString()}) as month_cost,
                (select count(*) from ai_usage_events
                  where created_at >= ${startOfDay.toISOString()}
                    and success = false) as today_errors,
                (select count(*) from feedback_events) as feedback_count
                ,(select count(*) from billing_purchases
                  where state in ('ACTIVE', 'GRACE_PERIOD')
                    or (state = 'CANCELED' and expires_at > ${currentDate.toISOString()})) as billing_active
                ,(select count(*) from billing_purchases
                  where state = 'EXPIRED'
                    or (state = 'CANCELED' and expires_at <= ${currentDate.toISOString()})) as billing_expired
                ,(select count(*) from billing_purchases
                  where state = 'PENDING') as billing_pending
                ,(select count(*) from billing_purchases
                  where state = 'CANCELED') as billing_canceled
                ,(select count(*) from billing_purchases
                  where state = 'ON_HOLD') as billing_on_hold
                ,(select count(*) from billing_purchases
                  where state = 'PAUSED') as billing_paused
            `,
          ),
          sql<SqlRow[]>`
            select plan, count(*) as count
            from auth_entitlements
            group by plan
          `,
          sql<SqlRow[]>`
            select
              u.id as user_id,
              coalesce(e.plan, 'FREE') as plan,
              e.trial_ends_at,
              e.premium_expires_at,
              (select count(*) from auth_devices d
                where d.user_id = u.id and d.revoked_at is null) as device_count,
              (select max(s.last_used_at) from auth_sessions s
                where s.user_id = u.id) as last_login_at,
              coalesce((e.usage ->> 'mealPlanCount')::integer, 0) as meal_plan_count,
              coalesce((e.usage ->> 'recipeCount')::integer, 0) as recipe_count,
              coalesce((e.usage ->> 'recommendationCount')::integer, 0) as recommendation_count,
              coalesce((select sum(a.estimated_cost_usd)
                from ai_usage_events a where a.user_id = u.id), 0) as estimated_cost_usd
            from auth_users u
            left join auth_entitlements e on e.user_id = u.id
            order by last_login_at desc nulls last
            limit ${Math.max(1, Math.min(100, limit))}
          `,
        ])

      const plans: Record<AiAccessPlan, number> = {
        FREE: 0,
        TRIAL: 0,
        PREMIUM: 0,
      }

      for (const row of planRows) {
        plans[readPlan(row.plan)] = Number(row.count)
      }

      const overview = overviewRow ?? {}

      return {
        generatedAt: currentDate.toISOString(),
        subscribers: Number(overview.subscribers ?? 0),
        plans,
        aiEnabled: true,
        todayAiCalls: Number(
          overview.today_ai_calls ?? 0,
        ),
        todayEstimatedCostUsd: Number(
          overview.today_cost ?? 0,
        ),
        monthEstimatedCostUsd: Number(
          overview.month_cost ?? 0,
        ),
        todayErrors: Number(
          overview.today_errors ?? 0,
        ),
        feedbackCount: Number(
          overview.feedback_count ?? 0,
        ),
        billing: {
          active: Number(overview.billing_active ?? 0),
          expired: Number(overview.billing_expired ?? 0),
          pending: Number(overview.billing_pending ?? 0),
          canceled: Number(
            overview.billing_canceled ?? 0,
          ),
          onHold: Number(
            overview.billing_on_hold ?? 0,
          ),
          paused: Number(overview.billing_paused ?? 0),
        },
        system: {
          openAi: false,
          database: true,
          oauth: false,
          billing: false,
        },
        users: userRows.map(parseAdminUser),
      } satisfies AdminDashboardSummary
    },
  }
}
