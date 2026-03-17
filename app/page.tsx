import Link from "next/link";
import { analyses, patients } from "@/lib/mock-data";

export default function Home() {
  const completedReports = analyses.filter((analysis) => analysis.status === "Completed").length;

  return (
    <section className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          PneumOrpheus
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">AI Pulmonary Diagnostic Assistant</h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Create reports from chest imaging, inspect explainable classifications, and follow patient-level trends in one workflow.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Patients</p>
          <p className="mt-2 text-3xl font-semibold">{patients.length}</p>
        </article>
        <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Reports</p>
          <p className="mt-2 text-3xl font-semibold">{analyses.length}</p>
        </article>
        <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Completed</p>
          <p className="mt-2 text-3xl font-semibold">{completedReports}</p>
        </article>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/upload" className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900">
          <h2 className="text-lg font-semibold">Create New Report</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Start a new diagnostic run by uploading DICOM or X-ray data.
          </p>
        </Link>

        <Link href="/analyses" className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900">
          <h2 className="text-lg font-semibold">Review Analyses</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Browse generated reports and inspect per-side model outputs.
          </p>
        </Link>

        <Link href="/patients" className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900">
          <h2 className="text-lg font-semibold">Patient Overview</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Track patients with their recent imaging analyses.
          </p>
        </Link>

        <Link href="/sign-in" className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900">
          <h2 className="text-lg font-semibold">Clinician Access</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Sign in or register to continue into secure diagnostic workflows.
          </p>
        </Link>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Latest report: <Link className="underline underline-offset-4" href={`/analysis/${analyses[0].id}`}>{analyses[0].id}</Link>
      </p>
    </section>
  );
}
