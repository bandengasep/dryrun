import { NextResponse } from "next/server";
import OpenAI from "openai";
import { parseJD, parseResume, diffGaps } from "@dryrun/core";

// A full compile is two parse calls + one diff call against gpt-5-mini.
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const jdText = String(body.jd ?? "");
    const resumeText = String(body.resume ?? "");
    if (!jdText.trim() || !resumeText.trim()) {
      return NextResponse.json(
        { error: "Both jd and resume are required." },
        { status: 400 },
      );
    }

    // Client constructed per request so `next build` needs no key.
    const client = new OpenAI();
    const [jd, resume] = await Promise.all([
      parseJD(jdText, { client }),
      parseResume(resumeText, { client }),
    ]);
    const gaps = await diffGaps(jd, resume, { client });

    return NextResponse.json({ gaps });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
