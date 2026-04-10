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

export default function SignInPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl tracking-tight">Sign in</CardTitle>
        <CardDescription>
          Don&apos;t have an account?
          <Link href="/sign-up" className={cn(buttonVariants({ variant: "link" }), "ml-1 h-auto p-0 font-medium text-second")}>
            Sign up
          </Link>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          className="grid gap-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");

            if (!email.trim() || !password.trim()) {
              setError("Email and password are required.");
              return;
            }

            setIsSubmitting(true);
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            });

            if (signInError) {
              setError(signInError.message);
              setIsSubmitting(false);
              return;
            }

            router.refresh();
            router.push("/");
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="signin-email">Email</Label>
            <Input
              id="signin-email"
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
            <Label htmlFor="signin-password">Password</Label>
            <Input
              id="signin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              className="h-10"
              required
            />
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={isSubmitting} className="h-10 bg-brand text-white hover:bg-third">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          Access PneumOrpheus diagnostic workflows and historical reports.
        </p>
      </CardContent>
    </Card>
  );
}
