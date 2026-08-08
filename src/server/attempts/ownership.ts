import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getPrisma } from "@/server/db/client";

const ANONYMOUS_COOKIE = "neet_anonymous_owner";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,64}$/;
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function readToken() {
  const token = (await cookies()).get(ANONYMOUS_COOKIE)?.value;
  return token && TOKEN_PATTERN.test(token) ? token : undefined;
}

export async function getAnonymousSessionId() {
  const token = await readToken();
  if (!token) return null;
  try {
    const session = await getPrisma().anonymousSession.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true },
    });
    return session?.id ?? null;
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

  (await cookies()).set(ANONYMOUS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });

  return session.id;
}
