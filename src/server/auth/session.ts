import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth, type AuthSession } from "@/server/auth/config";

export async function getCurrentSession(): Promise<AuthSession | null> {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  return (await getCurrentSession())?.user ?? null;
}

export async function requireUser(callbackUrl = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") notFound();
  return user;
}
