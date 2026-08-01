# DryRun landing spec (27 Jul 2026) — measured from the Framer "Message" template, themed Reading Room daylight

Source: remixed free template "Message" (Arthur Duchesne), serialized node-by-node from Timothy's Framer workspace (project "Message-AI-copy"). Framer is **reference only** — this page is built in `web/` and deployed on Vercel like everything else. Theme values come from the locked Reading Room daylight palette (see AGENTS.md Stack); this doc contributes the *measured layout system* and section blueprint.

> **Amendment, 2 Aug 2026.** The hero gained an optional dark treatment ("Reading Room, after hours" + a Vanta mesh that renders in dark only) behind the navbar theme toggle. Every number in this doc — the spacing scale, section blueprint, radii, type roles — is unaffected: the dark theme swaps colour-bearing tokens and nothing else. Daylight remains the default this spec describes. See decision-log 2026-08-02.

## Measured layout system (use these numbers, don't eyeball)

- **Container:** content max-width **1128px**, sections carry their own `24px` horizontal padding (hero: 16px). Page width basis 1200.
- **Vertical rhythm:** hero `160px` top / `64px` bottom · standard sections `96px` top+bottom · pricing-analog (our evidence band) `128px` · final CTA band `48px` inside its rounded shell.
- **Gap scale (observed frequency):** `12` (dense rows) · `24` (card innards) · `40` (section header → content) · `48` (CTA band) · `80` (hero headline → proof block). Plus 8/10/16/32 as minor steps. Adopt: **8 · 12 · 16 · 24 · 32 · 40 · 48 · 80**.
- **Radii:** cards/large shells **20px**, hero/CTA mega-shells **40px** (concentric: inner elements ≤ 20).
- **Copy measures:** headline blocks max **640px**, supporting paragraphs **500–580px**, card text **330–350px**.
- **Border trick (adopt):** the template defines borders as *alpha of the foreground* (`Border = white @ 16%` on dark). Ours: **`ink #1D2127 @ 12%`** for hairlines, `@ 20%` for strong — consistent on gradient, paper, and white surfaces alike, and it collapses two border tokens into a formula.
- **Fade trick (adopt):** section-bottom gradients from `transparent → Background@50%` used to soften photo edges; ours becomes `transparent → #EDF1F7` to melt the hero texture into the page.

## Type roles (template's 7-preset system → ours)

| Template role | Ours | Face · weight |
|---|---|---|
| Heading 1 / Heading 2 (Host Grotesk 400) | Display 1 / Display 2 | **Fraunces** 600, tight (-0.5px); H1 ~56/60, H2 ~34/40 |
| BodyLarge (Host Grotesk) | Lead | Instrument Sans 400 · 19/30 |
| Body / BodyStrong (DM Sans 400/500) | Body / BodyStrong | Instrument Sans 400/600 · 16/26 |
| BodySmall / BodySmallStrong | Small / SmallStrong | Instrument Sans 400/600 · 14/20 |
| — (new, ours) | Kicker / Mono | Google Sans Code 500 · 12/16 wide-tracked caps; 400 · 13/20 for evidence |

Fonts via `next/font/google`: Fraunces, Instrument Sans, Google Sans Code. Note the template holds heading weight at 400 and gets hierarchy from *size alone* — with Fraunces we keep 600 but stay restrained on size steps.

## Section blueprint (measured order → DryRun content)

| # | Template section (h) | Ours | Content notes |
|---|---|---|---|
| 0 | Nav | Nav | wordmark + ink dot · How it works · Evidence · CTA "Compile your interview" |
| 1 | Hero 800px, pad 160/64, gap 80 | Hero | Kicker → Fraunces H1 "Rehearse the interview you're about to have." → lead (≤640px) → dual CTA → **trace-card proof block** (the 80px-gap slot the template gives its app mock). Background: daylight gradient + heavily-dimmed oversized mono trace lines, melted with the fade trick. NO photography. |
| 2–3 | Features ×3 (763px, 3-up cards w/ mini-mocks) | The receipts trio | Compile / Plan / Debrief cards; mini-mocks = gap receipt · question card w/ gapId chip · quote chip w/ timestamp (all exist as Paper artboard fragments — port, don't reinvent) |
| 4 | WhyItWorks (740px, numbered steps + panel) | Four stages | Compile → Plan → Session → Debrief numbered rail beside a session-room still |
| 5 | Testimonials (582px) | **"What the debrief sounds like"** | Labeled sample debrief quotes (covered/missed rows). NEVER fake testimonials — Honesty pillar. |
| 6 | Pricing (919px, pad 128) | **Evidence band** | The eval numbers as "the receipts": grounding %, citation validity, Jaccard, cost/latency, baseline comparison — populated Thursday from `evals/results/`. Until then: targets labeled as targets. |
| 7 | FAQ (487px, accordion) | FAQ | Real ones: Why no scores? · Where does my resume go? (client-held, save is explicit) · Which AI runs the interview? (Agnes, labeled failover) · What's a receipt? |
| 8 | FinalCTA (456px, 40px-radius shell, pad 48) | Final CTA | "Compile your interview →" on an ink-blue shell; footer with honest one-liner + repo link |

## Explicitly skipped from the template

Photographic backgrounds (replaced by trace texture) · smooth-scroll/scroll-jack external components · cookie banner · locale selector · the sage `Main/Secondary #E8FF9C` accent (ours is ink-blue `#2E4C8F` with an alpha ramp `-20/-0` mirroring the template's).

## FE build notes

- This page + the four Paper artboards share one `globals.css` written from the Paper tokens; landing-only additions: the gradient ground, trace-texture layer (plain absolutely-positioned dimmed `<pre>` — no canvas/shader), alpha-border formula.
- Build order within the page: nav+hero (with trace card) → receipts trio → four stages → FAQ → final CTA → evidence band + sample-debrief last (content lands Thursday).
- The old `landing.tsx`/Vanta/CDN three.js die with this page (already in plan). Copy claims stay honest: no "on-device", no invented numbers.
