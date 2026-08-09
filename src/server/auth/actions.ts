"use server";

import { headers } from "next/headers";
import { getCurrentUser } from "@/server/auth/session";
import { claimAnonymousAttemptsForUser } from "@/server/attempts/claim";

export async function claimCurrentAnonymousAttempts() {
  const user = await getCurrentUser();
  if (!user) return { claimed: 0 };
  const claimed = await claimAnonymousAttemptsForUser({
    userId: user.id,
    requestHeaders: await headers(),
  });
  return { claimed };
}
