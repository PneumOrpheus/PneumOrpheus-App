"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl tracking-tight">Sign up</CardTitle>
        <CardDescription>
          Already have an account?
          <Link href="/sign-in" className={cn(buttonVariants({ variant: "link" }), "ml-1 h-auto p-0 font-medium text-second")}>
            Sign in
          </Link>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          className="grid gap-5"
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
          <div className="grid gap-1.5">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-10"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a password"
              className="h-10"
              required
            />
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-md border border-second/30 bg-second/10 px-3 py-2 text-sm text-second">
              {success}
            </p>
          ) : null}

          <Button type="submit" disabled={isSubmitting} className="h-10 bg-brand text-white hover:bg-third">
            {isSubmitting ? "Signing up..." : "Sign up"}
          </Button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          Register a clinician account to upload studies and review AI-assisted pulmonary reports.
        </p>
      </CardContent>
    </Card>
  );
}
