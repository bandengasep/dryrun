# web/ — DryRun frontend (Vedika's lane)

Next.js (App Router) + React. The compile-trace UI and receipts drawer, consuming the
diff engine's typed JSON **directly as TypeScript** — components import the same
`@dryrun/core` schema types the backend emits, so the receipts contract is
compiler-enforced end to end (no Pydantic↔TS drift).

## Run

```bash
pnpm install          # from the repo root (workspace)
pnpm --filter web dev  # http://localhost:3000
```

Backend logic lives in `packages/core` and is called from thin route handlers under
`web/app/api/*` (added with the diff-engine commit). Sandbox routes that execute SQL
run on the Node.js runtime (`export const runtime = "nodejs"`).
