import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

type PatientRow = {
  id: string;
  name: string;
  age: number | null;
  sex: string | null;
  email: string;
  recent_analysis_ids: string[];
};

type AnalysisRow = {
  id: string;
  patient_id: string;
  findings: string;
  created_at: string;
  modality: string;
  status: string;
  study_file_name: string | null;
};

export default async function PatientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [patientsResult, analysesResult] = await Promise.all([
    supabase
      .from("patients")
      .select("id, name, age, sex, email, recent_analysis_ids")
      .eq("user_id", user?.id ?? "")
      .order("created_at", { ascending: false }),
    supabase
      .from("analyses")
      .select("id, patient_id, findings, created_at, modality, status, study_file_name")
      .eq("user_id", user?.id ?? "")
      .order("created_at", { ascending: false }),
  ]);

  const patients = (patientsResult.data ?? []) as PatientRow[];
  const analyses = (analysesResult.data ?? []) as AnalysisRow[];

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
        <div className="relative z-10 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fourth/90">Patients</p>
          <h1 className="text-3xl font-semibold tracking-tight">Your Registered Patients</h1>
          <p className="text-sm text-white/90">
            Overview of registered patients and their latest pulmonary cancer analyses.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {patients.length === 0 ? (
          <div className="sm:col-span-2 rounded-xl border border-brand/20 bg-white px-4 py-8 text-center text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            No current patients.
          </div>
        ) : patients.map((patient) => {
          const latestByReference = patient.recent_analysis_ids?.length
            ? analyses.find((analysis) => analysis.id === patient.recent_analysis_ids[0])
            : undefined;
          const latestByDate = analyses.find((analysis) => analysis.patient_id === patient.id);
          const latest = latestByReference ?? latestByDate;

          return (
            <Card key={patient.id} className="border border-brand/20 ring-0 dark:border-zinc-800">
              <CardHeader className="space-y-2">
                <CardTitle className="text-lg">{patient.name}</CardTitle>
                <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <Badge variant="outline">{patient.id}</Badge>
                  <Badge variant="secondary">{patient.sex ?? "Unknown"}</Badge>
                  <Badge variant="outline">
                    {patient.age ?? "Unknown"}
                    {patient.age ? " years" : ""}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {patient.email}
                </p>
              </CardHeader>

              <CardContent>
                {latest ? (
                <div className="space-y-2 text-sm">
                  <p className="inline-flex items-center gap-2">
                    Latest report: <strong>{latest.id}</strong>
                    <Badge variant={getStatusVariant(latest.status)}>{latest.status}</Badge>
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    {latest.modality} · {new Date(latest.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400">File: {latest.study_file_name ?? "-"}</p>
                  <p className="text-zinc-600 dark:text-zinc-400">{latest.findings}</p>
                  <Link href={`/analysis/${latest.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1")}>
                    Open report
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">No analyses available.</p>
              )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
