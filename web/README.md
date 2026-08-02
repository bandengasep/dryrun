# web/ — DryRun frontend

Next.js (App Router) + React 19, deployed at [dryrun-web-pi.vercel.app](https://dryrun-web-pi.vercel.app).
The four surfaces — compile, plan, session, debrief — consume `@dryrun/core`'s typed JSON
**directly as TypeScript**: components import the same Zod-derived types the backend emits,
so the receipts contract is compiler-enforced end to end.

## Run

```bash
pnpm install           # from the repo root (workspace)
pnpm --filter web dev  # http://localhost:3000 — model routes need web/.env.local (root README, Getting started)
```

Backend logic lives in `packages/core`; the thin stateless route handlers under `web/app/api/*`
re-read client-held session state on every request. The repo-wide map is in the root README's
**Repository guide**.
