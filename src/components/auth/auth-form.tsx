"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { safeCallbackUrl } from "@/lib/auth-navigation";
import { claimCurrentAnonymousAttempts } from "@/server/auth/actions";
import { Button } from "@/components/ui/button";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  callbackUrl?: string;
};

export function AuthForm({ mode, callbackUrl }: AuthFormProps) {
  const router = useRouter();
  const destination = safeCallbackUrl(callbackUrl);
  const signingUp = mode === "sign-up";
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    const confirmation = String(form.get("confirmPassword") ?? "");

    if (signingUp && (name.length < 2 || name.length > 80)) {
      setError("Enter a name between 2 and 80 characters.");
      setPending(false);
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setError("Password must be between 8 and 128 characters.");
      setPending(false);
      return;
    }
    if (signingUp && password !== confirmation) {
      setError("The passwords do not match.");
      setPending(false);
      return;
    }

    const result = signingUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password });

    if (result.error) {
      setError(signingUp
        ? "We could not create that account. The email may already be in use."
        : "Email or password is incorrect.");
      setPending(false);
      return;
    }

    try {
      await claimCurrentAnonymousAttempts();
    } catch {
      // The session hook also performs this idempotent claim.
    }
    router.push(destination);
    router.refresh();
  }

  const alternateHref = `${signingUp ? "/sign-in" : "/sign-up"}?callbackUrl=${encodeURIComponent(destination)}`;

  return (
    <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
      {signingUp ? (
        <Field label="Full name" name="name" type="text" autoComplete="name" placeholder="Your name" />
      ) : null}
      <Field label="Email address" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
      <div>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="password" className="text-sm font-semibold text-slate-800">Password</label>
          <span className="flex items-center gap-3">
            {!signingUp ? <Link href="/forgot-password" className="text-xs font-bold text-emerald-700 hover:text-emerald-900">Forgot password?</Link> : null}
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
              aria-pressed={showPassword}
            >
              {showPassword ? "Hide" : "Show"} password
            </button>
          </span>
        </div>
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete={signingUp ? "new-password" : "current-password"}
          required
          minLength={8}
          maxLength={128}
          className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-slate-950 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          placeholder="At least 8 characters"
        />
      </div>
      {signingUp ? (
        <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Repeat your password" minLength={8} />
      ) : null}

      <div aria-live="polite" aria-atomic="true">
        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p> : null}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (signingUp ? "Creating your account…" : "Signing you in…") : (signingUp ? "Create student account" : "Sign in")}
      </Button>

      <p className="text-center text-sm text-slate-600">
        {signingUp ? "Already have an account?" : "New to NEET Prep?"}{" "}
        <Link href={alternateHref} className="font-bold text-emerald-700 hover:text-emerald-900">
          {signingUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  ...inputProps
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-semibold text-slate-800">{label}</label>
      <input
        id={name}
        name={name}
        required
        {...inputProps}
        className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-slate-950 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
      />
    </div>
  );
}
