// Shared SSE wire format for the two streaming routes (/api/compile, and
// /api/session/turn from Tuesday). Client side parses it here; server side
// builds it in ./sse-response.ts. The two live in separate files — NOT
// together as originally — because this one is imported by client components
// (compile/page.tsx, session/useInterviewSession.ts) and must stay free of
// server-only code. sse-response.ts pulled in Langfuse's OpenTelemetry
// exporter (grpc/tls, Node-only) when it briefly lived here, which broke the
// client bundle (`Module not found: Can't resolve 'tls'`) — split for that
// reason, not just tidiness. Both files still agree on exactly one wire
// format definition (encodeSSE here, consumed by sse-response.ts).
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

/** Serialize one SSE frame. Multi-line payloads are JSON, so never contain raw newlines. */
export function encodeSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
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
