import { hasDatabaseUrl } from "@/server/db/env";
import { getPrisma } from "@/server/db/client";

export type DatabaseHealth =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "unreachable" };

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  if (!hasDatabaseUrl()) {
    return { ok: false, reason: "not_configured" };
  }

  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return { ok: true };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}
