import { getPrisma } from "@/server/db/client";
import { getAnonymousSessionIdFromHeaders } from "@/server/attempts/anonymous-session";

export async function claimAnonymousAttemptsForUser(input: {
  userId: string;
  requestHeaders: Headers;
}) {
  const anonymousSessionId = await getAnonymousSessionIdFromHeaders(input.requestHeaders);
  if (!anonymousSessionId) return 0;

  const result = await getPrisma().$transaction(async (tx) => tx.attempt.updateMany({
    where: {
      anonymousSessionId,
      userId: null,
    },
    data: {
      userId: input.userId,
      anonymousSessionId: null,
    },
  }));

  return result.count;
}
