# NINE SIX

A phone-first dice and card game with guest Solo/Daily play and authenticated 2-9 player Party tables. Community chips are fictional, non-purchasable, non-transferable, and have no cash value.

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
```

The local server defaults to `http://127.0.0.1:4174`.

Party Mode uses Auth0 SPA login, Supabase Postgres/Realtime, and Vercel Functions. Without cloud credentials, the Party gate offers a clearly labeled local preview with simulated rivals. See [Party Mode setup](docs/PARTY_MODE_SETUP.md) before enabling live community tables.

The authoritative rules live in `src/app/core/game-rules.js`; Party rolls and wallet settlement live in `supabase/migrations/20260712_party_mode.sql`. Clients never submit dice, cards, scores, winners, balances, or payouts.
