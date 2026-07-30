// Shared plumbing for the keyed eval suites (test/evals/*.test.ts): fixture
// pairing, call metering, result persistence, a tiny concurrency pool, and the
// RUN_EVALS gate. Nothing here calls a model itself.
//
// Langfuse (optional, keyless-inert): when LANGFUSE_* env vars are present
// (test/setup.ts loads repo-root .env for every vitest run, same as
// OPENAI_API_KEY), makeMeteredClient additionally wraps the client with
// observeOpenAI so eval-suite model calls show up as traces, tagged with
// {suite, pair, gitCommit}. writeResult pushes each suite's headline numbers
// as Langfuse scores attached to a real `eval:<suite>` trace. This is a
// SEPARATE OpenTelemetry registration from web/'s (this is a standalone
// vitest process, not the Next.js app), and deliberately carries full,
// unmasked input/output: fixture pairs are Timothy's own resume plus public
// job postings, never real user PII, so there is nothing here for the
// product's masking stance (AGENTS.md rule 6) to protect — masking would only
// make eval traces useless for debugging real model output.
import { execSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type OpenAI from "openai";
import { observeOpenAI } from "@langfuse/openai";
import { LangfuseClient } from "@langfuse/client";
import { propagateAttributes, startObservation } from "@langfuse/tracing";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";

const langfuseKeysPresent = Boolean(
  process.env.LANGFUSE_PUBLIC_KEY &&
    process.env.LANGFUSE_SECRET_KEY &&
    process.env.LANGFUSE_BASE_URL,
);

// Documented intent (see file header) rather than a masking toggle this file
// actually reads — this harness never passes a `mask` option below, so eval
// traces are always full IO. Setting the flag anyway keeps the contract
// explicit for anyone who greps for it, and matches web/'s LANGFUSE_TRACE_FULL_IO
// convention if this harness's masking behavior ever changes.
if (langfuseKeysPresent) process.env.LANGFUSE_TRACE_FULL_IO ??= "1";

let langfuseSpanProcessor: LangfuseSpanProcessor | undefined;
let langfuseClient: LangfuseClient | undefined;
if (langfuseKeysPresent) {
  langfuseSpanProcessor = new LangfuseSpanProcessor();
  new NodeSDK({ spanProcessors: [langfuseSpanProcessor] }).start();
  langfuseClient = new LangfuseClient();
}

/** Whether this run's model calls/scores are also going to Langfuse. */
export const langfuseEvalsEnabled = langfuseKeysPresent;

/** A trace id deterministic in {suite, date} — reruns on the same day share one trace. */
function evalTraceId(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 32);
}

/**
 * The RUN_EVALS gate — deliberately keyed on an explicit env var, NEVER on
 * whether an API key is present. test/setup.ts loads the repo-root .env for
 * every `vitest run` (so the live-smoke suites can find OPENAI_API_KEY), which
 * means the key is on disk for every local test run regardless of intent. If
 * these suites gated on key-presence instead, a plain `pnpm test` would
 * silently burn real money (~$10) and ~90 minutes of wall time every time
 * someone runs the offline suite. RUN_EVALS=1 is the conscious opt-in — see
 * the "evals" script in package.json.
 */
export const evalsEnabled = process.env.RUN_EVALS === "1";

const FIXTURES_DIR = resolve(import.meta.dirname, "../fixtures");
const REPO_ROOT = resolve(import.meta.dirname, "../../../..");
const RESULTS_DIR = resolve(REPO_ROOT, "evals/results");

export interface FixturePair {
  /** The fixture's number, as it appears in the filename (e.g. "01"). */
  n: string;
  jdPath: string;
  resumePath: string;
  jdText: string;
  resumeText: string;
}

/**
 * Scans test/fixtures for complete jd-NN.txt / resume-NN.txt pairs. Enumerated
 * dynamically rather than hardcoded — Timothy is adding new pairs the morning
 * this suite ships, and a hardcoded list would silently ignore them. A JD or
 * resume with no matching counterpart is skipped, not errored.
 */
export function loadPairs(): FixturePair[] {
  let files: string[];
  try {
    files = readdirSync(FIXTURES_DIR);
  } catch {
    return [];
  }
  const jdNs = new Set<string>();
  const resumeNs = new Set<string>();
  for (const f of files) {
    const jdMatch = /^jd-(\d+)\.txt$/.exec(f);
    if (jdMatch) jdNs.add(jdMatch[1]);
    const resumeMatch = /^resume-(\d+)\.txt$/.exec(f);
    if (resumeMatch) resumeNs.add(resumeMatch[1]);
  }
  const pairs: FixturePair[] = [];
  for (const n of [...jdNs].sort()) {
    if (!resumeNs.has(n)) continue;
    const jdPath = resolve(FIXTURES_DIR, `jd-${n}.txt`);
    const resumePath = resolve(FIXTURES_DIR, `resume-${n}.txt`);
    pairs.push({
      n,
      jdPath,
      resumePath,
      jdText: readFileSync(jdPath, "utf8"),
      resumeText: readFileSync(resumePath, "utf8"),
    });
  }
  return pairs;
}

/** Convenience lookup for suites that only want specific pair numbers (e.g. "01", "04"). */
export function pairByN(n: string): FixturePair | undefined {
  return loadPairs().find((p) => p.n === n);
}

export interface MeteredCall {
  method: "responses.parse" | "chat.completions.create";
  model: string;
  ms: number;
  usage: unknown;
}

export interface MeteredClient {
  /** Pass this in place of the plain client — the same instance, instrumented. */
  client: OpenAI;
  calls: MeteredCall[];
}

/** Optional Langfuse context to tag this suite's traces with — see the file header. */
export interface EvalLangfuseTags {
  suite: string;
  pair?: string;
}

/**
 * Wraps an OpenAI (or OpenAI-compatible) client's responses.parse and
 * chat.completions.create so every call's {model, wall-time, usage} is
 * recorded. Mutates and returns the same client instance — evals-only, never
 * used by product code, so this in-place patching is an acceptable shortcut.
 *
 * Streaming chat.completions calls are not metered for usage here: usage for
 * a stream arrives on a trailing usage-only chunk (see docs/decision-log.md
 * 2026-07-27), which this wrapper — built for non-streaming structured calls —
 * does not consume. Callers that stream should record usage themselves.
 *
 * When Langfuse is configured, the RETURNED client is additionally wrapped
 * with observeOpenAI (applied last, so it wraps the metered methods above —
 * both layers measure the same underlying call). `.calls` still reflects raw
 * metering regardless of whether Langfuse is enabled.
 */
export function makeMeteredClient(client: OpenAI, evalTags?: EvalLangfuseTags): MeteredClient {
  const calls: MeteredCall[] = [];

  const originalResponsesParse = client.responses.parse.bind(client.responses);
  client.responses.parse = (async (...args: Parameters<typeof originalResponsesParse>) => {
    const [params] = args;
    const start = performance.now();
    const result = await originalResponsesParse(...args);
    calls.push({
      method: "responses.parse",
      model: (params as { model: string }).model,
      ms: performance.now() - start,
      usage: (result as unknown as { usage?: unknown }).usage ?? null,
    });
    return result;
  }) as typeof client.responses.parse;

  const originalChatCreate = client.chat.completions.create.bind(client.chat.completions);
  client.chat.completions.create = (async (...args: Parameters<typeof originalChatCreate>) => {
    const [params] = args;
    const isStreaming = Boolean((params as { stream?: boolean }).stream);
    const start = performance.now();
    const result = await originalChatCreate(...args);
    calls.push({
      method: "chat.completions.create",
      model: (params as { model: string }).model,
      ms: performance.now() - start,
      usage: isStreaming ? null : ((result as unknown as { usage?: unknown }).usage ?? null),
    });
    return result;
  }) as typeof client.chat.completions.create;

  if (!langfuseKeysPresent) return { client, calls };

  const generationName = evalTags
    ? `${evalTags.suite}${evalTags.pair ? `:${evalTags.pair}` : ""}`
    : "eval";
  const observedClient = observeOpenAI(client, {
    generationName,
    tags: [
      "eval",
      ...(evalTags?.suite ? [`suite:${evalTags.suite}`] : []),
      ...(evalTags?.pair ? [`pair:${evalTags.pair}`] : []),
    ],
    generationMetadata: {
      suite: evalTags?.suite,
      pair: evalTags?.pair,
      gitCommit: gitCommit(),
    },
  });
  return { client: observedClient, calls };
}

function gitCommit(): string | null {
  try {
    return execSync("git rev-parse HEAD", { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

export interface ResultPayload {
  corpus: unknown;
  config: unknown;
  metrics: unknown;
  perPair: unknown;
  notes?: string;
}

/**
 * Writes one suite's results to evals/results/<name>-<yyyy-mm-dd>.json at the
 * repo root (created if absent). Returns the path written, mostly so a test
 * can log it.
 *
 * When Langfuse is configured and `scores` is given, also pushes each
 * non-null numeric entry as a Langfuse score (e.g. grounding_rate,
 * mean_pairwise_jaccard, guard_rejection_rate) attached to a real trace named
 * `eval:<name>` — deterministic per {name, date}, so re-runs on the same day
 * accumulate scores on one browsable trace rather than scattering across
 * orphaned ids. No-op (score push skipped) keyless or when `scores` is omitted.
 */
export async function writeResult(
  name: string,
  payload: ResultPayload,
  scores?: Record<string, number | null | undefined>,
): Promise<string> {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const filePath = resolve(RESULTS_DIR, `${name}-${date}.json`);
  const full = {
    startedAt: new Date().toISOString(),
    gitCommit: gitCommit(),
    ...payload,
  };
  writeFileSync(filePath, JSON.stringify(full, null, 2), "utf8");

  if (langfuseKeysPresent && langfuseClient && scores) {
    const entries = Object.entries(scores).filter(
      (e): e is [string, number] => typeof e[1] === "number" && Number.isFinite(e[1]),
    );
    if (entries.length > 0) {
      const traceId = evalTraceId(`eval:${name}:${date}`);
      // propagateAttributes sets the TRACE-level name (startObservation's own
      // `name` arg only names the root SPAN/observation, not the trace itself —
      // without this the trace shows up in the Langfuse UI with a blank name,
      // findable only by scrolling to its observation).
      await propagateAttributes({ traceName: `eval:${name}` }, async () => {
        const summary = startObservation(
          `eval:${name}`,
          {
            input: { corpus: payload.corpus, config: payload.config },
            metadata: { suite: name, gitCommit: full.gitCommit },
          },
          { parentSpanContext: { traceId, spanId: randomBytes(8).toString("hex"), traceFlags: 1 } },
        );
        summary.update({ output: { scores: Object.fromEntries(entries) } }).end();
      });

      for (const [scoreName, value] of entries) {
        langfuseClient.score.create({
          traceId,
          name: scoreName,
          value,
          dataType: "NUMERIC",
        });
      }
      await langfuseClient.flush();
      await langfuseSpanProcessor?.forceFlush();
    }
  }

  return filePath;
}

/**
 * A tiny fixed-concurrency promise pool: runs `fn(i)` for i in [0, count),
 * with at most `concurrency` in flight at once, preserving result order.
 * Good enough for the consistency suite's 20-runs-at-4 fan-out; not a general
 * task queue.
 */
export async function runPool<T>(
  count: number,
  concurrency: number,
  fn: (i: number) => Promise<T>,
): Promise<T[]> {
  const results: T[] = new Array(count);
  let next = 0;
  async function worker(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= count) return;
      results[i] = await fn(i);
    }
  }
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, count)) }, () => worker());
  await Promise.all(workers);
  return results;
}
