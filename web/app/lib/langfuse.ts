// Public, always-safe Langfuse surface for route handlers. Every export here
// is a no-op when LANGFUSE_* env vars are absent — `next build`, CI, and any
// dev machine without a Langfuse account are unaffected. The actual
// OpenTelemetry wiring (NodeSDK + LangfuseSpanProcessor + masking) lives in
// ./langfuse-otel, which this file imports statically: this project has no
// edge routes, so unlike instrumentation.ts (which Next may load in an edge
// context and therefore runtime-gates), a static import here is safe.
import { langfuseSpanProcessor } from "./langfuse-otel";

/** True only when all three LANGFUSE_* env vars are set. */
export function langfuseEnabled(): boolean {
  return Boolean(
    process.env.LANGFUSE_PUBLIC_KEY &&
      process.env.LANGFUSE_SECRET_KEY &&
      process.env.LANGFUSE_BASE_URL,
  );
}

/**
 * Flush buffered spans before a serverless function's response finishes.
 * No-op keyless (the processor is never constructed — see ./langfuse-otel).
 * Call from a `finally` in JSON routes, and it is already wired into
 * sseResponse's teardown (./sse-response.ts) for the two SSE routes.
 */
export async function flushLangfuse(): Promise<void> {
  if (!langfuseSpanProcessor) return;
  try {
    await langfuseSpanProcessor.forceFlush();
  } catch {
    // A flush failure must never fail (or delay retrying) the actual request —
    // observability is best-effort, never load-bearing for the response.
  }
}
