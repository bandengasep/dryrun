// Node-only OpenTelemetry bootstrap for Langfuse. Imported exactly once, from
// instrumentation.ts's register() hook, gated on the Node.js runtime — Next's
// documented pattern (https://nextjs.org/docs/app/guides/instrumentation and
// .../guides/open-telemetry#manual-opentelemetry-configuration): NodeSDK uses
// Node built-ins the edge runtime does not have, so it must be dynamically
// imported behind a `NEXT_RUNTIME === "nodejs"` check rather than imported
// statically at the top of instrumentation.ts. This project has no edge
// routes today, but the guard is the documented-correct shape regardless.
//
// Entirely inert without env keys: `langfuseSpanProcessor` stays undefined and
// the SDK never starts, so a keyless `next build` / CI / local dev with no
// Langfuse account never depends on network access to even construct this.
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { maskForLangfuse } from "./langfuse-mask";

const keysPresent = Boolean(
  process.env.LANGFUSE_PUBLIC_KEY &&
    process.env.LANGFUSE_SECRET_KEY &&
    process.env.LANGFUSE_BASE_URL,
);

/** Exported so app/lib/langfuse.ts can forceFlush() it at the end of a request. */
export const langfuseSpanProcessor = keysPresent
  ? new LangfuseSpanProcessor({
      mask: maskForLangfuse,
      // Vercel functions can freeze between requests; export immediately
      // rather than waiting for a batch that may never fill before a freeze.
      exportMode: "immediate",
    })
  : undefined;

if (langfuseSpanProcessor) {
  const sdk = new NodeSDK({ spanProcessors: [langfuseSpanProcessor] });
  sdk.start();
}
