import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { auth } from "../src/server/auth/config";
import { claimAnonymousAttemptsForUser } from "../src/server/attempts/claim";
import { createPersistentAttempt, loadOwnedAttempt } from "../src/server/attempts/service";
import { ANONYMOUS_ATTEMPT_COOKIE } from "../src/server/attempts/anonymous-session";
import { getPrisma } from "../src/server/db/client";
import { safeCallbackUrl } from "../src/lib/auth-navigation";

const prisma = getPrisma();
const origin = process.env.BETTER_AUTH_URL!;
const password = `Test-${randomUUID()}-Aa1!`;
const suffix = randomUUID();
const emails = {
  a: `phase6-a-${suffix}@example.test`,
  b: `phase6-b-${suffix}@example.test`,
  signupClaim: `phase6-claim-${suffix}@example.test`,
};
const userIds: string[] = [];
const anonymousSessionIds: string[] = [];
const attemptIds: string[] = [];

function anonymousBrowser() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    cookie: `${ANONYMOUS_ATTEMPT_COOKIE}=${token}`,
    tokenHash: createHash("sha256").update(token).digest("hex"),
  };
}

function rawResponseCookies(response: Response) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  return headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];
}

function responseCookies(response: Response) {
  return rawResponseCookies(response)
    .map((value) => value.match(/^([^=;,]+)=([^;,]*)/)?.slice(1, 3))
    .filter((value): value is [string, string] => Boolean(value))
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function authRequest(path: string, input: {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
  cookie?: string;
}) {
  const request = new Request(new URL(`/api/auth${path}`, origin), {
    method: input.method ?? "POST",
    headers: {
      origin,
      "content-type": "application/json",
      ...(input.cookie ? { cookie: input.cookie } : {}),
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
  });
  return auth.handler(request);
}

async function createAnonymousOwner() {
  const browser = anonymousBrowser();
  const session = await prisma.anonymousSession.create({ data: { tokenHash: browser.tokenHash } });
  anonymousSessionIds.push(session.id);
  return {
    browser,
    owner: { kind: "anonymous" as const, anonymousSessionId: session.id },
  };
}

try {
  assert.equal(safeCallbackUrl("https://example.com/steal"), "/dashboard");
  assert.equal(safeCallbackUrl("//example.com/steal"), "/dashboard");
  assert.equal(safeCallbackUrl("/%5C%5Cexample.com/steal"), "/dashboard");
  assert.equal(safeCallbackUrl("/practice?difficulty=HARD"), "/practice?difficulty=HARD");

  const questions = await prisma.question.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "asc" },
    take: 2,
    select: { id: true },
  });
  assert.equal(questions.length, 2, "At least two published questions are required.");

  const registerA = await authRequest("/sign-up/email", {
    body: { name: "Phase Six Student A", email: emails.a, password, role: "ADMIN" },
  });
  assert.equal(registerA.status, 200, "User registration failed.");
  const userA = await prisma.user.findUniqueOrThrow({ where: { email: emails.a } });
  userIds.push(userA.id);
  assert.equal(userA.role, "STUDENT", "Registration accepted a client-supplied ADMIN role.");

  const invalidLogin = await authRequest("/sign-in/email", {
    body: { email: emails.a, password: `${password}-wrong` },
  });
  assert(invalidLogin.status >= 400, "Invalid credentials did not fail safely.");

  const registrationCookie = responseCookies(registerA);
  assert(registrationCookie, "Registration did not create a session cookie.");
  const sessionCookieHeader = rawResponseCookies(registerA).find((value) => value.includes("session_token")) ?? "";
  assert.match(sessionCookieHeader, /HttpOnly/i, "The auth session cookie was not HttpOnly.");
  assert.match(sessionCookieHeader, /SameSite=Lax/i, "The auth session cookie was not SameSite=Lax.");
  if (origin.startsWith("https://")) {
    assert.match(sessionCookieHeader, /Secure/i, "The HTTPS auth session cookie was not Secure.");
  }
  const sessionResponse = await authRequest("/get-session", { method: "GET", cookie: registrationCookie });
  assert.equal(sessionResponse.status, 200, "Current session retrieval failed.");
  const sessionData = await sessionResponse.json() as { user?: { id?: string } } | null;
  assert.equal(sessionData?.user?.id, userA.id, "The authenticated session belongs to the wrong user.");

  const signOut = await authRequest("/sign-out", { cookie: registrationCookie });
  assert.equal(signOut.status, 200, "Sign out failed.");
  const signedOutSession = await authRequest("/get-session", { method: "GET", cookie: responseCookies(signOut) });
  assert.equal(await signedOutSession.json(), null, "Session remained active after sign out.");

  const anonymousA = await createAnonymousOwner();
  const anonymousPractice = await createPersistentAttempt({
    owner: anonymousA.owner,
    type: "PRACTICE",
    name: "Anonymous practice ownership test",
    questionIds: [questions[0].id],
    configuration: { test: true },
  });
  const anonymousExam = await createPersistentAttempt({
    owner: anonymousA.owner,
    type: "MOCK_EXAM",
    name: "Anonymous exam ownership test",
    questionIds: questions.map((question) => question.id),
    configuration: { test: true },
    durationSeconds: 300,
  });
  attemptIds.push(anonymousPractice.id, anonymousExam.id);
  assert(await loadOwnedAttempt(anonymousA.owner, anonymousPractice.id), "Anonymous practice was not readable by its browser.");
  assert(await loadOwnedAttempt(anonymousA.owner, anonymousExam.id), "Anonymous exam was not readable by its browser.");

  const signInA = await authRequest("/sign-in/email", {
    cookie: anonymousA.browser.cookie,
    body: { email: emails.a, password },
  });
  assert.equal(signInA.status, 200, "Valid sign in failed.");
  const accountAOwner = { kind: "user" as const, userId: userA.id };
  const claimed = await prisma.attempt.findMany({
    where: { id: { in: [anonymousPractice.id, anonymousExam.id] } },
    select: { userId: true, anonymousSessionId: true },
  });
  assert.equal(claimed.length, 2);
  assert(claimed.every((attempt) => attempt.userId === userA.id && attempt.anonymousSessionId === null), "Sign in did not safely claim anonymous attempts.");
  assert.equal(await loadOwnedAttempt(anonymousA.owner, anonymousPractice.id), null, "Anonymous access survived an account claim.");
  assert(await loadOwnedAttempt(accountAOwner, anonymousPractice.id), "The account could not read its claimed attempt.");

  const repeatedClaim = await claimAnonymousAttemptsForUser({
    userId: userA.id,
    requestHeaders: new Headers({ cookie: anonymousA.browser.cookie }),
  });
  assert.equal(repeatedClaim, 0, "A repeated claim was not idempotent.");

  const anonymousB = await createAnonymousOwner();
  assert.equal(await loadOwnedAttempt(anonymousB.owner, anonymousPractice.id), null, "Another anonymous browser could read a claimed attempt.");

  const registerB = await authRequest("/sign-up/email", {
    body: { name: "Phase Six Student B", email: emails.b, password, role: "ADMIN" },
  });
  assert.equal(registerB.status, 200, "Second user registration failed.");
  const userB = await prisma.user.findUniqueOrThrow({ where: { email: emails.b } });
  userIds.push(userB.id);
  assert.equal(userB.role, "STUDENT", "A second registration self-assigned ADMIN.");
  const accountBOwner = { kind: "user" as const, userId: userB.id };
  const userBAttempt = await createPersistentAttempt({
    owner: accountBOwner,
    type: "PRACTICE",
    name: "User B ownership test",
    questionIds: [questions[1].id],
    configuration: { test: true },
  });
  attemptIds.push(userBAttempt.id);
  assert.equal(await loadOwnedAttempt(accountAOwner, userBAttempt.id), null, "User A could read User B's attempt.");
  assert.equal(await loadOwnedAttempt(accountBOwner, anonymousPractice.id), null, "User B could read User A's attempt.");
  assert.equal(await loadOwnedAttempt(anonymousB.owner, userBAttempt.id), null, "An anonymous browser could read an authenticated attempt.");

  const signedInAttempt = await createPersistentAttempt({
    owner: accountAOwner,
    type: "MOCK_EXAM",
    name: "Authenticated ownership test",
    questionIds: questions.map((question) => question.id),
    configuration: { test: true },
    durationSeconds: 300,
  });
  attemptIds.push(signedInAttempt.id);
  const signedInRow = await prisma.attempt.findUniqueOrThrow({ where: { id: signedInAttempt.id } });
  assert.equal(signedInRow.userId, userA.id, "A signed-in attempt was not owned by userId.");
  assert.equal(signedInRow.anonymousSessionId, null, "A signed-in attempt was unnecessarily anonymous-owned.");

  const userACookie = responseCookies(signInA);
  const logOutA = await authRequest("/sign-out", { cookie: userACookie });
  assert.equal(logOutA.status, 200);
  assert.equal(await prisma.attempt.count({ where: { id: signedInAttempt.id, userId: userA.id } }), 1, "Logout deleted an account attempt.");
  assert.equal(await loadOwnedAttempt(anonymousA.owner, signedInAttempt.id), null, "Logout exposed account history to the anonymous browser.");
  assert.equal(await loadOwnedAttempt(accountAOwner, "not-a-real-attempt-id"), null, "An invalid attempt ID leaked data.");

  const signupClaimBrowser = await createAnonymousOwner();
  const preSignupAttempt = await createPersistentAttempt({
    owner: signupClaimBrowser.owner,
    type: "PRACTICE",
    name: "Sign-up claim test",
    questionIds: [questions[0].id],
    configuration: { test: true },
  });
  attemptIds.push(preSignupAttempt.id);
  const registerClaim = await authRequest("/sign-up/email", {
    cookie: signupClaimBrowser.browser.cookie,
    body: { name: "Phase Six Claim Student", email: emails.signupClaim, password },
  });
  assert.equal(registerClaim.status, 200, "Registration from an anonymous browser failed.");
  const claimUser = await prisma.user.findUniqueOrThrow({ where: { email: emails.signupClaim } });
  userIds.push(claimUser.id);
  const signupClaimed = await prisma.attempt.findUniqueOrThrow({ where: { id: preSignupAttempt.id } });
  assert.equal(signupClaimed.userId, claimUser.id, "Sign up did not claim the browser's anonymous attempt.");
  assert.equal(signupClaimed.anonymousSessionId, null);

  console.info("Authentication and attempt ownership integration checks passed (17 scenarios).");
} finally {
  if (attemptIds.length > 0) await prisma.attempt.deleteMany({ where: { id: { in: attemptIds } } });
  if (userIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  if (anonymousSessionIds.length > 0) {
    await prisma.anonymousSession.deleteMany({ where: { id: { in: anonymousSessionIds } } });
  }
  await prisma.$disconnect();
}
