import type { SourceSpan } from "../schemas";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const WORD_CHAR = /[A-Za-z0-9]/;

/** True when the source char at `idx` would glue onto a word-char quote edge. */
function glued(source: string, idx: number): boolean {
  const c = source[idx];
  return c !== undefined && WORD_CHAR.test(c);
}

/**
 * Locate `quote` inside `source` and return its char-offset span, or null.
 * Exact match first; then a whitespace-tolerant retry (models sometimes
 * collapse newlines/spaces when quoting). Both paths prefer occurrences whose
 * word-char edges sit on word boundaries — so "SQL" anchors to a standalone
 * SQL, not the one inside "MySQL" — but fall back to a raw hit when no
 * boundary-clean occurrence exists (totality beats nothing; the residual
 * mis-anchor risk is measured by the citation-validity eval). Offsets always
 * index the ORIGINAL source, so the receipts invariant holds by construction:
 *   source.slice(span.start, span.end) === span.text
 */
export function locateSpan(
  source: string,
  quote: string,
  fromIndex = 0,
): SourceSpan | null {
  const trimmed = quote.trim();
  if (trimmed.length === 0) return null;

  const startIsWord = WORD_CHAR.test(trimmed[0]);
  const endIsWord = WORD_CHAR.test(trimmed[trimmed.length - 1]);

  // Exact path: first boundary-clean occurrence wins; raw first hit is the fallback.
  let firstRaw = -1;
  for (
    let i = source.indexOf(trimmed, fromIndex);
    i !== -1;
    i = source.indexOf(trimmed, i + 1)
  ) {
    if (firstRaw === -1) firstRaw = i;
    const startGlued = startIsWord && glued(source, i - 1);
    const endGlued = endIsWord && glued(source, i + trimmed.length);
    if (!startGlued && !endGlued) {
      return { start: i, end: i + trimmed.length, text: trimmed };
    }
  }
  if (firstRaw !== -1) {
    return { start: firstRaw, end: firstRaw + trimmed.length, text: trimmed };
  }

  // Whitespace-tolerant fallback, boundary-preferred then raw. "g" is
  // load-bearing: exec() ignores lastIndex on a non-global regex, and
  // lastIndex is how fromIndex is honored here.
  const core = trimmed.split(/\s+/).map(escapeRegExp).join("\\s+");
  const lead = startIsWord ? "(?<![A-Za-z0-9])" : "";
  const tail = endIsWord ? "(?![A-Za-z0-9])" : "";
  const patterns = lead || tail ? [lead + core + tail, core] : [core];
  for (const pattern of patterns) {
    const re = new RegExp(pattern, "g");
    re.lastIndex = fromIndex;
    const m = re.exec(source);
    if (m) {
      return { start: m.index, end: m.index + m[0].length, text: m[0] };
    }
  }
  return null;
}
