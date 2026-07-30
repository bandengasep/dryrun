import { NextResponse } from "next/server";
import { CompileResult, compileSessionPlan, PlanError } from "@dryrun/core";
import { makeStructuredClient } from "../../lib/providers";
import { flushLangfuse } from "../../lib/langfuse";

// One batched strict-SO call over the compiled gaps.
export const maxDuration = 120;

/**
 * Compile the interview questions a candidate is likely to face from their gaps.
 *
 * Body is exactly what /api/compile emitted in its `result` event, forwarded
 * verbatim by the client — the routes are stateless, so the client is the only
 * thing holding session state. It is re-validated here rather than trusted:
 * it made a round trip through the browser, and a plan built on a malformed gap
 * would carry a broken receipt chain.
 *
 * Returns JSON rather than SSE: there is one call and no intermediate stages
 * worth showing, and the /plan page renders a skeleton while it runs.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = CompileResult.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Malformed compile result: ${parsed.error.issues[0]?.message ?? "unknown"}` },
      { status: 400 },
    );
  }
  const { jd, resume, gaps } = parsed.data;
  if (gaps.length === 0) {
    return NextResponse.json(
      { error: "No gaps to compile an interview from." },
      { status: 400 },
    );
  }

  try {
    const plan = await compileSessionPlan(gaps, jd.sourceText, resume.sourceText, {
      client: makeStructuredClient({ route: "plan", metadata: { gapCount: gaps.length } }),
    });
    return NextResponse.json({ plan });
  } catch (e) {
    // A guard rejection is the system working, not an outage: the model tried to
    // ship a question without a valid receipt and was refused. Distinguish it so
    // the UI can offer a retry rather than a generic failure.
    if (e instanceof PlanError) {
      return NextResponse.json(
        { error: e.message, kind: "grounding" },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  } finally {
    await flushLangfuse();
  }
}
