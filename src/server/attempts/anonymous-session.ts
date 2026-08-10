import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getPrisma } from "@/server/db/client";
import { getAuthEnvironment } from "@/server/auth/env";

export const ANONYMOUS_ATTEMPT_COOKIE = "neet_anonymous_owner";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,64}$/;
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function validToken(token: string | undefined) {
  return token && TOKEN_PATTERN.test(token) ? token : undefined;
}

function tokenFromCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === ANONYMOUS_ATTEMPT_COOKIE) {
      return validToken(decodeURIComponent(rawValue.join("=")));
    }
  }
  return undefined;
}

async function findAnonymousSession(token: string | undefined) {
  if (!token) return null;
  const session = await getPrisma().anonymousSession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true },
  });
  return session?.id ?? null;
}

export async function getAnonymousSessionIdFromHeaders(headers: Headers) {
  return findAnonymousSession(tokenFromCookieHeader(headers.get("cookie")));
}

export async function getAnonymousSessionId() {
  const token = validToken((await cookies()).get(ANONYMOUS_ATTEMPT_COOKIE)?.value);
  try {
    return await findAnonymousSession(token);
  } catch {
    return null;
  }
}

export async function getOrCreateAnonymousSessionId() {
  const existingId = await getAnonymousSessionId();
  if (existingId) {
    await getPrisma().anonymousSession.update({
      where: { id: existingId },
      data: { lastSeenAt: new Date() },
    });
    return existingId;
  }

  const token = randomBytes(32).toString("base64url");
  const session = await getPrisma().anonymousSession.create({
    data: { tokenHash: hashToken(token) },
    select: { id: true },
  });

  (await cookies()).set(ANONYMOUS_ATTEMPT_COOKIE, token, {
    httpOnly: true,
    secure: getAuthEnvironment().useSecureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });

  return session.id;
}
