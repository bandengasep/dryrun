// Server-only half of the SSE machinery — split out from ./stream.ts (see that
// file's header for why: it's imported by client components, and this one
// needs Langfuse's flushLangfuse(), which transitively pulls in
// @opentelemetry/sdk-node's grpc/tls exporter and cannot be bundled for the
// browser). Only route.ts files should import this module.
import { encodeSSE, type SSEEmit } from "./stream";
import { flushLangfuse } from "./langfuse";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  // no-transform additionally asks intermediaries not to re-chunk or compress,
  // which is what turns a live stream into one buffered blob at the end.
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  // Nginx-family proxies buffer by default; this opts out.
  "X-Accel-Buffering": "no",
} as const;

/**
 * Wrap an async producer in a streaming Response. `run` receives an `emit`
 * function and may emit as many events as it likes; when it resolves the stream
 * closes.
 *
 * A throw inside `run` becomes a final `error` event rather than a failed
 * response: by then the 200 and the headers are already on the wire, so an
 * HTTP-level error is no longer available to us. The client must therefore
 * treat "stream ended without a result" as a failure — never as success.
 */
export function sseResponse(
  run: (emit: SSEEmit) => Promise<void>,
  opts: { heartbeatMs?: number } = {},
): Response {
  const heartbeatMs = opts.heartbeatMs ?? 10_000;
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Client hung up mid-write; stop trying to push into a dead stream.
          closed = true;
        }
      };
      const emit: SSEEmit = (event, data) => write(encodeSSE(event, data));

      heartbeat = setInterval(() => write(": heartbeat\n\n"), heartbeatMs);
      try {
        await run(emit);
      } catch (e) {
        emit("error", { message: e instanceof Error ? e.message : String(e) });
      } finally {
        clearInterval(heartbeat);
        closed = true;
        // Flushed here, after every emit() the route will ever make and before
        // the stream closes — never before the first byte, so this cannot add
        // to the latency budget readSSE's caller actually experiences (every
        // display-relevant event already left the wire by this point).
        await flushLangfuse();
        try {
          controller.close();
        } catch {
          // Already closed by a client disconnect.
        }
      }
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
