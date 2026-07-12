# Decision log

Format: `YYYY-MM-DD — decision — one-line rationale`. Standing constraints (the cut
list, receipts-everywhere, execution-as-ground-truth, OpenAI-only runtime) live in
`CLAUDE.md` → "Ground rules".

## 2026-07-12

- **TODO — the three 12-Jul decisions from the spec are not yet transcribed.** The
  source (`interview-compiler-spec.md` → `docs/spec.md`) is not in the repo yet;
  Timothy to paste these three entries verbatim so this log isn't silently incomplete.
- Stack locked — **mobile formally retired, web app only**; challenge execution and
  code editing are desktop-native. (Source: `CLAUDE.md` → "Stack".)
- Project named **DryRun** — "the interview compiler."
- **Per-person branch model** — `timothy` and `vedika` branch off `main`; all
  day-to-day work happens there; nothing lands on `main` except via PR with CI green.
- **Repo public from day 1** (Timothy's call) — the submission requires public anyway,
  and the live commit history is Honesty & Trajectory evidence.

## 2026-07-13

- **Phase 0 bootstrap executed** — repo initialized on the personal GitHub account
  `bandengasep`, remote via SSH host alias `github.com-personal`.
- **Doc-drift fix** — `CLAUDE.md` had documented `gh-personal` as an SSH host alias;
  it is actually a zsh `gh auth switch` alias (gh-CLI account toggle, not SSH). The
  real SSH host aliases are `github.com-personal` / `github.com-comchord`; CLAUDE.md
  corrected accordingly. (No SSH config change made.)
