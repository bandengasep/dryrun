// Next.js instrumentation hook (App Router convention):
// https://nextjs.org/docs/app/guides/instrumentation
//
// Next calls `register()` exactly once per server instance, before it serves
// any request. The actual OpenTelemetry/Langfuse setup lives in
// app/lib/langfuse-otel.ts, dynamically imported ONLY on the Node.js runtime —
// see that file's header for why (NodeSDK is not edge-compatible; this repo
// has no edge routes today, but the guard is the documented-correct pattern:
// https://nextjs.org/docs/app/guides/open-telemetry#manual-opentelemetry-configuration).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./app/lib/langfuse-otel");
  }
}
