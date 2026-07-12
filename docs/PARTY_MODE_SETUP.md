# NINE SIX Party Mode Setup

Party Mode requires Auth0 and Supabase. Solo and Daily remain available without an account. Never commit `.env` files or the Supabase service-role key.

## 1. Auth0 SPA

Create or reuse an Auth0 **Single Page Application** with Authorization Code + PKCE and RS256.

Configure these URLs for both local development and production:

- Allowed Callback URLs: `http://127.0.0.1:4174`, `https://nine-six-rho.vercel.app`
- Allowed Logout URLs: `http://127.0.0.1:4174`, `https://nine-six-rho.vercel.app`
- Allowed Web Origins: `http://127.0.0.1:4174`, `https://nine-six-rho.vercel.app`

Create an Auth0 API identifier for `VITE_AUTH0_AUDIENCE` / `AUTH0_AUDIENCE`. Keep its signing algorithm on RS256.

Add this Auth0 Post Login Action to the Login flow. Supabase uses the literal `role: authenticated` ID-token claim to apply its authenticated database role:

```js
exports.onExecutePostLogin = async (_event, api) => {
  api.idToken.setCustomClaim('role', 'authenticated');
};
```

## 2. Supabase

Install Supabase from the Vercel Marketplace or create a Supabase project, then enable Auth0 under Supabase Authentication > Third-party Auth.

Run `supabase/migrations/20260712_party_mode.sql` in the Supabase SQL editor. The migration creates:

- Profiles, append-only wallet ledger, rooms, matches, players, events, messages, reports, blocks, and standings
- Atomic authoritative RPCs for ready, start, turn, timeout, forfeit, settlement, rematch, and rescue
- Row Level Security and private `room:{roomId}` Realtime authorization
- Seven-day chat expiry and service-only moderation/report writes
- Database kill switches in `party_runtime_flags`

Do not expose `SUPABASE_SERVICE_ROLE_KEY` with a `VITE_` prefix. The browser receives only the publishable key and presents its Auth0 ID token directly to Supabase.

## 3. Vercel Environment

Copy the names from `.env.example` into Vercel for Preview and Production. Required live values are:

```env
VITE_PARTY_MODE_ENABLED=true
VITE_PARTY_DEMO_ENABLED=false
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=https://api.nine-six.example
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key

AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.nine-six.example
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
```

`CHAT_BLOCKLIST` is a comma-separated private moderation list. Adult rooms preserve ordinary profanity; PG rooms additionally sanitize profanity. Both modes reject configured slurs, threats, doxxing patterns, sexual content involving minors, and spam.

## 4. Rollout And Kill Switches

Keep `VITE_PARTY_MODE_ENABLED=false` until the migration and Auth0 Action are live. Use the singleton row in `party_runtime_flags` to pause Party Mode, public rooms, chat, or wallet settlement without a client redeploy. Vercel Functions also honor `PARTY_CHAT_ENABLED=false` immediately.

Start with private tables. Before enabling public matchmaking, run `pnpm test`, `pnpm run verify:contracts`, multi-browser reconnect/chat tests, and the planned 100-room / 900-seat load test against the provisioned Supabase project.

Community chips have no cash value. They cannot be purchased, redeemed, or transferred.
