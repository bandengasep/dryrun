# DryRun — the interview compiler

[![CI](https://github.com/bandengasep/dryrun/actions/workflows/ci.yml/badge.svg)](https://github.com/bandengasep/dryrun/actions/workflows/ci.yml)

> Paste a job description and a resume; DryRun diffs them into evidenced gaps — every gap citing the JD line that demands it and the resume line that's silent — then compiles a personalized interview environment: executable SQL challenges and behavioral questions, each traceable to the gap that produced it.

**Hackathon submission — deadline 31 Jul 2026, 23:59 SGT.** Public repo + ≤3-min video + ≤1,000-word write-up. Judged on five pillars: Problem · Approach · Evidence · Constraints · Honesty & Trajectory. Guiding rule: *a modest claim, proven, beats a grand claim, asserted.*

**Team:** Timothy (backend / agents / evals) · Vedika (UI/UX / video).

## Layout

```
api/app/{schemas,parsers,diff,harness,evals}/   # FastAPI backend (Python 3.12, uv)
api/tests/            # incl. tests/fixtures/ — hand-built JD × resume pairs
web/                  # Next.js app: compile-trace UI, receipts drawer
docs/                 # spec.md, decision-log.md, post-hackathon-ideas.md
.github/workflows/    # ci.yml — uv sync + pytest on every push/PR
```

## Getting started (api/)

```bash
cd api
uv sync
uv run pytest
```

## Docs

- `docs/spec.md` — full product spec
- `docs/decision-log.md` — dated architecture / scope decisions
- `CLAUDE.md` — operational guide (build order, cut list, locked stack)
