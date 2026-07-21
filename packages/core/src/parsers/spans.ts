import type { SourceSpan } from "../schemas";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Locate `quote` inside `source` and return its char-offset span, or null.
 * Exact match first; then a whitespace-tolerant retry (models sometimes
 * collapse newlines/spaces when quoting). Offsets always index the ORIGINAL
 * source, so the receipts invariant holds by construction:
 *   source.slice(span.start, span.end) === span.text
 */
export function locateSpan(
  source: string,
  quote: string,
  fromIndex = 0,
): SourceSpan | null {
  const trimmed = quote.trim();
  if (trimmed.length === 0) return null;

  const exact = source.indexOf(trimmed, fromIndex);
  if (exact !== -1) {
    return { start: exact, end: exact + trimmed.length, text: trimmed };
  }

  const pattern = trimmed.split(/\s+/).map(escapeRegExp).join("\\s+");
  const re = new RegExp(pattern, "g");
  re.lastIndex = fromIndex;
  const m = re.exec(source);
  if (m) {
    return { start: m.index, end: m.index + m[0].length, text: m[0] };
  }
  return null;
}
