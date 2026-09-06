-- Chitrakathe core schema.
-- Money is always integer paise. Time is always timestamptz.

create extension if not exists pgcrypto;

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique,
  phone         text unique,
  -- v2 reseller channel. Column exists in v1 so the switch is a config change,
  -- not a migration under load. See prd.md D3.
  partner_code  text,
  created_at    timestamptz not null default now()
);

create table if not exists events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  template_id       text not null,
  template_version  int  not null,
  language          text not null check (language in ('kn','kok','hi','en')),
  script            text check (script in ('kannada','devanagari','latin')),
  fields            jsonb not null default '{}'::jsonb,
  aspects           text[] not null default array['9:16','1:1'],
  free_rerender_used boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists events_user_idx on events(user_id);

create table if not exists assets (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  position      int  not null,
  storage_key   text not null,
  content_type  text not null,
  bytes         bigint not null,
  width         int,
  height        int,
  -- Retention clock. See prd.md 10.
  uploaded_at   timestamptz not null default now(),
  purge_after   timestamptz not null,
  purged_at     timestamptz,
  unique (event_id, position)
);
create index if not exists assets_purge_idx on assets(purge_after) where purged_at is null;

create table if not exists moderation_results (
  id          uuid primary key default gen_random_uuid(),
  asset_id    uuid not null references assets(id) on delete cascade,
  provider    text not null,
  allowed     boolean not null,
  reason      text,
  scores      jsonb not null default '{}'::jsonb,
  checked_at  timestamptz not null default now()
);
create index if not exists moderation_asset_idx on moderation_results(asset_id);

create type render_status as enum ('queued','running','succeeded','failed','refused_over_ceiling');

create table if not exists render_jobs (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references events(id) on delete cascade,
  status             render_status not null default 'queued',
  attempt            int not null default 0,
  is_rerender        boolean not null default false,
  paid               boolean not null default false,
  stage              text,
  progress           int not null default 0,
  ceiling_paise      int not null,
  cost_paise         int not null default 0,
  degraded_shots     text[] not null default '{}',
  duration_seconds   numeric(6,2),
  error              text,
  queued_at          timestamptz not null default now(),
  started_at         timestamptz,
  finished_at        timestamptz,
  outputs_purge_after timestamptz
);
create index if not exists jobs_event_idx on render_jobs(event_id);
create index if not exists jobs_status_idx on render_jobs(status);

create table if not exists render_outputs (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references render_jobs(id) on delete cascade,
  aspect        text not null,
  master_key    text not null,
  preview_key   text not null,
  poster_key    text,
  bytes         bigint not null default 0,
  unique (job_id, aspect)
);

create table if not exists cost_entries (
  id           bigserial primary key,
  job_id       uuid not null references render_jobs(id) on delete cascade,
  kind         text not null check (kind in ('video_model','tts','moderation','compute','storage')),
  label        text not null,
  units        numeric(12,3) not null,
  amount_paise int not null,
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists cost_job_idx on cost_entries(job_id);
create index if not exists cost_created_idx on cost_entries(created_at);

create type payment_status as enum ('created','paid','failed','refunded');

create table if not exists payments (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events(id) on delete cascade,
  job_id         uuid references render_jobs(id) on delete set null,
  purpose        text not null check (purpose in ('unlock','rerender')),
  amount_paise   int not null,
  currency       text not null default 'INR',
  status         payment_status not null default 'created',
  provider       text not null default 'razorpay',
  order_id       text unique not null,
  payment_id     text,
  method         text,
  created_at     timestamptz not null default now(),
  paid_at        timestamptz
);
create index if not exists payments_event_idx on payments(event_id);

-- Append-only log of what a job was allowed to spend and why it stopped.
create table if not exists ceiling_breaches (
  id           bigserial primary key,
  job_id       uuid not null references render_jobs(id) on delete cascade,
  shot_id      text,
  spent_paise  int not null,
  would_add_paise int not null,
  ceiling_paise int not null,
  action       text not null check (action in ('degraded','refused')),
  created_at   timestamptz not null default now()
);
