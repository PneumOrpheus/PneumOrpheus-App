import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getServerI18n } from "@/lib/server-i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [patientsCountResult, reportsCountResult, completedCountResult, latestReportResult, clinicianResult] =
    await Promise.all([
      supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user?.id ?? ""),
      supabase
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user?.id ?? ""),
      supabase
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user?.id ?? "")
        .eq("status", "Completed"),
      supabase
        .from("analyses")
        .select("id")
        .eq("user_id", user?.id ?? "")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("clinicians")
        .select("name")
        .eq("id", user?.id ?? "")
        .maybeSingle(),
    ]);

  const patientsCount = patientsCountResult.count ?? 0;
  const reportsCount = reportsCountResult.count ?? 0;
  const completedReports = completedCountResult.count ?? 0;
  const latestReportId = latestReportResult.data?.id ?? null;

  const metadataName =
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    (typeof user?.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
    (typeof user?.email === "string" && user.email.includes("@") ? user.email.split("@")[0] : null);

  const clinicianName = clinicianResult.data?.name?.trim() || metadataName || "Clinician";

  return (
    <section className="mx-auto max-w-5xl space-y-8">
      <div>
        <Badge className="mb-3 h-auto border p-3 border-brand/30 bg-brand/10 px-3.5 py-1.5 text-sm font-semibold text-brand dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 sm:text-base">
          {t.home.greeting} {clinicianName}
        </Badge>
        <div className="relative mt-3 overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand via-third to-fifth p-8 text-white shadow-sm sm:mt-2 sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(77,255,246,0.22),transparent_40%)]" />
          <div className="relative z-10 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fourth/90">
              {t.home.sectionLabel}
            </p>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {t.home.title}
            </h1>
            <p className="max-w-2xl text-sm text-white/90">
              {t.home.subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border border-brand/20 ring-0 dark:border-zinc-800">
          <CardHeader>
            <CardDescription>{t.home.patients}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{patientsCount}</p>
          </CardContent>
        </Card>
        <Card className="border border-brand/20 ring-0 dark:border-zinc-800">
          <CardHeader>
            <CardDescription>{t.home.reports}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{reportsCount}</p>
          </CardContent>
        </Card>
        <Card className="border border-brand/20 ring-0 dark:border-zinc-800">
          <CardHeader>
            <CardDescription>{t.home.completed}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{completedReports}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-row gap-4">
        <Link href="/upload" className="min-w-0 flex-1" aria-label="Start upload">
          <Card className="h-full rounded-2xl border border-brand/20 bg-gradient-to-br from-brand via-third to-fifth p-5 text-white shadow-sm ring-0 transition hover:brightness-105">
            <CardHeader className="px-0">
              <CardTitle className="text-lg">{t.home.createReport}</CardTitle>
              <CardDescription className="text-white/90">
                {t.home.createReportDesc}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/analyses" className="min-w-0 flex-1" aria-label="Browse reports">
          <Card className="h-full rounded-2xl border border-brand/20 bg-gradient-to-br from-brand via-third to-fifth p-5 text-white shadow-sm ring-0 transition hover:brightness-105">
            <CardHeader className="px-0">
              <CardTitle className="text-lg">{t.home.reviewAnalyses}</CardTitle>
              <CardDescription className="text-white/90">
                {t.home.reviewAnalysesDesc}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/patients" className="min-w-0 flex-1" aria-label="Open patients">
          <Card className="h-full rounded-2xl border border-brand/20 bg-gradient-to-br from-brand via-third to-fifth p-5 text-white shadow-sm ring-0 transition hover:brightness-105">
            <CardHeader className="px-0">
              <CardTitle className="text-lg">{t.home.patientOverview}</CardTitle>
              <CardDescription className="text-white/90">
                {t.home.patientOverviewDesc}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {t.common.latestReport}: {latestReportId ?? t.common.noReportsYet}
        {latestReportId ? (
          <>
            {" "}
            <Link href="/analyses" className={cn(buttonVariants({ variant: "link" }), "h-auto p-0 align-baseline")}>
              {t.common.openAnalyses}
            </Link>
          </>
        ) : null}
      </p>
    </section>
  );
}
