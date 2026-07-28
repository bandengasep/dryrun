import { describe, it, expect } from "vitest";
import { joinTimedWords, timeForSpan } from "../src/debrief/timeline";
import type { TimedWord } from "../src/schemas";

// A video answer's timed transcript. joinTimedWords is the ONLY way turn.text
// is built for video turns, which is what makes the offset→time mapping exact
// arithmetic rather than a search.
const WORDS: TimedWord[] = [
  { start: 0.0, end: 0.30, text: "I" },
  { start: 0.30, end: 0.80, text: "built" },
  { start: 0.80, end: 1.10, text: "a" },
  { start: 1.10, end: 1.90, text: "funnel" },
  { start: 1.90, end: 2.60, text: "model" },
  { start: 2.60, end: 3.40, text: "in" },
  { start: 3.40, end: 4.20, text: "BigQuery" },
];
const TEXT = "I built a funnel model in BigQuery";

describe("joinTimedWords — the text a video turn is made of", () => {
  it("joins on a single space", () => {
    expect(joinTimedWords(WORDS)).toBe(TEXT);
  });

  it("returns an empty string for no words", () => {
    expect(joinTimedWords([])).toBe("");
  });

  it("is the exact inverse of the offsets timeForSpan computes", () => {
    // Every word must be findable at the offset the join implies.
    let cursor = 0;
    for (const w of WORDS) {
      expect(TEXT.slice(cursor, cursor + w.text.length)).toBe(w.text);
      cursor += w.text.length + 1;
    }
  });
});

describe("timeForSpan — char offsets to seconds, arithmetically", () => {
  const spanOf = (needle: string) => {
    const start = TEXT.indexOf(needle);
    return { start, end: start + needle.length, text: needle };
  };

  it("maps a single word to exactly that word's timings", () => {
    expect(timeForSpan(WORDS, spanOf("funnel"))).toEqual({ startSec: 1.1, endSec: 1.9 });
  });

  it("maps a multi-word span from the first word's start to the last word's end", () => {
    expect(timeForSpan(WORDS, spanOf("funnel model"))).toEqual({
      startSec: 1.1,
      endSec: 2.6,
    });
  });

  it("maps the first word from zero", () => {
    expect(timeForSpan(WORDS, spanOf("I"))).toEqual({ startSec: 0, endSec: 0.3 });
  });

  it("maps the final word to the recording's end", () => {
    expect(timeForSpan(WORDS, spanOf("BigQuery"))).toEqual({ startSec: 3.4, endSec: 4.2 });
  });

  it("maps a whole-transcript span across every word", () => {
    expect(timeForSpan(WORDS, spanOf(TEXT))).toEqual({ startSec: 0, endSec: 4.2 });
  });

  it("includes a word the span only partially overlaps", () => {
    // "unnel" starts inside "funnel" — the quote still happened during that word.
    expect(timeForSpan(WORDS, spanOf("unnel"))).toEqual({ startSec: 1.1, endSec: 1.9 });
  });

  it("returns null when there are no timed words (a text answer)", () => {
    expect(timeForSpan([], spanOf("funnel"))).toBeNull();
  });

  it("returns null for a span past the end of the words", () => {
    expect(timeForSpan(WORDS, { start: 900, end: 910, text: "nope" })).toBeNull();
  });

  it("returns null for a zero-length span rather than inventing an instant", () => {
    expect(timeForSpan(WORDS, { start: 5, end: 5, text: "" })).toBeNull();
  });

  it("never returns endSec earlier than startSec", () => {
    for (const needle of ["I", "funnel model", "in BigQuery", TEXT]) {
      const t = timeForSpan(WORDS, spanOf(needle))!;
      expect(t.endSec).toBeGreaterThanOrEqual(t.startSec);
    }
  });

  it("treats the space between two words as belonging to neither, mapping to the pair", () => {
    // Offsets 6..12 in "I built a funnel..." — spanning a separator.
    const span = { start: 2, end: 9, text: TEXT.slice(2, 9) };
    const t = timeForSpan(WORDS, span)!;
    expect(t.startSec).toBe(0.3); // "built"
    expect(t.endSec).toBe(1.1); // through "a"
  });
});
