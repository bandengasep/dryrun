import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

// Load repo-root .env (OPENAI_API_KEY) for the live smoke suite.
// CI has no .env — the live suite then self-skips.
const envPath = resolve(import.meta.dirname, "../../../.env");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}
