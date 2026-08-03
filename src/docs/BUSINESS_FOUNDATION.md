# Sprint R5 Business Foundation

## Scope

R5 adds the server-side business foundation without publishing a Play product or a Production release. The current repository is a Vite PWA, so the native Android BillingClient purchase sheet remains an Android wrapper responsibility. The web app exposes a narrow `window.TodayTablePlayBilling` bridge contract and sends purchase tokens only to authenticated server endpoints.

## Google Play Billing

1. The Android wrapper calls Play Billing and receives a purchase token.
2. `POST /api/billing/verify` validates the authenticated session and same-origin request.
3. The server exchanges a service-account JWT for the Android Publisher scope and calls `purchases.subscriptionsv2.get`.
4. Only configured package and product IDs are accepted.
5. The raw purchase token is never stored. A SHA-256 hash is the unique purchase identifier.
6. `PENDING`, invalid, expired, paused, and on-hold purchases do not grant Premium.
7. Active, grace-period, or canceled-but-unexpired purchases update the server Entitlement.
8. An unacknowledged valid purchase is acknowledged by the server.
9. Restore sends the currently owned tokens from `queryPurchasesAsync` to `/api/billing/restore`.

Required server variables:

- `GOOGLE_PLAY_PACKAGE_NAME`
- `GOOGLE_PLAY_PREMIUM_PRODUCT_IDS` (comma-separated)
- `GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY`

Play Console product creation, service-account permission assignment, Real-time Developer Notifications, and the native BillingClient UI are deployment tasks for the next Sprint.

## AI Cost Guard and cache

Authenticated TRIAL/PREMIUM requests pass through one server guard before OpenAI:

1. Load HttpOnly session and server Entitlement.
2. Check `runtime_settings.ai_enabled` (default ON).
3. Hash the normalized operation/model/input to produce a user-scoped cache key.
4. Return a non-expired cache hit without calling OpenAI.
5. On a cache miss, execute OpenAI, store the successful result, increment the server usage counter, and record input/output tokens plus estimated cost.

The cache does not store an additional raw prompt. The validated AI response is stored per user. Default TTLs are seven days for meal plans, thirty days for recipe detail, and one hour for recommendations.

Price estimates use the server model table and can be overridden with `OPENAI_INPUT_USD_PER_MILLION` and `OPENAI_OUTPUT_USD_PER_MILLION` without a client release.

## Admin dashboard

`/?page=admin` calls authenticated, allowlisted server APIs. Set `ADMIN_USER_IDS` to comma-separated internal `auth_users.id` values. The browser never receives service credentials.

Dashboard fields:

- subscribers and FREE/TRIAL/PREMIUM counts
- today's calls, errors, and estimated cost
- current-month estimated cost
- feedback event count
- per-user device, last-login, usage, and estimated-cost summary
- configured/not-configured status for OpenAI, DB, OAuth, and Billing
- server-persisted AI emergency switch

## Database migration

Run `scripts/server-schema.sql` against the same Neon database before exercising R5 endpoints. It adds only new tables and indexes; existing Auth, Entitlement, and account snapshots remain compatible.
