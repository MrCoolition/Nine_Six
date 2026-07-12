# NINE SIX Community Setup

Solo and Daily remain guest modes. Authenticated Party seats use Auth0, and shared standings use Neon through Vercel Functions. Never commit `.env` files, `DB_CONNECT`, `AUTH0_SECRET`, or `AUTH0_CLIENT_SECRET`.

## 1. Auth0 SPA

Create or reuse an Auth0 **Single Page Application** with Authorization Code + PKCE and RS256. Configure all three URL lists with both values:

- Allowed Callback URLs: `http://127.0.0.1:4174`, `https://nine-six-rho.vercel.app`
- Allowed Logout URLs: `http://127.0.0.1:4174`, `https://nine-six-rho.vercel.app`
- Allowed Web Origins: `http://127.0.0.1:4174`, `https://nine-six-rho.vercel.app`

Create an Auth0 API with an identifier such as `https://api.nine-six.example`; this exact identifier becomes `AUTH0_AUDIENCE`. Keep its signing algorithm on RS256.

Your five existing Vercel variables map as follows:

- `AUTH0_DOMAIN`: tenant domain only, such as `tenant.us.auth0.com`
- `AUTH0_CLIENT_ID`: the SPA application's Client ID
- `AUTH0_SCOPE`: `openid profile email offline_access`
- `AUTH0_CLIENT_SECRET`: server-only application secret; the SPA never receives or uses it
- `AUTH0_SECRET`: server-only 32-byte session secret; reserved for a future server session layer

Add the one required missing variable:

```env
AUTH0_AUDIENCE=https://api.nine-six.example
```

Add this Auth0 Post Login Action to the Login flow. It keeps the identity contract compatible with the authoritative Party database role:

```js
exports.onExecutePostLogin = async (_event, api) => {
  api.idToken.setCustomClaim('role', 'authenticated');
};
```

## 2. Neon

The Vercel variable `DB_CONNECT` must contain the Neon pooled Postgres connection string and must be enabled for Preview and Production. It is read only inside `api/community`; never create a `VITE_DB_CONNECT` variable.

On the first health or leaderboard request, the server idempotently creates:

- `nine_six_profiles`
- `nine_six_party_stats`
- `nine_six_wallet_ledger`
- `nine_six_schema_migrations`

Verify the live connection at `/api/community/health` and the public read-only board at `/api/community/leaderboard`. The browser receives only connection status and leaderboard rows, never SQL credentials.

## 3. Vercel Environment

Required values for the current shared-community slice:

```env
DB_CONNECT=postgresql://server-only-neon-connection
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your-spa-client-id
AUTH0_AUDIENCE=https://api.nine-six.example
AUTH0_SCOPE=openid profile email offline_access
AUTH0_SECRET=server-only-random-secret
AUTH0_CLIENT_SECRET=server-only-auth0-secret
PARTY_MODE_ENABLED=true
```

Apply values to both Preview and Production, then redeploy. `/api/community/config` intentionally returns only the Auth0 domain, client ID, audience, scope, and boolean readiness flags.

## 4. Party Writes

The shared Neon leaderboard is public and read-only. Verified stats will be written only by authoritative match settlement; there is no client score-submission endpoint. This prevents forged solo scores, duplicate payouts, and browser-authored wins.

The existing Supabase RPC migration remains available as a legacy live-table backend until the authoritative room, turn, chat, ledger, and settlement transactions are migrated to Neon. Local Party preview stays enabled during that transition and never writes global records.

Community chips have no cash value. They cannot be purchased, redeemed, or transferred.
