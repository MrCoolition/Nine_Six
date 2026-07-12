import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLeaderboardLimit, normalizeLeaderboardMetric } from '../api/community/_leaderboard.js';

test('leaderboard defaults to wins when metric is absent or invalid', () => {
  assert.equal(normalizeLeaderboardMetric(), 'wins');
  assert.equal(normalizeLeaderboardMetric('jackpots'), 'wins');
  assert.equal(normalizeLeaderboardMetric('perfects'), 'perfects');
});

test('leaderboard result limits stay between one and fifty', () => {
  assert.equal(normalizeLeaderboardLimit(), 20);
  assert.equal(normalizeLeaderboardLimit(-5), 1);
  assert.equal(normalizeLeaderboardLimit(500), 50);
});
