import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { safeCallbackUrl } from "@/lib/auth-navigation";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your NEET Prep student account.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const callbackUrl = safeCallbackUrl((await searchParams).callbackUrl);
  if (await getCurrentUser()) redirect(callbackUrl);
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Welcome back</p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-0.045em] text-slate-950">Continue your preparation</h1>
      <p className="mt-3 leading-7 text-slate-600">Sign in to keep your practice and mock-test attempts attached to your account.</p>
      <AuthForm mode="sign-in" callbackUrl={callbackUrl} />
    </div>
  );
}
