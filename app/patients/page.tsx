import Link from "next/link";
import { analyses, patients } from "@/lib/mock-data";

export default function PatientsPage() {
  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand via-third to-fifth p-6 text-white shadow-sm sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(77,255,246,0.22),transparent_40%)]" />
        <div className="relative z-10 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fourth/90">Patients</p>
          <h1 className="text-3xl font-semibold tracking-tight">Patients</h1>
          <p className="text-sm text-white/90">
            Overview of registered patients and their latest pulmonary analyses.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {patients.map((patient) => {
          const latest = analyses.find((analysis) => analysis.patientId === patient.id);

          return (
            <article key={patient.id} className="rounded-xl border border-brand/20 bg-white p-5 shadow-sm">
              <div className="mb-4 space-y-1">
                <h2 className="text-lg font-semibold">{patient.name}</h2>
                <p className="text-sm text-zinc-600">
                  {patient.id} · {patient.sex} · {patient.age} years
                </p>
                <p className="text-sm text-zinc-600">{patient.email}</p>
              </div>

              {latest ? (
                <div className="space-y-2 text-sm">
                  <p>
                    Latest report: <strong>{latest.id}</strong>
                  </p>
                  <p className="text-zinc-600">{latest.findings}</p>
                  <Link href={`/analysis/${latest.id}`} className="inline-block underline underline-offset-4">
                    Open report
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-zinc-600">No analyses available.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
