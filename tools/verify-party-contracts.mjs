import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../supabase/migrations/20260712_party_mode.sql', import.meta.url), 'utf8');

for (const table of [
  'profiles', 'wallet_ledger', 'party_rooms', 'room_members', 'party_matches',
  'match_players', 'party_events', 'party_messages', 'reports', 'party_stats'
]) {
  assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`, 'i'), `missing ${table}`);
}

for (const rpc of [
  'create_room', 'join_room', 'set_ready', 'start_match', 'take_turn',
  'advance_timeout', 'forfeit_match', 'settle_match', 'propose_rematch',
  'claim_daily_rescue'
]) {
  assert.match(sql, new RegExp(`function public\\.${rpc}\\b`, 'i'), `missing ${rpc} RPC`);
}

assert.match(sql, /party_take_turn\(p_match_id uuid, p_request_id uuid\)/i);
assert.doesNotMatch(sql, /party_take_turn\([^)]*p_d9|party_take_turn\([^)]*p_score/i);
assert.match(sql, /floor\(random\(\) \* 9\)/i);
assert.match(sql, /for update/i);
assert.match(sql, /unique \(match_id, request_id\)/i);
assert.match(sql, /idempotency_key text not null unique/i);
assert.match(sql, /alter table public\.party_rooms enable row level security/i);
assert.match(sql, /party_topic_room_member\(realtime\.topic\(\)\)/i);
assert.match(sql, /wallet_settlement_enabled/i);
assert.match(sql, /now\(\) \+ interval '20 seconds'/i);
assert.match(sql, /now\(\) \+ interval '45 seconds'/i);
assert.match(sql, /expires_at timestamptz not null default \(now\(\) \+ interval '7 days'\)/i);

console.log('Party SQL contract verified: authoritative rolls, RLS, ledger idempotency, clocks, and retention.');
