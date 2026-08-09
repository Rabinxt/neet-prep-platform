import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { safeCallbackUrl } from "@/lib/auth-navigation";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a secure NEET Prep student account.",
};

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const callbackUrl = safeCallbackUrl((await searchParams).callbackUrl);
  if (await getCurrentUser()) redirect(callbackUrl);
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Student account</p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-0.045em] text-slate-950">Build progress that stays with you</h1>
      <p className="mt-3 leading-7 text-slate-600">Create your account and any practice completed in this browser will be linked securely.</p>
      <AuthForm mode="sign-up" callbackUrl={callbackUrl} />
      <p className="mt-6 text-center text-xs leading-5 text-slate-500">By creating an account, you agree to use NEET Prep responsibly. Never reuse a password from another service.</p>
    </div>
  );
}
