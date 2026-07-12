const env = import.meta.env;
const runtimeConfig = {
  enabled: env.VITE_PARTY_MODE_ENABLED !== 'false',
  demoEnabled: env.VITE_PARTY_DEMO_ENABLED !== 'false',
  auth0: {
    domain: clean(env.VITE_AUTH0_DOMAIN),
    clientId: clean(env.VITE_AUTH0_CLIENT_ID),
    audience: clean(env.VITE_AUTH0_AUDIENCE),
    scope: 'openid profile email offline_access'
  },
  supabase: {
    url: clean(env.VITE_SUPABASE_URL),
    publishableKey: clean(env.VITE_SUPABASE_PUBLISHABLE_KEY)
  },
  authConfigured: false,
  backendConfigured: false,
  databaseConfigured: false,
  sharedLeaderboardConfigured: false,
  partyActionsConfigured: false,
  productionReady: false
};

refreshDerivedConfig(runtimeConfig);

export function getPartyConfig() {
  return runtimeConfig;
}

export async function hydratePartyConfig(config = runtimeConfig) {
  try {
    const response = await fetch('/api/community/config', {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Runtime configuration is unavailable.');
    const incoming = await response.json();
    config.auth0.domain = clean(incoming.auth0?.domain) || config.auth0.domain;
    config.auth0.clientId = clean(incoming.auth0?.clientId) || config.auth0.clientId;
    config.auth0.audience = clean(incoming.auth0?.audience) || config.auth0.audience;
    config.auth0.scope = clean(incoming.auth0?.scope) || config.auth0.scope;
    config.databaseConfigured = Boolean(incoming.databaseConfigured);
    config.sharedLeaderboardConfigured = Boolean(incoming.sharedLeaderboardConfigured);
    config.partyActionsConfigured = Boolean(incoming.partyActionsConfigured);
  } catch {
    // Vite-only local development can still use compile-time values and preview mode.
  }
  refreshDerivedConfig(config);
  return config;
}

function refreshDerivedConfig(config) {
  config.authConfigured = Boolean(config.auth0.domain && config.auth0.clientId && config.auth0.audience);
  config.backendConfigured = Boolean(config.supabase.url && config.supabase.publishableKey);
  config.productionReady = Boolean(config.authConfigured && (config.backendConfigured || config.partyActionsConfigured));
}

function clean(value) {
  return String(value || '').trim();
}
