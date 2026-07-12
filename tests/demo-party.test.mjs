import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoPartyBackend } from '../src/app/party/demo-backend.js';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};

test.beforeEach(() => storage.clear());

test('preview supports a full nine-seat roster', async () => {
  const backend = createDemoPartyBackend({ rng: () => 0.5 });
  let table = await backend.createRoom({ name: 'NINE DEEP', visibility: 'private', tone: 'adult', maxSeats: 9, stake: 100 });
  for (let index = 0; index < 8; index += 1) table = await backend.addBots();
  assert.equal(table.members.length, 9);
  assert.deepEqual(table.members.map((member) => member.seat_no), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('starting a match deducts one ante and locks the pot once', async () => {
  const backend = createDemoPartyBackend({ rng: () => 0.5 });
  await backend.quickMatch({ stake: 50, tone: 'adult' });
  await backend.setReady(null, true);
  let table = await backend.startMatch();
  assert.equal(table.match.pot, 200);
  assert.equal(JSON.parse(storage.get('nine-six-party-preview-v1')).bankroll, 910);
  await assert.rejects(() => backend.startMatch(), /already locked/i);
  assert.equal(JSON.parse(storage.get('nine-six-party-preview-v1')).bankroll, 910);
});

test('four no-score hands spell BOOF and walk the player out', async () => {
  const backend = createDemoPartyBackend({ rng: () => 0 });
  await backend.createRoom({ name: 'BOOF TEST', visibility: 'private', tone: 'adult', maxSeats: 2, stake: 25 });
  await backend.addBots();
  await backend.setReady(null, true);
  await backend.startMatch();

  for (let count = 0; count < 3; count += 1) {
    await backend.takeTurn(null, crypto.randomUUID());
    await backend.takeBotTurn();
  }
  await backend.takeTurn(null, crypto.randomUUID());
  const table = await backend.loadRoom();
  const user = table.players.find((player) => player.auth_subject === backend.session.subject);
  assert.equal(user.boofballs, 4);
  assert.equal(user.status, 'walkout');
  assert.equal(table.match.status, 'finished');
  assert.equal(table.match.win_reason, 'last-standing');
});

test('forfeit leaves the last player standing with the full pot', async () => {
  const backend = createDemoPartyBackend({ rng: () => 0.5 });
  await backend.createRoom({ name: 'TWO SEATS', visibility: 'private', tone: 'pg', maxSeats: 2, stake: 250 });
  await backend.addBots();
  await backend.setReady(null, true);
  await backend.startMatch();
  await backend.forfeitMatch();
  const table = await backend.loadRoom();
  assert.equal(table.match.status, 'finished');
  assert.equal(table.match.pot, 500);
  assert.equal(table.match.win_reason, 'last-standing');
  assert.match(table.players.find((player) => player.status === 'winner').auth_subject, /^preview\|bot-/);
});
