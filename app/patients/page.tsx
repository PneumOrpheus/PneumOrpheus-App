import Link from "next/link";
import { analyses, patients } from "@/lib/mock-data";

export default function PatientsPage() {
  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Patients</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Overview of registered patients and their latest pulmonary analyses.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {patients.map((patient) => {
          const latest = analyses.find((analysis) => analysis.patientId === patient.id);

          return (
            <article key={patient.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="mb-4 space-y-1">
                <h2 className="text-lg font-semibold">{patient.name}</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {patient.id} · {patient.sex} · {patient.age} years
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{patient.email}</p>
              </div>

              {latest ? (
                <div className="space-y-2 text-sm">
                  <p>
                    Latest report: <strong>{latest.id}</strong>
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400">{latest.findings}</p>
                  <Link href={`/analysis/${latest.id}`} className="inline-block underline underline-offset-4">
                    Open report
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">No analyses available.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
