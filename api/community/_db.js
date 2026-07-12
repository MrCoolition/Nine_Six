import { neon } from '@neondatabase/serverless';
import { httpError } from './_auth.js';

let sqlClient = null;
let schemaPromise = null;

export function neonConfigured() {
  return Boolean(String(process.env.DB_CONNECT || '').trim());
}

export function communitySql() {
  const connectionString = String(process.env.DB_CONNECT || '').trim();
  if (!connectionString) throw httpError(503, 'Community database is not configured.');
  sqlClient ??= neon(connectionString, {
    fetchOptions: { cache: 'no-store' }
  });
  return sqlClient;
}

export async function ensureCommunitySchema() {
  if (!schemaPromise) {
    schemaPromise = initializeSchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

export async function pingCommunityDatabase() {
  const sql = communitySql();
  const rows = await sql`select 1::integer as ok`;
  return rows[0]?.ok === 1;
}

async function initializeSchema() {
  const sql = communitySql();
  await sql.transaction([
    sql`
      create table if not exists nine_six_profiles (
        auth_subject text primary key,
        handle text not null,
        avatar_seed text not null,
        bankroll bigint not null default 960 check (bankroll >= 0),
        last_rescue_on date,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        check (char_length(handle) between 3 and 16),
        check (handle ~ '^[A-Za-z0-9][A-Za-z0-9 ._''-]{2,15}$')
      )
    `,
    sql`create unique index if not exists nine_six_profiles_handle_ci on nine_six_profiles (lower(handle))`,
    sql`
      create table if not exists nine_six_party_stats (
        auth_subject text primary key references nine_six_profiles(auth_subject) on delete cascade,
        wins integer not null default 0 check (wins >= 0),
        losses integer not null default 0 check (losses >= 0),
        perfects integer not null default 0 check (perfects >= 0),
        biggest_pot bigint not null default 0 check (biggest_pot >= 0),
        win_streak integer not null default 0 check (win_streak >= 0),
        best_win_streak integer not null default 0 check (best_win_streak >= 0),
        walkouts integer not null default 0 check (walkouts >= 0),
        matches_played integer not null default 0 check (matches_played >= 0),
        updated_at timestamptz not null default now()
      )
    `,
    sql`
      create table if not exists nine_six_wallet_ledger (
        id uuid primary key default gen_random_uuid(),
        auth_subject text not null references nine_six_profiles(auth_subject),
        entry_type text not null check (entry_type in ('opening-balance', 'ante', 'payout', 'daily-rescue', 'admin-adjustment')),
        amount bigint not null check (amount <> 0),
        balance_after bigint not null check (balance_after >= 0),
        idempotency_key text not null unique,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      )
    `,
    sql`create index if not exists nine_six_wallet_subject_idx on nine_six_wallet_ledger (auth_subject, created_at desc)`,
    sql`
      create table if not exists nine_six_schema_migrations (
        version integer primary key,
        name text not null,
        applied_at timestamptz not null default now()
      )
    `,
    sql`
      insert into nine_six_schema_migrations (version, name)
      values (1, 'community-profiles-stats-ledger')
      on conflict (version) do nothing
    `
  ]);
  return true;
}
