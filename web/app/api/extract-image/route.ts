import { NextResponse } from "next/server";
import { makeStructuredClient } from "../../lib/providers";

// One vision call. Measured ~25s for a full page of a job posting.
export const maxDuration = 60;

/** Refuse a payload larger than this base64 data URL length (~8MB of image). */
const MAX_DATA_URL_CHARS = 8 * 1024 * 1024;

/** The model says exactly this when it can find no text — see the prompt. */
const NO_TEXT_SENTINEL = "NO_TEXT_FOUND";

const TRANSCRIBE_PROMPT = [
  "Transcribe ALL text visible in this image, verbatim.",
  "Preserve line breaks, headings, and bullet markers as they appear.",
  "Copy the characters exactly — do not fix spelling, expand abbreviations, translate, summarize, or reorder anything.",
  "Ignore browser chrome, navigation bars, cookie banners, and advertising — transcribe the document content only.",
  "Output only the transcription. No commentary, no markdown code fences.",
  `If the image contains no readable text, reply with exactly: ${NO_TEXT_SENTINEL}`,
].join("\n");

/**
 * Read the text out of a screenshot.
 *
 * This exists because the job postings people actually need sit behind login
 * walls — measured 28 Jul, the demo's own posting (NBS CareerGO) 302s to a login
 * page, and Lever serves a JS shell. A screenshot is the one thing a candidate
 * can always produce.
 *
 * What comes back is a DRAFT, and the client is required to put it in an
 * editable field rather than compiling it. Transcription is lossy — measured at
 * 10/49 lines verbatim, with an en-dash silently becoming a hyphen — and the
 * receipts engine would happily validate spans against a transcription no
 * employer wrote. Human confirmation is the guard; this route does not pretend
 * otherwise.
 *
 * Stores nothing. The image is forwarded to OpenAI and discarded.
 */
export async function POST(req: Request) {
  let imageDataUrl: string;
  try {
    const body = await req.json();
    imageDataUrl = String(body.imageDataUrl ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "Expected an image data URL." },
      { status: 400 },
    );
  }
  if (imageDataUrl.length > MAX_DATA_URL_CHARS) {
    return NextResponse.json(
      { error: "That image is too large. Try a smaller screenshot." },
      { status: 413 },
    );
  }

  try {
    const client = makeStructuredClient();
    const completion = await client.chat.completions.create({
      model: process.env.VISION_MODEL ?? "gpt-5-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: TRANSCRIBE_PROMPT },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
    });

    const text = (completion.choices[0]?.message?.content ?? "").trim();

    // A blank or unreadable image must surface as an error, not as an empty
    // textarea the user has to diagnose. (Verified on 28 Jul: given an
    // all-black render the model declines rather than inventing a posting —
    // this branch is what turns that decline into a usable message.)
    if (!text || text.includes(NO_TEXT_SENTINEL)) {
      return NextResponse.json(
        {
          error:
            "Couldn't find any readable text in that image. Try a sharper or more zoomed-in screenshot.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
