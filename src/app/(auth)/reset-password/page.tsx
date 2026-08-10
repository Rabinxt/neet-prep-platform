import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { safeResetToken } from "@/lib/password-reset";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your NEET Prep account.",
};

const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const token = safeResetToken(one(query.token), one(query.error));
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Secure recovery</p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-0.045em] text-slate-950">Choose a new password</h1>
      <p className="mt-3 leading-7 text-slate-600">Use a unique password between 8 and 128 characters that you do not use elsewhere.</p>
      <ResetPasswordForm token={token} />
    </div>
  );
}
