// Shared SSE framing for the two streaming routes (/api/compile, and
// /api/session/turn from Tuesday). Server side builds the stream; client side
// parses it. Both halves live together so the wire format has exactly one
// definition.
//
// Heartbeat comments (`: heartbeat`) go out every 10s: they keep proxies from
// treating a quiet stream as dead during the long silent stretch while
// gpt-5-mini is thinking, and SSE comment lines are ignored by any conformant
// parser (including readSSE below and the browser's EventSource).
//
// NOTE: streaming behaviour on Vercel is verified on a preview deploy, not on
// localhost — localhost never buffers, so it cannot prove the headers below are
// sufficient (plan risk #3).

export type SSEEmit = (event: string, data: unknown) => void;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  // no-transform additionally asks intermediaries not to re-chunk or compress,
  // which is what turns a live stream into one buffered blob at the end.
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  // Nginx-family proxies buffer by default; this opts out.
  "X-Accel-Buffering": "no",
} as const;

/** Serialize one SSE frame. Multi-line payloads are JSON, so never contain raw newlines. */
export function encodeSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

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

export type SSEHandlers = Record<string, (data: never) => void>;

/**
 * Read an SSE response body, dispatching each frame to the handler named by its
 * `event:` field. Unhandled events and comment lines are skipped. Resolves when
 * the server closes the stream.
 *
 * Used instead of EventSource because these endpoints are POSTs carrying the
 * client-held session state, and EventSource can only issue GETs.
 */
export async function readSSE(
  res: Response,
  handlers: Record<string, (data: any) => void>,
): Promise<void> {
  if (!res.body) throw new Error("Response has no body to stream");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    // Normalize CRLF so frame splitting has one delimiter to look for.
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      dispatchFrame(frame, handlers);
      boundary = buffer.indexOf("\n\n");
    }
  }
}

function dispatchFrame(
  frame: string,
  handlers: Record<string, (data: any) => void>,
): void {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line === "" || line.startsWith(":")) continue; // blank or comment (heartbeat)
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
  }
  if (dataLines.length === 0) return;
  const handler = handlers[event];
  if (!handler) return;
  handler(JSON.parse(dataLines.join("\n")));
}
