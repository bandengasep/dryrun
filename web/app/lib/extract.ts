// Turn an uploaded file into text, in the browser.
//
// The rules and the string mechanics live in @dryrun/core (src/ingest) — this
// file is only the wiring to the libraries that decode each format. That split
// keeps core dependency-free and puts the testable logic where the test runner is.
//
// THE CONTRACT THIS FILE SERVES (see docs/superpowers/specs/2026-07-28-document-
// ingestion-design.md): whatever comes back from here is a DRAFT. It goes into
// the editable textarea and the user presses Compile. It is never handed
// straight to /api/compile.
//
// That matters most for screenshots. Measured on 28 Jul, vision transcription
// reproduced 10 of 49 lines verbatim and turned an en-dash into a hyphen. If
// that text became `sourceText`, the span invariant would still PASS — the slice
// matches whatever string we stored — while every receipt quoted words no
// employer wrote. The confirm step, not a disclaimer, is what keeps the receipts
// claim true.
import {
  IngestError,
  MAX_PDF_PAGES,
  assertUploadSize,
  assertUsableText,
  joinTextItems,
  modeForFile,
  normalizeExtractedText,
  type IngestMode,
  type TextItemLike,
} from "@dryrun/core";

export { IngestError } from "@dryrun/core";

export interface Extracted {
  text: string;
  origin: IngestMode;
  /** Pages read, for PDFs — lets the UI say when it stopped at the cap. */
  pages: number | null;
  /** True when the pages were capped, so the UI can say so rather than silently truncating. */
  truncated: boolean;
  fileName: string;
}

/** Longest edge, in px, an image is downscaled to before upload. */
const IMAGE_MAX_EDGE = 1600;

/**
 * Extract text from a user-supplied file. Throws IngestError with a
 * user-facing message; anything else is a bug.
 */
export async function extractFromFile(file: File): Promise<Extracted> {
  assertUploadSize(file.size, file.name);
  const origin = modeForFile(file.name);

  let text: string;
  let pages: number | null = null;
  let truncated = false;

  switch (origin) {
    case "text-file":
      text = normalizeExtractedText(await file.text());
      break;
    case "docx":
      text = await extractDocx(file);
      break;
    case "pdf": {
      const out = await extractPdf(file);
      text = out.text;
      pages = out.pages;
      truncated = out.truncated;
      break;
    }
    case "image":
      text = await extractImage(file);
      break;
  }

  assertUsableText(text, file.name);
  return { text, origin, pages, truncated, fileName: file.name };
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser.js");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  // mammoth ends every paragraph with two newlines; normalize so a .docx and a
  // .pdf of the same document arrive looking the same.
  return normalizeExtractedText(result.value);
}

async function extractPdf(
  file: File,
): Promise<{ text: string; pages: number; truncated: boolean }> {
  // Dynamic import keeps ~1MB of pdf.js out of the initial bundle — it only
  // loads when someone actually uploads a PDF.
  const pdfjs = await import("pdfjs-dist");
  // Turbopack and webpack both understand `new URL(..., import.meta.url)` and
  // emit the worker as an asset. Worker loading is pdf.js's classic bundler
  // failure; if this ever regresses it fails loudly here rather than hanging.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  // Keep the loading task: destroy() lives on it, not on the document proxy,
  // and skipping it leaks the worker for the life of the tab.
  const loadingTask = pdfjs.getDocument({ data });
  try {
    const doc = await loadingTask.promise;
    const totalPages = doc.numPages;
    const pageCount = Math.min(totalPages, MAX_PDF_PAGES);

    const pageTexts: string[] = [];
    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pageTexts.push(joinTextItems(content.items as TextItemLike[]));
    }

    return {
      text: pageTexts.filter((t) => t.length > 0).join("\n\n"),
      pages: pageCount,
      truncated: totalPages > MAX_PDF_PAGES,
    };
  } finally {
    await loadingTask.destroy();
  }
}

async function extractImage(file: File): Promise<string> {
  const dataUrl = await downscaleToDataUrl(file);
  const res = await fetch("/api/extract-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageDataUrl: dataUrl }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new IngestError(
      typeof body?.error === "string"
        ? body.error
        : `Couldn't read that screenshot (the reader returned ${res.status}).`,
    );
  }
  return normalizeExtractedText(String(body?.text ?? ""));
}

/**
 * Shrink an image to a sane upload size. A full-page screenshot is routinely
 * 5MB+; at 1600px the text stays legible to the model while the request stays
 * small and fast.
 */
async function downscaleToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new IngestError("This browser couldn't process the image. Try pasting the text instead.");
  }
  // Screenshots are usually PNGs with transparency; flatten onto white so text
  // doesn't composite to black. (Learned the hard way: an alpha-flattened page
  // render came out solid black and the model correctly reported no text.)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", 0.85);
}
