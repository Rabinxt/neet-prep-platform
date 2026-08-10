import "dotenv/config";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const clientRoot = join(process.cwd(), ".next", "static");
assert(existsSync(clientRoot), "Build output is missing. Run npm run build before this check.");

const sensitiveValues = [process.env.DATABASE_URL, process.env.BETTER_AUTH_SECRET]
  .map((value) => value?.trim())
  .filter((value): value is string => Boolean(value && value.length >= 12));
assert(sensitiveValues.length === 2, "DATABASE_URL and BETTER_AUTH_SECRET must be configured for the client-bundle scan.");

function filesWithin(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesWithin(path) : [path];
  });
}

const findings = filesWithin(clientRoot).filter((file) => {
  const contents = readFileSync(file);
  return sensitiveValues.some((value) => contents.includes(Buffer.from(value)));
});

assert.deepEqual(
  findings,
  [],
  `Configured server secret found in client asset(s): ${findings.map((file) => relative(process.cwd(), file)).join(", ")}`,
);
console.info("Client bundle secret scan passed (configured values were not printed). ");
