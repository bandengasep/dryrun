import { NextResponse } from "next/server";
import type { Gap, RequirementLine, ResumeLine } from "@dryrun/core";

function splitLinesWithSpans(text: string): Array<{ text: string; spanStart: number; spanEnd: number }> {
  const lines = text.split(/\r?\n/);
  const out: Array<{ text: string; spanStart: number; spanEnd: number }> = [];
  let idx = 0;
  for (const line of lines) {
    const start = text.indexOf(line, idx);
    const end = start + line.length;
    out.push({ text: line, spanStart: start, spanEnd: end });
    idx = end + 1;
  }
  return out;
}

function simpleMatch(reqText: string, resumeLines: string[]): boolean {
  const words = reqText
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 4);
  if (words.length === 0) return false;
  for (const r of resumeLines) {
    const lw = r.toLowerCase();
    for (const w of words) {
      if (lw.includes(w)) return true;
    }
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const jdText = String(body.jd ?? "");
    const resumeText = String(body.resume ?? "");

    const jdLines = splitLinesWithSpans(jdText).filter((l) => l.text.trim().length > 0);
    const resumeLines = splitLinesWithSpans(resumeText).filter((l) => l.text.trim().length > 0);

    const resumeTexts = resumeLines.map((r) => r.text);

    const gaps: Gap[] = jdLines.map((jl, i) => {
      const matched = simpleMatch(jl.text, resumeTexts);
      const kind: Gap["kind"] = matched ? "weak_evidence" : "missing_skill";
      const resumeMatchIndex = resumeLines.findIndex((r) => {
        const lw = r.text.toLowerCase();
        return jl.text
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((w) => w.length > 4)
          .some((w) => lw.includes(w));
      });

      const resumeSpan = resumeMatchIndex >= 0 ? {
        start: resumeLines[resumeMatchIndex].spanStart,
        end: resumeLines[resumeMatchIndex].spanEnd,
        text: resumeLines[resumeMatchIndex].text,
      } : null;

      const gap: Gap = {
        id: (globalThis as any).crypto?.randomUUID?.() ?? String(Date.now()) + "-" + i,
        kind,
        requirementId: `req-${i}`,
        jdSpan: { start: jl.spanStart, end: jl.spanEnd, text: jl.text },
        resumeLineId: resumeMatchIndex >= 0 ? `res-${resumeMatchIndex}` : null,
        resumeSpan,
        rationale: matched ? "Found weak evidence on the resume." : "No matching resume evidence found.",
      };

      return gap;
    });

    return NextResponse.json({ gaps });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
