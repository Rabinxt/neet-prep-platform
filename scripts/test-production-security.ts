import assert from "node:assert/strict";
import nextConfig from "../next.config";
import { GET as healthCheck } from "../src/app/api/health/route";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";
import { safeCallbackUrl } from "../src/lib/auth-navigation";
import { parseAdminImportJson } from "../src/server/admin/import";
import { getAuthEnvironment } from "../src/server/auth/env";
import { getResendEmailEnvironment } from "../src/server/email/transactional";
import { checkQuestionAnswer } from "../src/server/questions/actions";

const originalEnvironment = {
  secret: process.env.BETTER_AUTH_SECRET,
  url: process.env.BETTER_AUTH_URL,
  nodeEnv: process.env.NODE_ENV,
  emailFrom: process.env.EMAIL_FROM,
  resendApiKey: process.env.RESEND_API_KEY,
};
const mutableEnvironment = process.env as Record<string, string | undefined>;

function restoreEnvironment() {
  if (originalEnvironment.secret === undefined) delete process.env.BETTER_AUTH_SECRET;
  else process.env.BETTER_AUTH_SECRET = originalEnvironment.secret;
  if (originalEnvironment.url === undefined) delete process.env.BETTER_AUTH_URL;
  else process.env.BETTER_AUTH_URL = originalEnvironment.url;
  if (originalEnvironment.nodeEnv === undefined) delete mutableEnvironment.NODE_ENV;
  else mutableEnvironment.NODE_ENV = originalEnvironment.nodeEnv;
  if (originalEnvironment.emailFrom === undefined) delete mutableEnvironment.EMAIL_FROM;
  else mutableEnvironment.EMAIL_FROM = originalEnvironment.emailFrom;
  if (originalEnvironment.resendApiKey === undefined) delete mutableEnvironment.RESEND_API_KEY;
  else mutableEnvironment.RESEND_API_KEY = originalEnvironment.resendApiKey;
}

try {
  delete mutableEnvironment["BETTER_AUTH_SECRET"];
  mutableEnvironment["BETTER_AUTH_URL"] = "https://example.test";
  assert.throws(() => getAuthEnvironment(), /BETTER_AUTH_SECRET is required/);

  mutableEnvironment["BETTER_AUTH_SECRET"] = "a".repeat(48);
  mutableEnvironment.NODE_ENV = "production";

  mutableEnvironment["BETTER_AUTH_URL"] = "http://example.test";
  assert.throws(() => getAuthEnvironment(), /HTTPS/);

  mutableEnvironment["BETTER_AUTH_URL"] = "https://example.test/path?unexpected=true";
  assert.throws(() => getAuthEnvironment(), /origin only/);

  mutableEnvironment["BETTER_AUTH_URL"] = "https://example.test";
  assert.deepEqual(getAuthEnvironment(), {
    secret: "a".repeat(48),
    baseURL: "https://example.test",
    useSecureCookies: true,
  });

  mutableEnvironment["BETTER_AUTH_URL"] = "http://localhost:3000";
  assert.equal(getAuthEnvironment().useSecureCookies, false, "Local production smoke tests must remain usable over HTTP.");

  mutableEnvironment["EMAIL_FROM"] = "NEET Prep <onboarding@resend.dev>";
  delete mutableEnvironment["RESEND_API_KEY"];
  assert.throws(() => getResendEmailEnvironment(), /RESEND_API_KEY is required/);
  mutableEnvironment["RESEND_API_KEY"] = "invalid-test-key";
  assert.throws(() => getResendEmailEnvironment(), /RESEND_API_KEY is invalid/);
  mutableEnvironment["RESEND_API_KEY"] = "re_test_key_1234";
  assert.equal(getResendEmailEnvironment().from, "NEET Prep <onboarding@resend.dev>");

  mutableEnvironment["BETTER_AUTH_SECRET"] = "short";
  assert.throws(() => getAuthEnvironment(), /at least 32/);

  assert.equal(safeCallbackUrl("https://attacker.test/steal"), "/dashboard");
  assert.equal(safeCallbackUrl("//attacker.test/steal"), "/dashboard");
  assert.equal(safeCallbackUrl("/%5c%5cattacker.test/steal"), "/dashboard");
  assert.equal(safeCallbackUrl("/practice?difficulty=HARD"), "/practice?difficulty=HARD");

  const oversizedImport = parseAdminImportJson("x".repeat(500_001));
  assert.equal(oversizedImport.bundle, null);
  assert.match(oversizedImport.errors[0], /limit/);
  assert.equal(parseAdminImportJson("{malformed").bundle, null);

  assert.equal((await checkQuestionAnswer(null as never)).status, "invalid");

  const configuredHeaders = await nextConfig.headers?.();
  const headers = new Map(configuredHeaders?.[0]?.headers.map(({ key, value }) => [key, value]));
  assert.match(headers.get("Content-Security-Policy") ?? "", /frame-ancestors 'none'/);
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headers.get("X-Frame-Options"), "DENY");

  const crawlerRules = robots();
  const rules = Array.isArray(crawlerRules.rules) ? crawlerRules.rules : [crawlerRules.rules];
  const disallowed = rules.flatMap((rule) => rule.disallow ?? []);
  assert(disallowed.includes("/admin/"));
  assert(disallowed.includes("/dashboard/"));
  assert(disallowed.includes("/practice/attempt/"));
  assert(disallowed.includes("/forgot-password"));
  assert(disallowed.includes("/reset-password"));

  const indexedUrls = sitemap().map((entry) => entry.url);
  assert(!indexedUrls.some((url) => /\/(?:admin|dashboard|sign-in|sign-up|forgot-password|reset-password)(?:\/|$)/.test(url)));

  const health = healthCheck();
  assert.deepEqual(await health.json(), { status: "ok" });
  assert.equal(health.headers.get("cache-control"), "no-store");

  console.info("Production security/configuration checks passed (environment, redirects, input bounds, headers, SEO, and health). ");
} finally {
  restoreEnvironment();
}
