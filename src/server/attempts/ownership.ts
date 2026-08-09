import { getCurrentUser } from "@/server/auth/session";
import {
  getAnonymousSessionId,
  getOrCreateAnonymousSessionId,
} from "@/server/attempts/anonymous-session";
import type { AttemptOwner } from "@/server/attempts/owner";

export async function getCurrentAttemptOwner(options: { createAnonymous: boolean }) {
  const user = await getCurrentUser();
  if (user) return { kind: "user", userId: user.id } satisfies AttemptOwner;

  const anonymousSessionId = options.createAnonymous
    ? await getOrCreateAnonymousSessionId()
    : await getAnonymousSessionId();
  return anonymousSessionId
    ? { kind: "anonymous", anonymousSessionId } satisfies AttemptOwner
    : null;
}

export { getAnonymousSessionId, getOrCreateAnonymousSessionId } from "@/server/attempts/anonymous-session";
export { attemptOwnerData, attemptOwnerWhere, type AttemptOwner } from "@/server/attempts/owner";
