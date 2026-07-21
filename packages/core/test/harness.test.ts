import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runChallenge, HarnessError } from "../src/harness";
import { ChallengeSpec, ChallengeRunResult } from "../src/schemas";

const fixtureSpec = (): ChallengeSpec =>
  ChallengeSpec.parse(
    JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "fixtures", "challenge-01.json"),
        "utf8",
      ),
    ),
  );

describe("runChallenge — execution is ground truth", () => {
  it("passes the hand-built retention challenge (fixture executability gate)", () => {
    const result = runChallenge(fixtureSpec());
    ChallengeRunResult.parse(result);
    expect(result.passed).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it("rejects a challenge whose reference output does not match its expectation", () => {
    const spec = fixtureSpec();
    spec.tests[0].expectedRows = [{ week: 1, active_users: 99 }];
    const result = runChallenge(spec);
    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].test).toBe(spec.tests[0].name);
    expect(result.failures[0].expected).toEqual(spec.tests[0].expectedRows);
    expect(result.failures[0].actual).toEqual([
      { week: 1, active_users: 3 },
      { week: 2, active_users: 2 },
    ]);
  });

  it("reports a SQL error as a failure with the engine's reason, never throwing", () => {
    const spec = fixtureSpec();
    spec.tests.push({
      name: "broken probe",
      sql: "SELECT nope FROM not_a_table;",
      expectedRows: [],
      ordered: false,
    });
    const result = runChallenge(spec);
    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].reason).toMatch(/no such table/i);
    expect(result.failures[0].actual).toBeNull();
  });

  it("reports a broken setup script as a __setup__ failure", () => {
    const spec = fixtureSpec();
    spec.setupSql = "CREATE TABLE events (;";
    const result = runChallenge(spec);
    expect(result.passed).toBe(false);
    expect(result.failures[0].test).toBe("__setup__");
  });

  it("throws HarnessError when no test exercises the reference solution", () => {
    const spec = fixtureSpec();
    spec.tests = [spec.tests[1]]; // only the seed-sanity probe remains
    expect(() => runChallenge(spec)).toThrow(HarnessError);
  });

  it("unordered tests accept permuted rows; ordered tests reject them", () => {
    const spec = fixtureSpec();
    const permuted = [
      { week: 2, active_users: 2 },
      { week: 1, active_users: 3 },
    ];
    spec.tests[0].expectedRows = permuted;
    expect(runChallenge(spec).passed).toBe(false); // ordered: true → mismatch

    spec.tests[0].ordered = false;
    expect(runChallenge(spec).passed).toBe(true); // unordered → same set
  });

  it("runs are isolated — each challenge gets a fresh in-memory database", () => {
    const spec = fixtureSpec();
    // CREATE TABLE without IF NOT EXISTS would fail on a shared connection.
    expect(runChallenge(spec).passed).toBe(true);
    expect(runChallenge(spec).passed).toBe(true);
  });
});

describe("ChallengeSpec — contract", () => {
  it("rejects a spec with zero tests", () => {
    const raw = { ...fixtureSpec(), tests: [] };
    expect(() => ChallengeSpec.parse(raw)).toThrow();
  });
});
