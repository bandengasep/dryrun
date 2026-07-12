// Sandboxed challenge harness. Commit 3: execute a compiled SQL challenge (schema +
// seed + reference solution + tests) in an ephemeral DuckDB (`@duckdb/node-api`) or
// SQLite (`better-sqlite3`) instance and reject any challenge whose own tests fail —
// execution is ground truth. Native deps are added at that commit, not at bootstrap.
export {};
