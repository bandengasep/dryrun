// Ingestion mechanics: the pure, dependency-free half of turning an uploaded
// file into text. The libraries that do the actual decoding (pdfjs-dist,
// mammoth) live in web/ — core never takes a dependency to read a file format.
// What lives here is the part worth testing: which extractor a file needs, how
// pdf.js text runs become a document string, and the guards that stop a silent
// empty extraction from reaching the compile form.
//
// Why any of this is in core at all: the same rule that put locateSpan here.
// String mechanics that decide what the user sees are the kind of thing that
// must be pinned by tests, and web/ has no test runner this week.

/** Raised for anything that makes a file unusable, with a message meant for the user. */
export class IngestError extends Error {}

export type IngestMode = "text-file" | "pdf" | "docx" | "image";

/** Files above this are refused before they are read into memory. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Below this many characters we treat an extraction as failed rather than
 * successful-but-empty. A scanned PDF has no text layer and yields "", which
 * would otherwise land the user in a blank textarea with no explanation.
 */
export const MIN_TEXT_CHARS = 40;

/** Pages beyond this are ignored — bounds both time and the eventual parse cost. */
export const MAX_PDF_PAGES = 15;

const EXTENSION_MODES: Record<string, IngestMode> = {
  txt: "text-file",
  md: "text-file",
  pdf: "pdf",
  docx: "docx",
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
};

const SUPPORTED_HUMAN = "PDF, DOCX, TXT, MD, or a PNG/JPG screenshot";

/**
 * Decide which extractor a filename needs. Throws rather than returning null:
 * every call site has to tell the user something, and the message belongs with
 * the rule that rejected the file.
 */
export function modeForFile(fileName: string): IngestMode {
  const parts = fileName.toLowerCase().split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1] : "";
  if (!ext) {
    throw new IngestError(
      `"${fileName}" has no file extension, so there's no way to tell what it is. Upload ${SUPPORTED_HUMAN}.`,
    );
  }
  // .doc is the pre-2007 binary format. mammoth reads .docx only, and failing
  // here beats failing inside the parser with a zip error.
  if (ext === "doc") {
    throw new IngestError(
      "Old-style .doc files aren't supported — re-save it as .docx (or export a PDF) and try again.",
    );
  }
  const mode = EXTENSION_MODES[ext];
  if (!mode) {
    throw new IngestError(
      `.${ext} files aren't supported. Upload ${SUPPORTED_HUMAN}, or paste the text instead.`,
    );
  }
  return mode;
}

/** One text run as pdf.js reports it from getTextContent(). */
export interface TextItemLike {
  str: string;
  hasEOL?: boolean;
}

/**
 * Turn pdf.js text runs into a document string.
 *
 * Runs are concatenated with NOTHING between them: pdf.js splits a run at every
 * font change, so "Air" + "flow" is one word and joining on a space would
 * corrupt it. Spaces that belong to the document are already inside the runs.
 * Line breaks come only from `hasEOL`, which is pdf.js's own signal.
 *
 * Whatever this returns becomes the `sourceText` every receipt is measured
 * against, so it must be deterministic — no heuristics that could shift a
 * character offset between two runs over the same file.
 */
export function joinTextItems(items: TextItemLike[]): string {
  let out = "";
  for (const item of items) {
    out += item.str ?? "";
    if (item.hasEOL) out += "\n";
  }
  return normalizeExtractedText(out);
}

/**
 * One output shape for every extractor. Each library has its own whitespace
 * habits — mammoth ends every paragraph with two newlines, pdf.js emits page
 * gaps as runs of empty lines, Word-authored text files carry CRLF — and the
 * user should not be able to tell which one read their document.
 *
 * This runs on the draft the user is about to edit, not on anything already
 * measured, so it cannot disturb a span: offsets are computed from the
 * confirmed text after they press Compile.
 */
export function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    // Collapse blank runs so a page boundary reads as a paragraph break rather
    // than as structure the parser might try to interpret.
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Refuse an oversized or empty file before spending memory on it. */
export function assertUploadSize(bytes: number, fileName: string): void {
  if (bytes <= 0) {
    throw new IngestError(`"${fileName}" is empty.`);
  }
  if (bytes > MAX_UPLOAD_BYTES) {
    const mb = (MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0);
    throw new IngestError(
      `"${fileName}" is larger than ${mb}MB. Try exporting a smaller file, or paste the text instead.`,
    );
  }
}

/**
 * Guard against a successful-looking extraction that produced nothing usable —
 * the scanned-PDF case, where there is no text layer to read.
 */
export function assertUsableText(text: string, fileName: string): void {
  if (text.trim().length < MIN_TEXT_CHARS) {
    throw new IngestError(
      `Couldn't read any text from "${fileName}". If it's a scan or an image-only PDF, ` +
        `take a screenshot instead and upload that, or paste the text.`,
    );
  }
}
