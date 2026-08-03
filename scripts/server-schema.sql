create table if not exists auth_users (
  id text primary key,
  google_subject text not null unique,
  email text not null,
  email_verified boolean not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists auth_devices (
  id text primary key,
  user_id text not null references auth_users(id) on delete cascade,
  device_key text not null,
  display_name text,
  created_at timestamptz not null,
  last_seen_at timestamptz not null,
  revoked_at timestamptz,
  unique (user_id, device_key)
);

create table if not exists auth_sessions (
  id text primary key,
  user_id text not null references auth_users(id) on delete cascade,
  device_id text not null references auth_devices(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null,
  last_used_at timestamptz not null,
  rotated_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists auth_sessions_user_id_idx
  on auth_sessions(user_id);
create index if not exists auth_sessions_expires_at_idx
  on auth_sessions(expires_at);

create table if not exists auth_entitlements (
  user_id text primary key references auth_users(id) on delete cascade,
  plan text not null check (plan in ('FREE', 'TRIAL', 'PREMIUM')),
  source text not null check (source in ('none', 'trial', 'google-play', 'admin')),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  trial_consumed_at timestamptz,
  premium_expires_at timestamptz,
  usage jsonb not null,
  version integer not null,
  updated_at timestamptz not null
);

create table if not exists account_snapshots (
  user_id text primary key references auth_users(id) on delete cascade,
  revision bigint not null,
  data jsonb not null,
  updated_at timestamptz not null
);

create table if not exists billing_purchases (
  purchase_token_hash text primary key,
  user_id text not null references auth_users(id) on delete cascade,
  package_name text not null,
  product_id text not null,
  base_plan_id text,
  order_id text,
  state text not null check (state in (
    'PENDING',
    'ACTIVE',
    'GRACE_PERIOD',
    'PAUSED',
    'ON_HOLD',
    'CANCELED',
    'EXPIRED',
    'INVALID'
  )),
  acknowledgement_state text not null check (
    acknowledgement_state in ('PENDING', 'ACKNOWLEDGED', 'UNKNOWN')
  ),
  start_at timestamptz not null,
  expires_at timestamptz,
  linked_purchase_token_hash text,
  test_purchase boolean not null default false,
  verified_at timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists billing_purchases_user_id_idx
  on billing_purchases(user_id);
create index if not exists billing_purchases_product_id_idx
  on billing_purchases(product_id);

create table if not exists ai_usage_events (
  id text primary key,
  user_id text not null references auth_users(id) on delete cascade,
  operation text not null check (
    operation in ('mealPlan', 'recipe', 'recommendation')
  ),
  model text not null,
  input_tokens integer not null check (input_tokens >= 0),
  output_tokens integer not null check (output_tokens >= 0),
  estimated_cost_usd numeric(14, 8) not null check (estimated_cost_usd >= 0),
  success boolean not null,
  error_code text,
  cache_hit boolean not null default false,
  created_at timestamptz not null
);

create index if not exists ai_usage_events_created_at_idx
  on ai_usage_events(created_at desc);
create index if not exists ai_usage_events_user_id_idx
  on ai_usage_events(user_id, created_at desc);

create table if not exists ai_result_cache (
  user_id text not null references auth_users(id) on delete cascade,
  operation text not null check (
    operation in ('mealPlan', 'recipe', 'recommendation')
  ),
  cache_key text not null,
  model text not null,
  response jsonb not null,
  input_tokens integer not null check (input_tokens >= 0),
  output_tokens integer not null check (output_tokens >= 0),
  created_at timestamptz not null,
  expires_at timestamptz not null,
  primary key (user_id, operation, cache_key)
);

create index if not exists ai_result_cache_expires_at_idx
  on ai_result_cache(expires_at);

create table if not exists runtime_settings (
  key text primary key,
  value jsonb not null,
  updated_by text not null references auth_users(id),
  updated_at timestamptz not null
);

create table if not exists feedback_events (
  id text primary key,
  category text not null,
  success boolean not null,
  created_at timestamptz not null
);

create index if not exists feedback_events_created_at_idx
  on feedback_events(created_at desc);
