import { communitySql, ensureCommunitySchema } from './_db.js';
import { normalizeLeaderboardLimit, normalizeLeaderboardMetric } from './_leaderboard.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return send(response, 405, { error: 'Method not allowed.' });
  try {
    await ensureCommunitySchema();
    const metric = normalizeLeaderboardMetric(request.query?.metric);
    const limit = normalizeLeaderboardLimit(request.query?.limit);
    const sql = communitySql();
    const [leaders, summary] = await Promise.all([
      leaderboardQuery(sql, metric, limit),
      sql`
        select
          count(*)::integer as players,
          coalesce(sum(matches_played), 0)::integer as matches,
          coalesce(sum(wins), 0)::integer as settled_matches,
          coalesce(max(biggest_pot), 0)::bigint as biggest_pot
        from nine_six_party_stats
      `
    ]);
    response.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
    return response.status(200).json({
      connected: true,
      metric,
      leaders: leaders.map(normalizeLeader),
      summary: normalizeSummary(summary[0])
    });
  } catch {
    return send(response, 503, { error: 'Shared standings are warming up.', connected: false, leaders: [] });
  }
}

function leaderboardQuery(sql, metric, limit) {
  const base = (order) => sql.query(`
    select
      p.handle,
      p.avatar_seed,
      s.wins,
      s.losses,
      s.perfects,
      s.biggest_pot,
      s.best_win_streak,
      s.walkouts,
      s.matches_played,
      s.updated_at
    from nine_six_party_stats s
    join nine_six_profiles p on p.auth_subject = s.auth_subject
    order by ${order}, s.wins desc, s.perfects desc, p.handle asc
    limit $1
  `, [limit]);

  if (metric === 'perfects') return base('s.perfects desc');
  if (metric === 'biggest_pot') return base('s.biggest_pot desc');
  if (metric === 'best_win_streak') return base('s.best_win_streak desc');
  if (metric === 'walkouts') return base('s.walkouts desc');
  return base('s.wins desc');
}

function normalizeLeader(row) {
  return {
    handle: row.handle,
    avatarSeed: row.avatar_seed,
    wins: Number(row.wins) || 0,
    losses: Number(row.losses) || 0,
    perfects: Number(row.perfects) || 0,
    biggestPot: Number(row.biggest_pot) || 0,
    winStreak: Number(row.best_win_streak) || 0,
    walkouts: Number(row.walkouts) || 0,
    matches: Number(row.matches_played) || 0,
    updatedAt: row.updated_at
  };
}

function normalizeSummary(row = {}) {
  return {
    players: Number(row.players) || 0,
    matches: Number(row.matches) || 0,
    settledMatches: Number(row.settled_matches) || 0,
    biggestPot: Number(row.biggest_pot) || 0
  };
}

function send(response, status, payload) {
  response.setHeader('Cache-Control', 'no-store');
  return response.status(status).json(payload);
}
