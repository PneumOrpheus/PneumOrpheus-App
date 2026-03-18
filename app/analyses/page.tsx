import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

type AnalysisRow = {
  id: string;
  patient_name: string;
  modality: string;
  status: string;
  created_at: string;
  study_file_name: string | null;
  study_file_size_bytes: number | null;
};

export default async function AnalysesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("analyses")
    .select("id, patient_name, modality, status, created_at, study_file_name, study_file_size_bytes")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const analyses = (data ?? []) as AnalysisRow[];

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand via-third to-fifth p-6 text-white shadow-sm sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(77,255,246,0.22),transparent_40%)]" />
        <div className="relative z-10 flex items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fourth/90">Reports</p>
            <h1 className="text-3xl font-semibold tracking-tight">Analysis Reports</h1>
            <p className="text-sm text-white/90">
              Review completed and in-progress pulmonary diagnostic analyses.
            </p>
          </div>
          <Link href="/upload" className="rounded-md border border-white/30 bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/20">
            New Report
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-brand/20 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand/10">
            <tr>
              <th className="px-4 py-3 font-medium">Report</th>
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Modality</th>
              <th className="px-4 py-3 font-medium">File</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {analyses.map((analysis) => (
              <tr key={analysis.id} className="border-t border-brand/10">
                <td className="px-4 py-3">
                  <Link href={`/analysis/${analysis.id}`} className="font-medium underline-offset-4 hover:underline">
                    {analysis.id}
                  </Link>
                </td>
                <td className="px-4 py-3">{analysis.patient_name}</td>
                <td className="px-4 py-3">{analysis.modality}</td>
                <td className="px-4 py-3">
                  {analysis.study_file_name ?? "-"}
                  {analysis.study_file_size_bytes ? (
                    <span className="block text-xs text-zinc-500">
                      {(analysis.study_file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">{analysis.status}</td>
                <td className="px-4 py-3">{new Date(analysis.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
