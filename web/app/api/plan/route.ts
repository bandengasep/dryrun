import { NextResponse } from "next/server";
import { propagateAttributes } from "@langfuse/tracing";
import {
  CompileResult,
  compileSessionPlan,
  compileSessionPlanViaChat,
  PlanError,
  type SessionPlan,
} from "@dryrun/core";
import {
  makeAgnesPlanLane,
  makeStructuredClient,
  planProvider,
  structuredRequestOverrides,
  type PlanProvider,
} from "../../lib/providers";
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
 *
 * The response envelope (not the frozen SessionPlan) also reports which provider
 * compiled the plan and whether that took a failover, so the answer always says
 * who wrote it. `PLAN_PROVIDER` selects the first attempt; default "openai".
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

  // Trace-level name: observeOpenAI's generationName only names the
  // observation, which leaves the trace itself blank in the Langfuse UI.
  const traced = (fn: () => Promise<SessionPlan>) =>
    propagateAttributes({ traceName: "plan" }, fn);

  const compileOnOpenAI = (planFailover: boolean) =>
    traced(() =>
      compileSessionPlan(gaps, jd.sourceText, resume.sourceText, {
        client: makeStructuredClient({
          route: "plan",
          metadata: { gapCount: gaps.length, planProvider: "openai", planFailover },
        }),
        requestOverrides: structuredRequestOverrides(),
      }),
    );

  let servedBy: PlanProvider = planProvider();
  let planFailover = false;

  try {
    let plan: SessionPlan;
    if (servedBy === "agnes") {
      const lane = makeAgnesPlanLane({
        route: "plan",
        metadata: { gapCount: gaps.length, planProvider: "agnes", planFailover: false },
      });
      try {
        plan = await traced(() =>
          compileSessionPlanViaChat(gaps, jd.sourceText, resume.sourceText, {
            client: lane.client,
            model: lane.model,
          }),
        );
      } catch (agnesError) {
        // ANY Agnes failure — transport, malformed JSON, or a guard rejection —
        // falls over to the proven OpenAI path rather than failing the request.
        // The candidate gets their questions; the envelope says who wrote them.
        console.warn(
          `[plan] Agnes lane failed, falling over to OpenAI: ${
            agnesError instanceof Error ? agnesError.message : String(agnesError)
          }`,
        );
        servedBy = "openai";
        planFailover = true;
        plan = await compileOnOpenAI(true);
      }
    } else {
      plan = await compileOnOpenAI(false);
    }
    return NextResponse.json({ plan, planProvider: servedBy, planFailover });
  } catch (e) {
    // A guard rejection is the system working, not an outage: the model tried to
    // ship a question without a valid receipt and was refused. Distinguish it so
    // the UI can offer a retry rather than a generic failure.
    if (e instanceof PlanError) {
      return NextResponse.json(
        { error: e.message, kind: "grounding", planProvider: servedBy, planFailover },
        { status: 422 },
      );
    }
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : String(e),
        planProvider: servedBy,
        planFailover,
      },
      { status: 500 },
    );
  } finally {
    await flushLangfuse();
  }
}
