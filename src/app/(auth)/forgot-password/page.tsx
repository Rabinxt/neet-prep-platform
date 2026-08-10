import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request secure password-reset instructions for your NEET Prep account.",
};

export default function ForgotPasswordPage() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Account recovery</p>
      <h1 className="mt-3 text-4xl font-bold tracking-[-0.045em] text-slate-950">Reset your password securely</h1>
      <p className="mt-3 leading-7 text-slate-600">Enter your account email. We will send a one-time link if the account exists.</p>
      <ForgotPasswordForm />
    </div>
  );
}
