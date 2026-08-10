import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const findings = new Set<string>();
const allowedEnvironmentFile = ".env.example";
const placeholderMarkers = ["USER", "PASSWORD", "HOST", "DATABASE", "replace-with", "example"];
const privateKeyMarker = ["-----BEGIN", "PRIVATE KEY-----"].join(" ");

for (const file of files) {
  const normalized = file.replaceAll("\\", "/");
  const name = basename(normalized);
  const extension = extname(name).toLowerCase();

  if (name.startsWith(".env") && normalized !== allowedEnvironmentFile) findings.add(normalized);
  if ([".log", ".dump", ".backup", ".pem"].includes(extension)) findings.add(normalized);
  if (extension === ".sql" && !normalized.startsWith("prisma/migrations/")) findings.add(normalized);
  if (normalized.startsWith("playwright-report/") || normalized.startsWith("test-results/")) findings.add(normalized);

  let contents: string;
  try {
    contents = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  if (contents.includes(privateKeyMarker)) findings.add(normalized);
  for (const match of contents.matchAll(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi)) {
    if (!placeholderMarkers.some((marker) => match[0].includes(marker))) findings.add(normalized);
  }
  for (const match of contents.matchAll(/(?:DATABASE_URL|BETTER_AUTH_SECRET|API_KEY|ACCESS_TOKEN)\s*=\s*["']([^"'\r\n]+)["']/gi)) {
    if (!placeholderMarkers.some((marker) => match[1].includes(marker))) findings.add(normalized);
  }
}

assert.deepEqual([...findings], [], `Potential tracked secret or artifact in: ${[...findings].join(", ")}`);
console.info(`Repository hygiene scan passed (${files.length} tracked/candidate files checked; secret values were not printed).`);
