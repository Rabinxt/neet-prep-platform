import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { auth } from "../src/server/auth/config";
import { getPrisma } from "../src/server/db/client";
import {
  setEmailTransportForTesting,
  type TransactionalEmail,
} from "../src/server/email/transactional";
import {
  FORGOT_PASSWORD_SUCCESS_MESSAGE,
  safeResetToken,
  validateNewPassword,
} from "../src/lib/password-reset";

const prisma = getPrisma();
const origin = process.env.BETTER_AUTH_URL!;
const suffix = randomUUID();
const emails = {
  student: `reset-student-${suffix}@example.test`,
  admin: `reset-admin-${suffix}@example.test`,
  missing: `reset-missing-${suffix}@example.test`,
};
const passwords = {
  studentOld: `Old-student-${suffix}-Aa1!`,
  studentNew: `New-student-${suffix}-Bb2!`,
  adminOld: `Old-admin-${suffix}-Aa1!`,
  adminNew: `New-admin-${suffix}-Bb2!`,
};
const capturedEmails: TransactionalEmail[] = [];
const userIds: string[] = [];
const capturedLogs: string[] = [];
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

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
  url?: string;
}) {
  return auth.handler(new Request(input.url ?? new URL(`/api/auth${path}`, origin), {
    method: input.method ?? "POST",
    headers: {
      origin,
      ...(input.body ? { "content-type": "application/json" } : {}),
      ...(input.cookie ? { cookie: input.cookie } : {}),
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
    redirect: "manual",
  }));
}

function resetLink(message: TransactionalEmail) {
  const match = message.text.match(/https?:\/\/\S+/);
  assert(match, "The reset email did not contain Better Auth's generated URL.");
  return match[0];
}

async function callbackToken(message: TransactionalEmail) {
  const callback = await authRequest("", { method: "GET", url: resetLink(message) });
  assert.equal(callback.status, 302, "The reset callback did not redirect.");
  const location = callback.headers.get("location");
  assert(location, "The reset callback omitted its safe redirect.");
  const redirected = new URL(location);
  assert.equal(redirected.origin, origin);
  assert.equal(redirected.pathname, "/reset-password");
  const token = safeResetToken(redirected.searchParams.get("token"), redirected.searchParams.get("error"));
  assert(token, "The valid callback did not provide a reset token.");
  return token;
}

async function signIn(email: string, password: string) {
  return authRequest("/sign-in/email", { body: { email, password } });
}

setEmailTransportForTesting({
  async send(message) {
    capturedEmails.push(message);
  },
});

for (const level of ["log", "info", "warn", "error"] as const) {
  console[level] = (...values: unknown[]) => {
    capturedLogs.push(values.map((value) => value instanceof Error ? value.message : String(value)).join(" "));
  };
}

try {
  assert.equal(validateNewPassword("short", "different"), "Password must be between 8 and 128 characters.");
  assert.equal(validateNewPassword("long-enough", "not-matching"), "The passwords do not match.");

  const registerStudent = await authRequest("/sign-up/email", {
    body: { name: "Reset Student", email: emails.student, password: passwords.studentOld },
  });
  assert.equal(registerStudent.status, 200);
  const student = await prisma.user.findUniqueOrThrow({ where: { email: emails.student } });
  userIds.push(student.id);
  const studentCookie = responseCookies(registerStudent);

  const existingRequest = await authRequest("/request-password-reset", {
    body: { email: emails.student, redirectTo: `${origin}/reset-password` },
  });
  const existingBody = await existingRequest.json();
  assert.equal(existingRequest.status, 200);
  assert.equal(capturedEmails.length, 1);
  assert.equal(capturedEmails[0].to, emails.student);
  assert.match(capturedEmails[0].subject, /Reset your NEET Prep password/);
  assert.match(capturedEmails[0].text, /expires in 1 hour/i);
  assert.match(capturedEmails[0].text, /ignore this email/i);

  const missingRequest = await authRequest("/request-password-reset", {
    body: { email: emails.missing, redirectTo: `${origin}/reset-password` },
  });
  const missingBody = await missingRequest.json();
  assert.equal(missingRequest.status, 200);
  assert.deepEqual(missingBody, existingBody, "Existing and missing accounts produced different public responses.");
  assert.equal(capturedEmails.length, 1, "A nonexistent account unexpectedly generated email.");
  assert.match(FORGOT_PASSWORD_SUCCESS_MESSAGE, /If an account exists/);

  const externalRedirect = await authRequest("/request-password-reset", {
    body: { email: emails.student, redirectTo: "https://attacker.example/reset" },
  });
  assert(externalRedirect.status >= 400, "An external password-reset redirect was accepted.");
  assert.equal(capturedEmails.length, 1);

  const studentToken = await callbackToken(capturedEmails[0]);
  const tooShort = await authRequest("/reset-password", {
    body: { token: studentToken, newPassword: "short" },
  });
  assert(tooShort.status >= 400, "A too-short password was accepted.");

  const resetStudent = await authRequest("/reset-password", {
    body: { token: studentToken, newPassword: passwords.studentNew },
  });
  assert.equal(resetStudent.status, 200, "A valid password reset failed.");
  const reused = await authRequest("/reset-password", {
    body: { token: studentToken, newPassword: `${passwords.studentNew}-again` },
  });
  assert(reused.status >= 400, "A reset token was reusable.");

  assert((await signIn(emails.student, passwords.studentOld)).status >= 400, "The old password still worked.");
  const studentNewSignIn = await signIn(emails.student, passwords.studentNew);
  assert.equal(studentNewSignIn.status, 200, "The new password did not work.");
  const revokedSession = await authRequest("/get-session", { method: "GET", cookie: studentCookie });
  assert.equal(await revokedSession.json(), null, "An existing session survived the password reset.");
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).role, "STUDENT");

  const invalidToken = await authRequest("/reset-password", {
    body: { token: "invalid-reset-token-123456", newPassword: passwords.studentNew },
  });
  assert(invalidToken.status >= 400, "An invalid reset token was accepted.");

  const expiredRequest = await authRequest("/request-password-reset", {
    body: { email: emails.student, redirectTo: `${origin}/reset-password` },
  });
  assert.equal(expiredRequest.status, 200);
  const expiredEmail = capturedEmails.at(-1)!;
  const rawExpiredToken = new URL(resetLink(expiredEmail)).pathname.split("/").at(-1)!;
  await prisma.verification.updateMany({
    where: { identifier: `reset-password:${rawExpiredToken}` },
    data: { expiresAt: new Date(Date.now() - 1_000) },
  });
  const expiredCallback = await authRequest("", { method: "GET", url: resetLink(expiredEmail) });
  assert.equal(expiredCallback.status, 302);
  const expiredLocation = new URL(expiredCallback.headers.get("location")!);
  assert.equal(expiredLocation.origin, origin);
  assert.equal(expiredLocation.pathname, "/reset-password");
  assert.equal(expiredLocation.searchParams.get("error"), "INVALID_TOKEN");

  const registerAdmin = await authRequest("/sign-up/email", {
    body: { name: "Reset Admin", email: emails.admin, password: passwords.adminOld },
  });
  assert.equal(registerAdmin.status, 200);
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: emails.admin } });
  userIds.push(admin.id);
  await prisma.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
  const adminCookie = responseCookies(registerAdmin);
  const adminRequest = await authRequest("/request-password-reset", {
    body: { email: emails.admin, redirectTo: `${origin}/reset-password` },
  });
  assert.equal(adminRequest.status, 200);
  const adminToken = await callbackToken(capturedEmails.at(-1)!);
  assert.equal((await authRequest("/reset-password", {
    body: { token: adminToken, newPassword: passwords.adminNew },
  })).status, 200);
  assert((await signIn(emails.admin, passwords.adminOld)).status >= 400);
  const adminSignIn = await signIn(emails.admin, passwords.adminNew);
  assert.equal(adminSignIn.status, 200);
  const adminSession = await authRequest("/get-session", { method: "GET", cookie: responseCookies(adminSignIn) });
  const adminSessionBody = await adminSession.json() as { user?: { role?: string } } | null;
  assert.equal(adminSessionBody?.user?.role, "ADMIN", "The ADMIN role changed after password reset.");
  assert.equal((await authRequest("/get-session", { method: "GET", cookie: adminCookie }).then((response) => response.json())), null);

  const sensitiveValues = [
    passwords.studentOld,
    passwords.studentNew,
    passwords.adminOld,
    passwords.adminNew,
    studentToken,
    adminToken,
    rawExpiredToken,
  ];
  assert(!capturedLogs.some((entry) => sensitiveValues.some((value) => entry.includes(value))), "A password or reset token reached application logs.");
} finally {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  setEmailTransportForTesting(null);
  if (userIds.length > 0) {
    await prisma.verification.deleteMany({ where: { value: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  capturedEmails.length = 0;
  await prisma.$disconnect();
}

console.info("Password-reset integration checks passed (enumeration, expiry, one-time tokens, sessions, roles, redirects, and logging). ");
