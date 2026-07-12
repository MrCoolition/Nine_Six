export function getCommunityRuntimeConfig(env = process.env) {
  const domain = normalizeDomain(env.AUTH0_DOMAIN || env.AUTH0_ISSUER_BASE_URL || env.VITE_AUTH0_DOMAIN);
  const clientId = clean(env.AUTH0_CLIENT_ID || env.VITE_AUTH0_CLIENT_ID);
  const audience = clean(env.AUTH0_AUDIENCE || env.VITE_AUTH0_AUDIENCE);
  const scope = normalizeScope(env.AUTH0_SCOPE);
  const databaseConfigured = Boolean(clean(env.DB_CONNECT));

  return {
    auth0: { domain, clientId, audience, scope },
    authConfigured: Boolean(domain && clientId && audience),
    databaseConfigured,
    sharedLeaderboardConfigured: databaseConfigured,
    partyActionsConfigured: false
  };
}

export function publicCommunityConfig(env = process.env) {
  const config = getCommunityRuntimeConfig(env);
  return {
    auth0: config.auth0,
    authConfigured: config.authConfigured,
    databaseConfigured: config.databaseConfigured,
    sharedLeaderboardConfigured: config.sharedLeaderboardConfigured,
    partyActionsConfigured: config.partyActionsConfigured
  };
}

function normalizeDomain(value) {
  return clean(value).replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

function normalizeScope(value) {
  const requested = clean(value) || 'openid profile email offline_access';
  const scopes = new Set(requested.split(/\s+/).filter(Boolean));
  for (const required of ['openid', 'profile', 'email']) scopes.add(required);
  return [...scopes].join(' ');
}

function clean(value) {
  return String(value || '').trim();
}
