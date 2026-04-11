import AuthFloatingLogo from "@/components/auth-floating-logo";
import AuthTwoLineTypewriter from "@/components/auth-two-line-typewriter";
import { getServerI18n } from "@/lib/server-i18n";
import { Prompt } from "next/font/google";

const prompt = Prompt({
  subsets: ["latin"],
  weight: ["500", "600"],
});

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getServerI18n();

  return (
    <section className="grid min-h-[calc(100vh-11rem)] overflow-hidden rounded-2xl border border-brand/20 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-brand via-third to-fifth p-10 text-white lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(77,255,246,0.22),transparent_40%)]" />
        <div className="relative z-10 flex min-h-[220px] flex-col items-center justify-center gap-4">
          <AuthFloatingLogo />
          <p
            className={`${prompt.className} text-5xl tracking-wide text-white/95`}
            aria-label="PneumOrpheus"
          >
            PneumOrpheus
          </p>
        </div>

        <div className="relative z-10 max-w-md space-y-3">
          <AuthTwoLineTypewriter
            line1={t.auth.heroLine1}
            line2={t.auth.heroLine2}
            className="text-2xl font-medium text-white/95"
          />
          <blockquote className="text-sm text-white/90">
            {t.auth.quote}
          </blockquote>
        </div>
      </div>

      <div className="flex items-center justify-center bg-white p-6 dark:bg-zinc-950 sm:p-10">
        <div className="w-full max-w-sm">
          {children}
          <p className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {t.auth.policy}
          </p>
        </div>
      </div>
    </section>
  );
}