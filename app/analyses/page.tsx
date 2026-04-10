import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const cellLinkClass = "-m-2 block rounded px-2 py-2 focus-visible:outline-none";

  const getStatusVariant = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes("complete")) return "default" as const;
    if (normalized.includes("fail") || normalized.includes("error")) return "destructive" as const;
    if (normalized.includes("progress") || normalized.includes("pending")) return "secondary" as const;
    return "outline" as const;
  };

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
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-brand/20 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <Table className="text-zinc-900 dark:text-zinc-100">
          <TableHeader className="bg-brand/10 dark:bg-brand/20">
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4 py-3 font-medium">Date</TableHead>
              <TableHead className="px-4 py-3 font-medium">Patient</TableHead>
              <TableHead className="px-4 py-3 font-medium">Report</TableHead>
              <TableHead className="px-4 py-3 font-medium">Modality</TableHead>
              <TableHead className="px-4 py-3 font-medium">File</TableHead>
              <TableHead className="px-4 py-3 font-medium">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analyses.length === 0 ? (
              <TableRow className="border-brand/10 dark:border-zinc-800">
                <TableCell colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
                  No current analyses.
                </TableCell>
              </TableRow>
            ) : analyses.map((analysis) => {
              const analysisHref = `/analysis/${analysis.id}`;

              return (
                <TableRow key={analysis.id} className="cursor-pointer border-brand/10 hover:bg-brand/5 focus-within:bg-brand/10 dark:border-zinc-800 dark:hover:bg-zinc-800/60 dark:focus-within:bg-zinc-800">
                  <TableCell className="px-4 py-3">
                    <Link href={analysisHref} className={`${cellLinkClass} font-medium`}>
                      {analysis.id}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Link href={analysisHref} className={cellLinkClass}>
                      {analysis.patient_name}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Link href={analysisHref} className={cellLinkClass}>
                      {analysis.modality}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Link href={analysisHref} className={cellLinkClass}>
                      {analysis.study_file_name ?? "-"}
                      {analysis.study_file_size_bytes ? (
                        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                          {(analysis.study_file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      ) : null}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Link href={analysisHref} className={`${cellLinkClass} inline-flex`}>
                      <Badge variant={getStatusVariant(analysis.status)}>{analysis.status}</Badge>
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Link href={analysisHref} className={cellLinkClass}>
                      {new Date(analysis.created_at).toLocaleDateString()}
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
