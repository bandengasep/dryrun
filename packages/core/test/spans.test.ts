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
