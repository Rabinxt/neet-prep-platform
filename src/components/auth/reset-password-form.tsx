"use client";

import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { validateNewPassword } from "@/lib/password-reset";
import { Button, ButtonLink } from "@/components/ui/button";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invalidToken, setInvalidToken] = useState(!token);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmPassword") ?? "");
    const validationError = validateNewPassword(password, confirmation);
    if (validationError) {
      setError(validationError);
      return;
    }

    setPending(true);
    setError(null);
    const result = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (result.error) {
      window.history.replaceState(null, "", "/reset-password?error=INVALID_TOKEN");
      setInvalidToken(true);
      return;
    }
    window.history.replaceState(null, "", "/reset-password?status=success");
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="mt-8 space-y-5">
        <div role="status" className="border-l-4 border-emerald-600 bg-emerald-50 px-5 py-4">
          <p className="font-bold text-emerald-950">Your password has been reset.</p>
          <p className="mt-1 text-sm leading-6 text-emerald-900">For your security, existing sessions have been signed out.</p>
        </div>
        <ButtonLink href="/sign-in" size="lg" className="w-full">Sign in with your new password</ButtonLink>
      </div>
    );
  }

  if (invalidToken) {
    return (
      <div className="mt-8 space-y-5">
        <div role="alert" className="border-l-4 border-amber-500 bg-amber-50 px-5 py-4">
          <p className="font-bold text-amber-950">This reset link is invalid or has expired.</p>
          <p className="mt-1 text-sm leading-6 text-amber-900">Request a new link to continue securely.</p>
        </div>
        <ButtonLink href="/forgot-password" size="lg" className="w-full">Request a new reset link</ButtonLink>
        <ButtonLink href="/sign-in" variant="ghost" className="w-full">Return to sign in</ButtonLink>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
      <div>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="new-password" className="text-sm font-semibold text-slate-800">New password</label>
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-pressed={showPassword} className="text-xs font-bold text-emerald-700 hover:text-emerald-900">
            {showPassword ? "Hide" : "Show"} passwords
          </button>
        </div>
        <input id="new-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} placeholder="8–128 characters" className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-slate-950 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" />
      </div>
      <div>
        <label htmlFor="confirm-new-password" className="text-sm font-semibold text-slate-800">Confirm new password</label>
        <input id="confirm-new-password" name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Repeat your new password" className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-slate-950 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" />
      </div>
      <div aria-live="polite" aria-atomic="true">
        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p> : null}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Resetting password…" : "Reset password"}
      </Button>
    </form>
  );
}
