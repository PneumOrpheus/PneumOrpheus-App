import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [patientsCountResult, reportsCountResult, completedCountResult, latestReportResult] =
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
    ]);

  const patientsCount = patientsCountResult.count ?? 0;
  const reportsCount = reportsCountResult.count ?? 0;
  const completedReports = completedCountResult.count ?? 0;
  const latestReportId = latestReportResult.data?.id ?? null;

  return (
    <section className="mx-auto max-w-5xl space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand via-third to-fifth p-8 text-white shadow-sm sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(77,255,246,0.22),transparent_40%)]" />
        <div className="relative z-10 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fourth/90">
            PneumOrpheus
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            AI-assisted pulmonary diagnostics for faster clinical cancer review.
          </h1>
          <p className="max-w-2xl text-sm text-white/90">
            Create reports from chest imaging, inspect explainable classifications, and follow patient-level trends in one unified workflow.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-brand/20 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Patients</p>
          <p className="mt-2 text-3xl font-semibold">{patientsCount}</p>
        </article>
        <article className="rounded-xl border border-brand/20 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Reports</p>
          <p className="mt-2 text-3xl font-semibold">{reportsCount}</p>
        </article>
        <article className="rounded-xl border border-brand/20 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Completed</p>
          <p className="mt-2 text-3xl font-semibold">{completedReports}</p>
        </article>
      </div>

      <div className="flex flex-row gap-4">
        <Link
          href="/upload"
          className="flex min-w-0 flex-1 flex-col rounded-2xl border border-brand/20 bg-gradient-to-br from-brand via-third to-fifth p-5 text-white shadow-sm transition hover:brightness-105"
        >
          <h2 className="text-lg font-semibold">Create New Report</h2>
          <p className="mt-1 text-sm text-white/90">
            Start a new diagnostic run by uploading DICOM or NIfTI data.
          </p>
        </Link>

        <Link
          href="/analyses"
          className="flex min-w-0 flex-1 flex-col rounded-2xl border border-brand/20 bg-gradient-to-br from-brand via-third to-fifth p-5 text-white shadow-sm transition hover:brightness-105"
        >
          <h2 className="text-lg font-semibold">Review Analyses</h2>
          <p className="mt-1 text-sm text-white/90">
            Browse generated reports and inspect per-side model outputs.
          </p>
        </Link>

        <Link
          href="/patients"
          className="flex min-w-0 flex-1 flex-col rounded-2xl border border-brand/20 bg-gradient-to-br from-brand via-third to-fifth p-5 text-white shadow-sm transition hover:brightness-105"
        >
          <h2 className="text-lg font-semibold">Patient Overview</h2>
          <p className="mt-1 text-sm text-white/90">
            Track patients with their recent imaging analyses.
          </p>
        </Link>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Latest report: {latestReportId ?? "No reports yet"}
        {latestReportId ? (
          <>
            {" "}
            <Link className="underline underline-offset-4" href="/analyses">
              Open analyses
            </Link>
          </>
        ) : null}
      </p>
    </section>
  );
}
