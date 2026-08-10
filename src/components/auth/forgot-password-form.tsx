"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  FORGOT_PASSWORD_SUCCESS_MESSAGE,
  validatePasswordResetEmail,
} from "@/lib/password-reset";
import { Button, ButtonLink } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const validationError = validatePasswordResetEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setPending(true);
    setError(null);
    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      // The public response is intentionally identical for every valid email.
    }
    setPending(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mt-8 space-y-5">
        <div role="status" aria-live="polite" className="border-l-4 border-emerald-600 bg-emerald-50 px-5 py-4 text-sm font-semibold leading-6 text-emerald-950">
          {FORGOT_PASSWORD_SUCCESS_MESSAGE}
        </div>
        <p className="text-sm leading-6 text-slate-600">Check your inbox and spam folder. The link expires after one hour.</p>
        <ButtonLink href="/sign-in" className="w-full" size="lg">Return to sign in</ButtonLink>
        <button type="button" onClick={() => setSent(false)} className="w-full text-sm font-bold text-emerald-700 hover:text-emerald-900">
          Send instructions again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
      <div>
        <label htmlFor="reset-email" className="text-sm font-semibold text-slate-800">Email address</label>
        <input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="you@example.com"
          className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-slate-950 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </div>
      <div aria-live="polite" aria-atomic="true">
        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p> : null}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending instructions…" : "Send reset instructions"}
      </Button>
      <p className="text-center text-sm text-slate-600">
        Remembered your password?{" "}
        <Link href="/sign-in" className="font-bold text-emerald-700 hover:text-emerald-900">Sign in</Link>
      </p>
    </form>
  );
}
