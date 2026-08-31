# frontend

Next.js (App Router) + TypeScript, Tailwind v4 + shadcn/ui.

## Setup

Copy `.env.local` from `.env.example` and fill in `NEXT_PUBLIC_API_URL` (the
backend's own public address) and `DEV_ORIGINS` (see
`project/setup/01-dev-environment.md`).

```bash
npm install
npm run dev     # :3000
```

## Auth (feature 1003)

The three portal roots (`/account`, `/contractor`, `/ops`) are server
components: each reads the session once, server-side, via
`src/lib/session.ts` (a credentialed fetch to the backend's `GET /api/me`),
and renders the gate, the wrong-door card, or the logged-in placeholder --
never a client-side flash of the wrong state.

All state-changing auth calls (sign in, sign out, request/apply a password
reset) go through `src/lib/auth-client.ts`, Better Auth's own client pointed
at the backend's `/api/auth/*` -- one auth brain, server-side (decision 1).

`src/components/auth/` holds the screens and their shared pieces (gate
chrome, field, buttons, banner), built to the Portal Login Gate style
reference (`project/design/frontend-conventions.md`, 31 Aug 2026).

## Checks

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e   # Playwright -- desktop 1440x900, tablet 768x1024, mobile 390x844
```

`test:e2e` runs against `https://idelta.com.au` (not localhost) with both dev
servers up and the fixture seed loaded (`cd ../backend && npm run
db:seed:fixtures`) -- the session cookie is scoped to `COOKIE_DOMAIN`, so the
login flow only works end to end through the real domain.
