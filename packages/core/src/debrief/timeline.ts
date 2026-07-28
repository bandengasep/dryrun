// Pure mechanics for mapping a character offset inside a video answer's text
// back to a timestamp in the recording.
//
// No model is involved and none may be: a timestamp a model produced would be a
// claim, and this file exists so it can be a calculation. The whole scheme rests
// on one invariant — a video turn's `text` is built ONLY by joinTimedWords, so
// the offset of every word is known by construction rather than by search.
import type { SourceSpan, TimedWord } from "../schemas";

/** The one way a video turn's text may be built. Single-space join, nothing else. */
export function joinTimedWords(words: TimedWord[]): string {
  return words.map((w) => w.text).join(" ");
}

export interface VideoTime {
  startSec: number;
  endSec: number;
}

/**
 * The time range during which `span` was spoken, or null when it cannot be
 * placed (a text answer with no timed words, an out-of-range span, or an empty
 * span).
 *
 * A word counts as overlapping when any part of it falls inside the span, so a
 * quote starting mid-word still resolves to the moment that word was spoken.
 * Null is returned rather than a guessed instant: a missing timestamp degrades
 * the UI to "no video link", while a wrong one sends the viewer to the wrong
 * moment and quietly discredits the quote.
 */
export function timeForSpan(words: TimedWord[], span: SourceSpan): VideoTime | null {
  if (words.length === 0) return null;
  if (span.end <= span.start) return null;

  let cursor = 0;
  let first: TimedWord | null = null;
  let last: TimedWord | null = null;

  for (const word of words) {
    const wordStart = cursor;
    const wordEnd = cursor + word.text.length;
    // Half-open overlap test: the separator space between two words belongs to
    // neither, so a span covering it maps to the words on both sides.
    if (wordStart < span.end && wordEnd > span.start) {
      if (first === null) first = word;
      last = word;
    }
    cursor = wordEnd + 1; // +1 for the single space joinTimedWords inserts
  }

  if (first === null || last === null) return null;
  return { startSec: first.start, endSec: last.end };
}
