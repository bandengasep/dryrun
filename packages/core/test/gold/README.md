# Gold adjudication — a 10-minute guide

This directory holds the hand-adjudicated ground truth the eval suite scores
the gap engine against. It's generated, then you fill it in.

## How it gets here

Run `pnpm evals` from `packages/core` (or the eval script from the repo root —
see `AGENTS.md`). The `adjudication-prep` suite runs the real
`parseJD` → `parseResume` → `diffGaps` pipeline on every JD/resume pair in
`test/fixtures/` and writes, per pair:

- **`pair-NN.model.json`** — the full model output (parsed JD, parsed resume,
  every `Gap` with its receipts). You don't edit this file; it's the record
  of what the model actually produced.
- **`pair-NN.adjudication.json`** — one entry per gap, pre-filled with
  everything except your verdict:

  ```json
  {
    "gaps": [
      {
        "id": "gap-7",
        "jdQuote": "3+ years of production SQL",
        "resumeQuote": "Wrote ad-hoc SQL queries for a class project.",
        "kind": "weak_evidence",
        "rationale": "Mentions SQL but the only evidence is a class project, not production experience.",
        "verdict": ""
      }
    ],
    "missedRequirements": []
  }
  ```

Re-running `pnpm evals` **never overwrites an `adjudication.json` that
already exists** — your in-progress verdicts are safe. If you want a clean
re-generation (e.g. after a prompt change), delete the file first.

## What you do: fill in `verdict`

For every entry in `gaps`, read `jdQuote`, `resumeQuote`, `kind`, and
`rationale`, then set `verdict` to exactly one of:

| Verdict | Means |
|---|---|
| `"agree"` | The model got this gap right — both the classification (`kind`) and the reasoning hold up against the actual JD/resume text. |
| `"wrong_kind:<kind>"` | The gap is real (the JD line genuinely needs this) but the model classified it wrong. Put what YOU think the correct kind is, e.g. `"wrong_kind:missing_skill"` if the model said `weak_evidence` but you think there's really no evidence at all. |
| `"not_a_requirement"` | The `jdQuote` isn't actually a hiring requirement — filler language, a benefit, a value statement, boilerplate — so this gap shouldn't exist at all. |

Leave `verdict` as `""` for anything you haven't reviewed yet — the scorer
(`gold-score.test.ts`) only counts reviewed entries, so partial progress is
fine to run mid-session.

## Worked example

```json
{
  "id": "gap-3",
  "jdQuote": "Experience with dbt or similar transformation tooling",
  "resumeQuote": null,
  "kind": "missing_skill",
  "rationale": "No orchestration or transformation tooling appears anywhere in the resume.",
  "verdict": "agree"
}
```

You check the actual JD text — yes, dbt is asked for. You check the actual
resume text — no, there's genuinely nothing about dbt, Airflow, or any
transformation tool. The model said `missing_skill` with no resume citation,
and that's correct. `verdict: "agree"`.

Now imagine instead the resume had a line like *"Built transformation
pipelines in plain SQL scripts"* — real evidence, just not dbt specifically.
If the model still said `missing_skill` and cited nothing, that's a miss:
`verdict: "wrong_kind:weak_evidence"` (the resume line is real evidence, just
weak/adjacent — not silence).

## `missedRequirements` — what the model never surfaced at all

Sometimes the JD demands something and the model's parser never even
extracted it as a requirement, so there is no gap to adjudicate at all — the
whole thing is invisible in `pair-NN.model.json`. When you spot one of these
while reading the JD, add its **verbatim JD quote** (copy the exact
characters — same convention as every other receipt in this project) to
`missedRequirements`:

```json
"missedRequirements": ["5+ years of dbt in a production data warehouse"]
```

Only add a requirement here if you're confident it's real and the model
truly missed it — don't add things you're merely unsure about (see the
honesty rule below).

## The honesty rule: when unsure, `not_a_requirement`

Precision over flattery. If you're genuinely uncertain whether a `jdQuote`
is a real requirement or whether a gap's classification is defensible, do
NOT mark it `"agree"` just because it's plausible — a generous adjudicator
makes the eval numbers meaningless. The default for a doubtful case is
`"not_a_requirement"` (it costs the model a point, which is the honest
outcome when you can't confirm the gap holds up). This mirrors the project's
own no-scores, receipts-only stance: an unprovable claim doesn't get credit
just because it sounds right.

## Running the scorer

Once you've filled in at least one verdict anywhere, run:

```sh
pnpm --filter @dryrun/core exec vitest run test/evals/gold-score.test.ts
```

This is the one suite in `test/evals/` that is **not** gated behind
`RUN_EVALS=1` — it makes no model calls, only reads the JSON files in this
directory, so it's cheap to re-run after every adjudication session. It
prints a per-pair table plus an aggregate (`console.table`) and writes the
same numbers to `evals/results/gold-score-<date>.json` at the repo root.
