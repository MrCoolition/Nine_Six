import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const db = await readFile(new URL('../api/community/_db.js', import.meta.url), 'utf8');
const config = await readFile(new URL('../api/community/_config.js', import.meta.url), 'utf8');
const leaderboard = await readFile(new URL('../api/community/leaderboard.js', import.meta.url), 'utf8');
const clientConfig = await readFile(new URL('../src/app/party/party-config.js', import.meta.url), 'utf8');

for (const table of [
  'nine_six_profiles',
  'nine_six_party_stats',
  'nine_six_wallet_ledger',
  'nine_six_schema_migrations'
]) {
  assert.match(db, new RegExp(`create table if not exists ${table}\\b`, 'i'), `missing ${table}`);
}

assert.match(db, /process\.env\.DB_CONNECT/);
assert.doesNotMatch(clientConfig, /DB_CONNECT|AUTH0_CLIENT_SECRET|AUTH0_SECRET/);
assert.doesNotMatch(config, /AUTH0_CLIENT_SECRET|AUTH0_SECRET/);
assert.match(leaderboard, /METRICS = new Set/);
assert.match(leaderboard, /limit \$1/);
assert.doesNotMatch(leaderboard, /request\.body|req\.body/);

console.log('Neon contract verified: server-only connection, idempotent schema, and read-only shared standings.');
