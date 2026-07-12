const METRICS = new Set(['wins', 'perfects', 'biggest_pot', 'best_win_streak', 'walkouts']);

export function normalizeLeaderboardMetric(value) {
  const metric = String(value || 'wins');
  return METRICS.has(metric) ? metric : 'wins';
}

export function normalizeLeaderboardLimit(value) {
  return Math.max(1, Math.min(50, Number(value) || 20));
}
