import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AnalysisVisualization } from "@/components/analysis-visualization";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerI18n } from "@/lib/server-i18n";

type ClassificationItem = {
  side: string;
  prediction: string;
  confidence: number;
  explanation: string;
};

type AnalysisRow = {
  id: string;
  patient_id: string;
  patient_name: string;
  created_at: string;
  modality: string;
  status: string;
  findings: string;
  classifications: ClassificationItem[] | null;
  study_file_name: string | null;
  study_file_size_bytes: number | null;
  study_file_mime_type: string | null;
  segmentation_data: unknown;
  cancer_type: string | null;
  classification_confidence: number | null;
  reasoning: string | null;
  proposed_tnm_stage: string | null;
};

type VisualizationSlice = {
  sliceIndex: number;
  imageDataUrl: string;
  hasMask?: boolean;
  maskCoverage?: number;
};

type VisualizationPayload = {
  imageFormat?: string;
  totalSlices?: number;
  defaultSliceIndex?: number;
  slices: VisualizationSlice[];
};

const asObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const parseVisualization = (value: unknown): VisualizationPayload | null => {
  const segmentationData = asObject(value);
  if (!segmentationData) {
    return null;
  }

  const visualization = asObject(segmentationData.visualization);
  if (!visualization || !Array.isArray(visualization.slices)) {
    return null;
  }

  const slices = visualization.slices
    .map((slice) => {
      const parsed = asObject(slice);
      if (!parsed || typeof parsed.sliceIndex !== "number" || typeof parsed.imageDataUrl !== "string") {
        return null;
      }

      return {
        sliceIndex: parsed.sliceIndex,
        imageDataUrl: parsed.imageDataUrl,
        ...(typeof parsed.hasMask === "boolean" && { hasMask: parsed.hasMask }),
        ...(typeof parsed.maskCoverage === "number" && { maskCoverage: parsed.maskCoverage }),
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
  email: string;
};

export default async function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getServerI18n();
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: analysisData } = await supabase
    .from("analyses")
    .select(
      "id, patient_id, patient_name, created_at, modality, status, findings, classifications, study_file_name, study_file_size_bytes, study_file_mime_type, segmentation_data, cancer_type, classification_confidence, reasoning, proposed_tnm_stage",
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
    .select("name, email")
    .eq("id", analysis.patient_id)
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const patient = patientData as PatientRow | null;
  const visualization = parseVisualization(analysis.segmentation_data);

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <Card className="rounded-xl border-zinc-200 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <CardHeader>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{new Date(analysis.created_at).toLocaleDateString()}</p>
          <CardTitle className="text-2xl tracking-tight">{t.analysisDetail.report} {analysis.id}</CardTitle>
          <p className="mt-1 inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span>{analysis.modality}</span>
            <Badge variant="outline">{analysis.status}</Badge>
          </p>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-xl border-zinc-200 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">{t.analysisDetail.patientDetails}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">{t.analysisDetail.name}</dt>
              <dd>{patient?.name ?? analysis.patient_name}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">{t.analysisDetail.patientId}</dt>
              <dd>{analysis.patient_id}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">{t.analysisDetail.email}</dt>
              <dd>{patient?.email ?? t.common.noData}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">{t.analysisDetail.uploadedFile}</dt>
              <dd>{analysis.study_file_name ?? t.common.noData}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">{t.analysisDetail.fileSize}</dt>
              <dd>
                {analysis.study_file_size_bytes
                  ? `${(analysis.study_file_size_bytes / (1024 * 1024)).toFixed(2)} MB`
                  : t.common.noData}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">{t.analysisDetail.fileType}</dt>
              <dd>{analysis.study_file_mime_type ?? t.common.noData}</dd>
            </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-zinc-200 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">{t.analysisDetail.classificationResult}</CardTitle>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{analysis.findings}</p>
          </CardHeader>
          <CardContent>

          {visualization ? (
            <AnalysisVisualization
              visualization={visualization}
              cancerType={analysis.cancer_type}
              classificationConfidence={analysis.classification_confidence}
              proposedTnmStage={analysis.proposed_tnm_stage}
              labels={t.visualization}
            />
          ) : null}

          <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
            <Card className="rounded-lg border-zinc-200 p-3 ring-0 dark:border-zinc-700 sm:col-span-2">
              <dt className="text-zinc-500 dark:text-zinc-400">{t.analysisDetail.reasoning}</dt>
              <dd className="mt-1">{analysis.reasoning ?? t.common.noData}</dd>
            </Card>
            {!visualization ? (
              <>
                <Card className="rounded-lg border-zinc-200 p-3 ring-0 dark:border-zinc-700">
                  <dt className="text-zinc-500 dark:text-zinc-400">{t.analysisDetail.predictedCancerType}</dt>
                  <dd className="mt-1 font-medium">{analysis.cancer_type ?? t.common.noData}</dd>
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
                  <dd className="mt-1 font-medium">{analysis.proposed_tnm_stage ?? t.common.noData}</dd>
                </Card>
              </>
            ) : null}
          </dl>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(analysis.classifications ?? []).map((item) => (
              <Card key={item.side} className="rounded-lg border-zinc-200 p-3 ring-0 dark:border-zinc-700">
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{item.side} {t.analysisDetail.lungSuffix}</p>
                <p className="mt-1 font-medium">{item.prediction}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {t.analysisDetail.confidence}: {Math.round(item.confidence * 100)}%
                </p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{item.explanation}</p>
              </Card>
            ))}
          </div>

          {(analysis.classifications ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              {t.analysisDetail.noClassification}
            </p>
          ) : null}

          <Card className="mt-4 rounded-lg border-zinc-200 p-3 ring-0 dark:border-zinc-700">
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t.analysisDetail.segmentationTitle}
            </p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-300">
              {analysis.segmentation_data
                ? JSON.stringify(analysis.segmentation_data, null, 2)
                : t.analysisDetail.noSegmentation}
            </pre>
          </Card>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
