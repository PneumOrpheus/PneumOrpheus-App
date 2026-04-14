"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl tracking-tight">{t.auth.signUp}</CardTitle>
        <CardDescription>
          {t.auth.haveAccount}
          <Link href="/sign-in" className={cn(buttonVariants({ variant: "link" }), "ml-1 h-auto p-0 font-medium text-second")}>
            {t.auth.signIn}
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

            if (!fullName.trim() || !email.trim() || !password.trim()) {
              setError(t.auth.signUpRequiredError);
              return;
            }

            if (password.trim().length < 6) {
              setError(t.auth.passwordLengthError);
              return;
            }

            setIsSubmitting(true);
            const redirectUrl = `${window.location.origin}/auth/callback`;
            const { error: signUpError, data } = await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: {
                emailRedirectTo: redirectUrl,
                data: {
                  full_name: fullName.trim(),
                  name: fullName.trim(),
                },
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

            setSuccess(t.auth.signUpSuccess);
            setIsSubmitting(false);
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="signup-name">{t.auth.name}</Label>
            <Input
              id="signup-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder={t.auth.namePlaceholder}
              className="h-10"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="signup-email">{t.auth.email}</Label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t.auth.emailPlaceholder}
              className="h-10"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="signup-password">{t.auth.password}</Label>
            <Input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t.auth.createPassword}
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
            {isSubmitting ? t.auth.signingUp : t.auth.signUp}
          </Button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          {t.auth.signUpFooter}
        </p>
      </CardContent>
    </Card>
  );
}
