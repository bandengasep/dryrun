import { describe, it, expect } from "vitest";
import { locateSpan } from "../src/parsers/spans";

describe("locateSpan — receipts are computed, never trusted", () => {
  const source = "Requirements:\n- 3+ years of SQL\n- SQL modelling with dbt\n";

  it("locates an exact quote and satisfies the receipts invariant", () => {
    const span = locateSpan(source, "3+ years of SQL");
    expect(span).not.toBeNull();
    expect(source.slice(span!.start, span!.end)).toBe(span!.text);
  });

  it("finds a later duplicate when fromIndex skips the first occurrence", () => {
    const first = locateSpan(source, "SQL")!;
    const second = locateSpan(source, "SQL", first.end)!;
    expect(second.start).toBeGreaterThan(first.end - 1);
    expect(source.slice(second.start, second.end)).toBe("SQL");
  });

  it("tolerates whitespace drift in the model's quote", () => {
    const span = locateSpan("skills:\n  SQL and\n  Python", "SQL and Python");
    expect(span).not.toBeNull();
    expect(span!.text).toBe("SQL and\n  Python");
  });

  it("prefers a word-boundary match over one glued inside a larger word", () => {
    const s = "Experience with MySQL required. SQL modelling is core.";
    const span = locateSpan(s, "SQL")!;
    expect(span.start).toBe(32); // the standalone SQL, not the one inside MySQL
    expect(s.slice(span.start, span.end)).toBe("SQL");
  });

  it("still anchors inside a larger word when no standalone occurrence exists", () => {
    const s = "Experience with MySQL required.";
    const span = locateSpan(s, "SQL")!;
    expect(span.start).toBe(18); // totality beats nothing: inside "MySQL"
  });

  it("prefers boundaries on the whitespace-fallback path too", () => {
    const s = "uses MySQL and\nPython daily; SQL and\nPython too";
    const span = locateSpan(s, "SQL and Python")!;
    expect(span.start).toBe(29); // not the glued match starting inside "MySQL"
    expect(s.slice(span.start, span.end)).toBe("SQL and\nPython");
  });

  it("honors fromIndex on the whitespace-fallback path too", () => {
    // Quote has single spaces; both occurrences in the source have newlines,
    // so the exact-match path fails and the regex fallback must do the work.
    const s = "SQL and\nPython first, then SQL and\n\tPython again";
    const first = locateSpan(s, "SQL and Python")!;
    const second = locateSpan(s, "SQL and Python", first.end)!;
    expect(first.start).toBe(0);
    expect(second.start).toBeGreaterThan(first.end);
    expect(s.slice(second.start, second.end)).toBe(second.text);
  });

  it("returns null for absent or empty quotes", () => {
    expect(locateSpan(source, "Kubernetes")).toBeNull();
    expect(locateSpan(source, "   ")).toBeNull();
  });

  it("escapes regex metacharacters in quotes", () => {
    const s = "Comp (incl. bonus): $120k+";
    const span = locateSpan(s, "(incl. bonus): $120k+");
    expect(span).not.toBeNull();
    expect(s.slice(span!.start, span!.end)).toBe(span!.text);
  });
});
