import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AnalysisVisualization } from "@/components/analysis-visualization";
import { NiftiStorageVisualization } from "@/components/nifti-storage-visualization";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveLocalizedText, type LocalizedTextMap } from "@/lib/analysis-localization";
import { getServerI18n } from "@/lib/server-i18n";

type LocalizedTextValue = string | LocalizedTextMap;

type ClassificationItem = {
  side: LocalizedTextValue;
  prediction: LocalizedTextValue;
  confidence: number;
  explanation: LocalizedTextValue;
};

type AnalysisRow = {
  id: string;
  patient_id: string;
  patient_name: string;
  created_at: string;
  modality: string;
  status: string;
  findings: LocalizedTextValue;
  classifications: ClassificationItem[] | null;
  plot_file_path: string | null;
  plot_file_name: string | null;
  plot_file_size_bytes: number | null;
  plot_file_mime_type: string | null;
  visualization_data: unknown;
  cancer_type: LocalizedTextValue | null;
  classification_confidence: number | null;
  reasoning: LocalizedTextValue | null;
  proposed_tnm_stage: LocalizedTextValue | null;
};

type VisualizationSlice = {
  sliceIndex: number;
  imageDataUrl: string;
  hasOverlay?: boolean;
  overlayCoverage?: number;
};

type VisualizationPayload = {
  imageFormat?: string;
  totalSlices?: number;
  defaultSliceIndex?: number;
  slices: VisualizationSlice[];
};

const parsePlotStorageLocation = (value: string): { bucket: string; objectPath: string } | null => {
  const normalized = value.trim().replace(/^\/+/, "");
  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      const segments = url.pathname.split("/").filter(Boolean);
      const bucketIndex = segments.findIndex((segment) => segment === "study-files");
      if (bucketIndex >= 0 && bucketIndex + 1 < segments.length) {
        return {
          bucket: "study-files",
          objectPath: segments.slice(bucketIndex + 1).join("/"),
        };
      }
    } catch {
      return null;
    }
  }

  const studyFilesPrefix = "study-files/";
  let objectPath = normalized;
  while (objectPath.startsWith(studyFilesPrefix)) {
    objectPath = objectPath.slice(studyFilesPrefix.length);
  }

  if (!objectPath) {
    return null;
  }

  return {
    bucket: "study-files",
    objectPath,
  };
};

const asObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const parseVisualization = (value: unknown): VisualizationPayload | null => {
  const root = asObject(value);
  if (!root) {
    return null;
  }

  const visualization = asObject(root.visualization) ?? root;
  if (!Array.isArray(visualization.slices)) {
    return null;
  }

  const slices = visualization.slices
    .map((slice) => {
      const parsed = asObject(slice);
      if (!parsed || typeof parsed.sliceIndex !== "number" || typeof parsed.imageDataUrl !== "string") {
        return null;
      }

      const hasOverlay =
        typeof parsed.hasOverlay === "boolean"
          ? parsed.hasOverlay
          : typeof parsed.hasMask === "boolean"
            ? parsed.hasMask
            : undefined;
      const overlayCoverage =
        typeof parsed.overlayCoverage === "number"
          ? parsed.overlayCoverage
          : typeof parsed.maskCoverage === "number"
            ? parsed.maskCoverage
            : undefined;

      return {
        sliceIndex: parsed.sliceIndex,
        imageDataUrl: parsed.imageDataUrl,
        ...(typeof hasOverlay === "boolean" && { hasOverlay }),
        ...(typeof overlayCoverage === "number" && { overlayCoverage }),
      };
    })
    .filter((slice): slice is VisualizationSlice => Boolean(slice));

  if (!slices.length) {
    return null;
  }

  return {
    imageFormat: typeof visualization.imageFormat === "string" ? visualization.imageFormat : undefined,
    totalSlices: typeof visualization.totalSlices === "number" ? visualization.totalSlices : undefined,
    defaultSliceIndex:
      typeof visualization.defaultSliceIndex === "number" ? visualization.defaultSliceIndex : undefined,
    slices,
  };
};

type PatientRow = {
  name: string;
  clinician_email: string;
};

export default async function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { language, t } = await getServerI18n();
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: analysisData } = await supabase
    .from("analyses")
    .select(
      "id, patient_id, patient_name, created_at, modality, status, findings, classifications, plot_file_path, plot_file_name, plot_file_size_bytes, plot_file_mime_type, visualization_data, cancer_type, classification_confidence, reasoning, proposed_tnm_stage",
    )
    .eq("id", id)
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const analysis = analysisData as AnalysisRow | null;

  if (!analysis) {
    notFound();
  }

  const { data: patientData } = await supabase
    .from("patients")
    .select("name, clinician_email")
    .eq("id", analysis.patient_id)
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const patient = patientData as PatientRow | null;
  const localizedFindings = resolveLocalizedText(analysis.findings, language) ?? t.common.noData;
  const localizedReasoning = resolveLocalizedText(analysis.reasoning, language) ?? t.common.noData;
  const localizedCancerType = resolveLocalizedText(analysis.cancer_type, language);
  const localizedProposedTnmStage = resolveLocalizedText(analysis.proposed_tnm_stage, language);
  const visualization = parseVisualization(analysis.visualization_data);
  let signedPlotFileUrl: string | null = null;

  if (!visualization && analysis.plot_file_path) {
    const location = parsePlotStorageLocation(analysis.plot_file_path);
    if (location) {
      const { data } = await supabase.storage.from(location.bucket).createSignedUrl(location.objectPath, 3600);
      signedPlotFileUrl = data?.signedUrl ?? null;
    }
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <Card className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand via-third to-fifth text-white shadow-sm">
        <CardHeader>
          <p className="text-sm text-white/80">{new Date(analysis.created_at).toLocaleDateString()}</p>
          <CardTitle className="text-2xl tracking-tight">{t.analysisDetail.report} {analysis.id}</CardTitle>
          <p className="mt-1 inline-flex items-center gap-2 text-sm text-white/80">
            <span>{analysis.modality}</span>
            <Badge variant="outline" className="border-white/50 bg-white/10 text-white">
              {analysis.status}
            </Badge>
          </p>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        <Card className="rounded-xl border-zinc-200 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <CardHeader>
            <CardTitle className="text-lg">{t.analysisDetail.classificationResult}</CardTitle>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{localizedFindings}</p>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <Card className="rounded-lg border-zinc-200 p-3 ring-0 dark:border-zinc-700 sm:col-span-2">
                <dt className="text-zinc-500 dark:text-zinc-400">{t.analysisDetail.reasoning}</dt>
                <dd className="mt-1">{localizedReasoning}</dd>
              </Card>
              <Card className="rounded-lg border-zinc-200 p-3 ring-0 dark:border-zinc-700">
                <dt className="text-zinc-500 dark:text-zinc-400">{t.analysisDetail.predictedCancerType}</dt>
                <dd className="mt-1 font-medium">{localizedCancerType ?? t.common.noData}</dd>
              </Card>
              <Card className="rounded-lg border-zinc-200 p-3 ring-0 dark:border-zinc-700">
                <dt className="text-zinc-500 dark:text-zinc-400">{t.analysisDetail.topConfidence}</dt>
                <dd className="mt-1 font-medium">
                  {analysis.classification_confidence !== null
                    ? `${Math.round(analysis.classification_confidence * 100)}%`
                    : t.common.noData}
                </dd>
              </Card>
              <Card className="rounded-lg border-zinc-200 p-3 ring-0 dark:border-zinc-700 sm:col-span-2">
                <dt className="text-zinc-500 dark:text-zinc-400">{t.analysisDetail.proposedTnm}</dt>
                <dd className="mt-1 font-medium">{localizedProposedTnmStage ?? t.common.noData}</dd>
              </Card>
            </dl>

            {visualization ? (
              <AnalysisVisualization
                visualization={visualization}
                labels={t.visualization}
              />
            ) : analysis.plot_file_path ? (
              <NiftiStorageVisualization
                plotFilePath={analysis.plot_file_path}
                signedFileUrl={signedPlotFileUrl}
                labels={t.visualization}
              />
            ) : null}

            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">More information:</p>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="meta" className="rounded-lg border border-zinc-200 px-3 dark:border-zinc-700">
                  <AccordionTrigger className="hover:no-underline">{t.analysisDetail.patientDetails}</AccordionTrigger>
                  <AccordionContent>
                    <dl className="grid gap-3 text-sm sm:grid-cols-2 py-4">
                      <div>
                        <dt className="text-zinc-500 dark:text-zinc-400">{t.analysisDetail.name}</dt>
                        <dd>{patient?.name ?? analysis.patient_name}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500 dark:text-zinc-400">{t.analysisDetail.patientId}</dt>
                        <dd>{analysis.patient_id}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500 dark:text-zinc-400">{t.analysisDetail.clinicianEmail}</dt>
                        <dd>{patient?.clinician_email ?? t.common.noData}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500 dark:text-zinc-400">{t.analysisDetail.plotFile}</dt>
                        <dd>{analysis.plot_file_name ?? t.analysisDetail.noPlotFile}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500 dark:text-zinc-400">{t.analysisDetail.fileSize}</dt>
                        <dd>
                          {analysis.plot_file_size_bytes
                            ? `${(analysis.plot_file_size_bytes / (1024 * 1024)).toFixed(2)} MB`
                            : t.common.noData}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500 dark:text-zinc-400">{t.analysisDetail.fileType}</dt>
                        <dd>{analysis.plot_file_mime_type ?? t.common.noData}</dd>
                      </div>
                    </dl>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {(analysis.classifications ?? []).length === 0 ? (
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                {t.analysisDetail.noClassification}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
