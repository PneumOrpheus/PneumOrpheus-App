import Link from "next/link";
import { analyses } from "@/lib/mock-data";

export default function AnalysesPage() {
  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Analysis Reports</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Review completed and in-progress pulmonary diagnostic analyses.
          </p>
        </div>
        <Link href="/upload" className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
          New Report
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 font-medium">Report</th>
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Modality</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {analyses.map((analysis) => (
              <tr key={analysis.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-4 py-3">
                  <Link href={`/analysis/${analysis.id}`} className="font-medium underline-offset-4 hover:underline">
                    {analysis.id}
                  </Link>
                </td>
                <td className="px-4 py-3">{analysis.patientName}</td>
                <td className="px-4 py-3">{analysis.modality}</td>
                <td className="px-4 py-3">{analysis.status}</td>
                <td className="px-4 py-3">{analysis.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
