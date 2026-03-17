import { notFound } from "next/navigation";
import { getAnalysisById, getPatientById } from "@/lib/mock-data";

export default async function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const analysis = getAnalysisById(id);

  if (!analysis) {
    notFound();
  }

  const patient = getPatientById(analysis.patientId);

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{analysis.createdAt}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Report {analysis.id}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {analysis.modality} · {analysis.status}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-1">
          <h2 className="text-lg font-semibold">Patient Details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Name</dt>
              <dd>{patient?.name ?? analysis.patientName}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Patient ID</dt>
              <dd>{analysis.patientId}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Email</dt>
              <dd>{patient?.email ?? "-"}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-2">
          <h2 className="text-lg font-semibold">Classification Result</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{analysis.findings}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {analysis.classifications.map((item) => (
              <div key={item.side} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{item.side} Lung</p>
                <p className="mt-1 font-medium">{item.prediction}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Confidence: {Math.round(item.confidence * 100)}%
                </p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{item.explanation}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
