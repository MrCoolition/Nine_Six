# NINE SIX

A phone-first dice and card game with guest Solo/Daily play and authenticated 2-9 player Party tables. Community chips are fictional, non-purchasable, non-transferable, and have no cash value.

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
```

The local server defaults to `http://127.0.0.1:4174`.

Community services use Auth0 SPA login, Neon Postgres through server-only Vercel Functions, and a shared standings API. Without complete cloud credentials, the Party gate offers a clearly labeled local preview with simulated rivals while still reading the real Neon leaderboard when available. See [Party Mode setup](docs/PARTY_MODE_SETUP.md) before enabling authenticated tables.

The authoritative rules live in `src/app/core/game-rules.js`. The existing complete Party RPC contract remains in `supabase/migrations/20260712_party_mode.sql` while Neon is introduced in protected slices. Clients never submit dice, cards, scores, winners, balances, or payouts.
