import { createAuth0Client } from '@auth0/auth0-spa-js';

export function createPartyAuth(config) {
  let client = null;
  let session = null;

  return {
    get configured() {
      return config.authConfigured;
    },

    async init() {
      if (!config.authConfigured) {
        return null;
      }

      client ??= await createAuth0Client({
        domain: config.auth0.domain,
        clientId: config.auth0.clientId,
        authorizationParams: {
          redirect_uri: window.location.origin,
          ...(config.auth0.audience ? { audience: config.auth0.audience } : {})
        },
        cacheLocation: 'localstorage',
        useRefreshTokens: true,
        useRefreshTokensFallback: true
      });

      const params = new URLSearchParams(window.location.search);
      if (params.has('code') && params.has('state')) {
        const result = await client.handleRedirectCallback();
        const returnTo = result?.appState?.returnTo || '/';
        window.history.replaceState({}, '', returnTo);
      }

      session = await readSession(client);
      return session;
    },

    async login(returnTo = window.location.pathname + window.location.search) {
      if (!client) {
        await this.init();
      }
      if (!client) {
        throw new Error('Auth0 is not configured yet.');
      }
      await client.loginWithRedirect({ appState: { returnTo } });
    },

    async logout() {
      if (!client) return;
      await client.logout({
        logoutParams: { returnTo: window.location.origin }
      });
    },

    async getSession() {
      if (!client && config.authConfigured) {
        await this.init();
      }
      session = client ? await readSession(client) : null;
      return session;
    },

    async getIdToken() {
      if (!client) return '';
      return (await client.getIdTokenClaims())?.__raw || '';
    },

    async getAccessToken() {
      if (!client) return '';
      return client.getTokenSilently({
        authorizationParams: config.auth0.audience ? { audience: config.auth0.audience } : {}
      });
    }
  };
}

async function readSession(client) {
  if (!(await client.isAuthenticated())) {
    return null;
  }
  const user = await client.getUser();
  return user ? {
    subject: user.sub,
    name: user.nickname || user.name || 'PLAYER 96',
    email: user.email || '',
    picture: user.picture || ''
  } : null;
}
