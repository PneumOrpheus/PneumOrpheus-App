"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Sign up</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?
        <Link href="/sign-in" className="ml-1 text-sm font-medium text-second hover:underline">
          Sign in
        </Link>
      </p>

      <form
        className="mt-8 grid gap-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setSuccess("");

          if (!email.trim() || !password.trim()) {
            setError("Email and password are required.");
            return;
          }

          if (password.trim().length < 6) {
            setError("Password must be at least 6 characters.");
            return;
          }

          setIsSubmitting(true);
          const redirectUrl = `${window.location.origin}/auth/callback`;
          const { error: signUpError, data } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: redirectUrl,
            },
          });

          if (signUpError) {
            setError(signUpError.message);
            setIsSubmitting(false);
            return;
          }

          if (data.session) {
            router.refresh();
            router.push("/");
            return;
          }

          setSuccess("Thanks for signing up! Check your email to verify your account.");
          setIsSubmitting(false);
        }}
      >
        <label className="grid gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="h-10 rounded-md border border-sixth bg-white px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
            required
          />
        </label>

        <label className="grid gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
          Password
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create a password"
            className="h-10 rounded-md border border-sixth bg-white px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100"
            required
          />
        </label>

        {error ? (
          <p className="rounded-md border border-fifth/40 bg-fifth/10 px-3 py-2 text-sm text-fifth">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="rounded-md border border-second/30 bg-second/10 px-3 py-2 text-sm text-second">
            {success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-white transition hover:bg-third disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Signing up..." : "Sign up"}
        </button>
      </form>

      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
        Register a clinician account to upload studies and review AI-assisted pulmonary reports.
      </p>
    </div>
  );
}
