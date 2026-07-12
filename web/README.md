# web/ — DryRun frontend (Vedika's lane)

Next.js + React app: the compile-trace UI and receipts drawer, consuming the diff
engine's typed JSON. Scaffold with `npx create-next-app@latest .` here when starting.

The diff-engine JSON schema **freezes at Commit 2** (`api/app/schemas/`). Breaking
changes require a `docs/decision-log.md` entry and a ping to Vedika.
