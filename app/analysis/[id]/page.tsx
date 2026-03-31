import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AnalysisVisualization } from "@/components/analysis-visualization";

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
        hasMask: typeof parsed.hasMask === "boolean" ? parsed.hasMask : undefined,
        maskCoverage: typeof parsed.maskCoverage === "number" ? parsed.maskCoverage : undefined,
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
      <header className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{new Date(analysis.created_at).toLocaleDateString()}</p>
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
              <dd>{patient?.name ?? analysis.patient_name}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Patient ID</dt>
              <dd>{analysis.patient_id}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Email</dt>
              <dd>{patient?.email ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Uploaded File</dt>
              <dd>{analysis.study_file_name ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">File Size</dt>
              <dd>
                {analysis.study_file_size_bytes
                  ? `${(analysis.study_file_size_bytes / (1024 * 1024)).toFixed(2)} MB`
                  : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">File Type</dt>
              <dd>{analysis.study_file_mime_type ?? "-"}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-2">
          <h2 className="text-lg font-semibold">Classification Result</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{analysis.findings}</p>

          {visualization ? (
            <AnalysisVisualization
              visualization={visualization}
              cancerType={analysis.cancer_type}
              classificationConfidence={analysis.classification_confidence}
              proposedTnmStage={analysis.proposed_tnm_stage}
            />
          ) : null}

          <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700 sm:col-span-2">
              <dt className="text-zinc-500 dark:text-zinc-400">Reasoning</dt>
              <dd className="mt-1">{analysis.reasoning ?? "-"}</dd>
            </div>
            {!visualization ? (
              <>
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                  <dt className="text-zinc-500 dark:text-zinc-400">Predicted Cancer Type</dt>
                  <dd className="mt-1 font-medium">{analysis.cancer_type ?? "-"}</dd>
                </div>
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                  <dt className="text-zinc-500 dark:text-zinc-400">Top Confidence</dt>
                  <dd className="mt-1 font-medium">
                    {analysis.classification_confidence !== null
                      ? `${Math.round(analysis.classification_confidence * 100)}%`
                      : "-"}
                  </dd>
                </div>
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700 sm:col-span-2">
                  <dt className="text-zinc-500 dark:text-zinc-400">Proposed TNM Stage</dt>
                  <dd className="mt-1 font-medium">{analysis.proposed_tnm_stage ?? "-"}</dd>
                </div>
              </>
            ) : null}
          </dl>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(analysis.classifications ?? []).map((item) => (
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

          {(analysis.classifications ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              No classification output available yet. The report is still being processed.
            </p>
          ) : null}

          <div className="mt-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Segmentation Data (for visualization)
            </p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-300">
              {analysis.segmentation_data
                ? JSON.stringify(analysis.segmentation_data, null, 2)
                : "No segmentation output available."}
            </pre>
          </div>
        </article>
      </div>
    </section>
  );
}
