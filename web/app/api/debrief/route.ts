import { NextResponse } from "next/server";
import { propagateAttributes } from "@langfuse/tracing";
import { DebriefError, DebriefRequest, compileDebrief } from "@dryrun/core";
import { makeStructuredClient, structuredModel } from "../../lib/providers";
import { flushLangfuse } from "../../lib/langfuse";

// One batched strict-SO call over the answered questions.
export const maxDuration = 300;

/**
 * Compile the debrief for a finished session.
 *
 * Receipts-critical, so it runs on OpenAI strict structured outputs — Agnes
 * cannot serve this lane (its /responses endpoint ignores json_schema formats).
 *
 * Returns JSON rather than SSE: it is one call, and the /debrief page shows a
 * skeleton while it runs.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = DebriefRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Malformed session state: ${parsed.error.issues[0]?.message ?? "unknown"}` },
      { status: 400 },
    );
  }
  const { plan, transcript } = parsed.data;

  try {
    // Trace-level name: observeOpenAI's generationName only names the
    // observation, which leaves the trace itself blank in the Langfuse UI.
    const debrief = await propagateAttributes({ traceName: "debrief" }, () =>
      compileDebrief(plan, transcript, {
        client: makeStructuredClient({
          route: "debrief",
          metadata: { questionCount: plan.questions.length, transcriptTurns: transcript.length },
        }),
        // Adopted structured-lane model (31 Jul gates); undefined = core default.
        model: structuredModel(),
      }),
    );
    return NextResponse.json({ debrief });
  } catch (e) {
    // A structural guard firing means the model produced something unshippable —
    // distinct from an outage, and worth a retry rather than a generic failure.
    if (e instanceof DebriefError) {
      return NextResponse.json({ error: e.message, kind: "structure" }, { status: 422 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  } finally {
    await flushLangfuse();
  }
}
