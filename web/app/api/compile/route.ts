import { NextResponse } from "next/server";
import { parseJD, parseResume, diffGaps } from "@dryrun/core";
import { sseResponse } from "../../lib/stream";
import { makeStructuredClient } from "../../lib/providers";

// Two parse calls (in parallel) + one embeddings call + one diff call.
export const maxDuration = 300;

/**
 * Compile a JD + resume into evidenced gaps.
 *
 * Streams by default (`event: stage` ×2 → `event: result` | `event: error`) so
 * the compile trace is visible while ~40s of model latency elapses, instead of a
 * spinner that proves nothing. The stages are emitted around the real awaits —
 * they are a trace, not an animation.
 *
 * The gaps are the first artifact and stay a first-class one; questions are
 * compiled separately by /api/plan, so a plan retry never re-buys the parses.
 *
 * TEMPORARY: a client that doesn't ask for `text/event-stream` still gets the
 * old `{ gaps }` JSON. This keeps `main` demoable while /compile migrates to
 * readSSE in the FE session landing today — delete the JSON branch once it has.
 */
export async function POST(req: Request) {
  let jdText: string;
  let resumeText: string;
  try {
    const body = await req.json();
    jdText = String(body.jd ?? "");
    resumeText = String(body.resume ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!jdText.trim() || !resumeText.trim()) {
    return NextResponse.json(
      { error: "Both jd and resume are required." },
      { status: 400 },
    );
  }

  const wantsStream = (req.headers.get("accept") ?? "").includes(
    "text/event-stream",
  );

  if (!wantsStream) {
    try {
      const client = makeStructuredClient();
      const [jd, resume] = await Promise.all([
        parseJD(jdText, { client }),
        parseResume(resumeText, { client }),
      ]);
      const gaps = await diffGaps(jd, resume, { client });
      return NextResponse.json({ jd, resume, gaps });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : String(e) },
        { status: 500 },
      );
    }
  }

  return sseResponse(async (emit) => {
    const client = makeStructuredClient();

    emit("stage", { stage: "parsing" });
    const [jd, resume] = await Promise.all([
      parseJD(jdText, { client }),
      parseResume(resumeText, { client }),
    ]);
    emit("stage", {
      stage: "parsing",
      done: true,
      requirements: jd.lines.length,
      resumeLines: resume.lines.length,
      // Quotes the parser could not anchor to the source. Surfaced, not hidden —
      // this number is the citation-validity eval's input.
      dropped: jd.dropped.length + resume.dropped.length,
    });

    emit("stage", { stage: "diffing" });
    const gaps = await diffGaps(jd, resume, { client });
    emit("stage", { stage: "diffing", done: true, gaps: gaps.length });

    // Full parser output, not just gaps: the client holds session state, and the
    // plan/debrief surfaces need the source texts and line spans to render
    // receipts without another round trip.
    emit("result", { jd, resume, gaps });
  });
}
