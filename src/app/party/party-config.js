export function getPartyConfig() {
  const env = import.meta.env;
  const auth0 = {
    domain: clean(env.VITE_AUTH0_DOMAIN),
    clientId: clean(env.VITE_AUTH0_CLIENT_ID),
    audience: clean(env.VITE_AUTH0_AUDIENCE)
  };
  const supabase = {
    url: clean(env.VITE_SUPABASE_URL),
    publishableKey: clean(env.VITE_SUPABASE_PUBLISHABLE_KEY)
  };

  return Object.freeze({
    enabled: env.VITE_PARTY_MODE_ENABLED !== 'false',
    demoEnabled: env.VITE_PARTY_DEMO_ENABLED !== 'false',
    auth0,
    supabase,
    authConfigured: Boolean(auth0.domain && auth0.clientId),
    backendConfigured: Boolean(supabase.url && supabase.publishableKey),
    productionReady: Boolean(auth0.domain && auth0.clientId && supabase.url && supabase.publishableKey)
  });
}

function clean(value) {
  return String(value || '').trim();
}
