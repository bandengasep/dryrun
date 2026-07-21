// Sandboxed challenge harness: execute a compiled SQL challenge (setup DDL +
// seed, reference solution, tests) in an ephemeral in-memory SQLite instance
// and reject any challenge whose own tests fail — execution is ground truth.
//
// This module is deliberately Node-only (native better-sqlite3) and is NOT
// exported from the package barrel: consumers import "@dryrun/core/harness".
// It is excluded from the isomorphic src typecheck program for the same
// reason. Sandbox honesty: inputs at this stage are self-compiled challenge
// specs, not candidate-submitted SQL — candidate execution (mock mode) needs
// real hardening first (see docs/post-hackathon-ideas.md).
import Database from "better-sqlite3";
import type {
  ChallengeRunResult,
  ChallengeSpec,
  ChallengeTestFailure,
  SqlValue,
} from "../schemas";

/** Raised for structurally invalid specs (not for failing tests). */
export class HarnessError extends Error {}

type Row = Record<string, SqlValue>;

/** Key-stable serialization so {a,b} and {b,a} compare equal. */
function stableStringify(row: Row): string {
  const sorted: Row = {};
  for (const key of Object.keys(row).sort()) sorted[key] = row[key];
  return JSON.stringify(sorted);
}

function rowsMatch(actual: Row[], expected: Row[], ordered: boolean): boolean {
  if (actual.length !== expected.length) return false;
  const a = actual.map(stableStringify);
  const e = expected.map(stableStringify);
  if (!ordered) {
    a.sort();
    e.sort();
  }
  return a.every((row, i) => row === e[i]);
}

export function runChallenge(spec: ChallengeSpec): ChallengeRunResult {
  if (!spec.tests.some((t) => t.sql === spec.referenceSql)) {
    throw new HarnessError(
      `Challenge ${spec.id}: no test exercises referenceSql — an unverified reference solution cannot ship`,
    );
  }

  const failures: ChallengeTestFailure[] = [];
  const db = new Database(":memory:");
  try {
    try {
      db.exec(spec.setupSql);
    } catch (e) {
      return {
        challengeId: spec.id,
        passed: false,
        failures: [
          {
            test: "__setup__",
            reason: e instanceof Error ? e.message : String(e),
            expected: null,
            actual: null,
          },
        ],
      };
    }

    for (const test of spec.tests) {
      try {
        const actual = db.prepare(test.sql).all() as Row[];
        if (!rowsMatch(actual, test.expectedRows, test.ordered)) {
          failures.push({
            test: test.name,
            reason: "rows do not match expectation",
            expected: test.expectedRows,
            actual,
          });
        }
      } catch (e) {
        failures.push({
          test: test.name,
          reason: e instanceof Error ? e.message : String(e),
          expected: test.expectedRows,
          actual: null,
        });
      }
    }
  } finally {
    db.close();
  }

  return { challengeId: spec.id, passed: failures.length === 0, failures };
}
