import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AnalysisEditableFieldsForm } from "@/components/analysis-editable-fields-form";
import { AnalysisProcessingWatcher } from "@/components/analysis-processing-watcher";
import { AnalysisVisualization } from "@/components/analysis-visualization";
import {
  AnalysisNiftiVariantSelector,
  type NiftiVariantOption,
} from "@/components/analysis-nifti-variant-selector";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseLocalizedText, resolveLocalizedText, type LocalizedTextMap } from "@/lib/analysis-localization";
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
  study_file_path: string | null;
  study_file_name: string | null;
  study_file_size_bytes: number | null;
  study_file_mime_type: string | null;
  grad_cam_study_file_path: string | null;
  grad_cam_study_file_name: string | null;
  grad_cam_study_file_size_bytes: number | null;
  grad_cam_study_file_mime_type: string | null;
  segmentation_roi_study_file_path: string | null;
  segmentation_roi_study_file_name: string | null;
  segmentation_roi_study_file_size_bytes: number | null;
  segmentation_roi_study_file_mime_type: string | null;
  visualization_data: unknown;
  cancer_type: LocalizedTextValue | null;
  classification_confidence: number | null;
  reasoning: LocalizedTextValue | null;
  proposed_tnm_stage: LocalizedTextValue | null;
  is_shared: boolean;
  updated_at: string;
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

const createSignedNiftiFileUrl = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  plotFilePath: string,
) => {
  const location = parsePlotStorageLocation(plotFilePath);
  if (!location) {
    return null;
  }

  const { data } = await supabase.storage.from(location.bucket).createSignedUrl(location.objectPath, 3600);
  return data?.signedUrl ?? null;
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

const isCompletedStatus = (status: string | null | undefined) => {
  const normalized = (status ?? "").trim().toLowerCase();
  return normalized.includes("complete") || normalized.includes("fullfort") || normalized.includes("fullført");
};

const COMPLETED_STATUS_VALUE = "Completed";
const IN_REVIEW_STATUS_VALUE = "In Review";

const normalizeEditableInput = (value: FormDataEntryValue | null): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const getLocalizedValue = (value: unknown, language: "en" | "no"): string | null => {
  const parsed = parseLocalizedText(value);
  if (!parsed) {
    return null;
  }

  return language === "no" ? (parsed.no ?? parsed.en ?? null) : (parsed.en ?? parsed.no ?? null);
};

const toStoredLocalizedUpdate = (
  baseValue: unknown,
  nextValue: string | null,
  language: "en" | "no",
  allowNull: boolean,
): string | null => {
  if (nextValue === null) {
    return allowNull ? null : (JSON.stringify(parseLocalizedText(baseValue) ?? { en: "", no: "" }));
  }

  const parsed = parseLocalizedText(baseValue);
  const english = language === "en" ? nextValue : (parsed?.en ?? parsed?.no ?? nextValue);
  const norwegian = language === "no" ? nextValue : (parsed?.no ?? parsed?.en ?? nextValue);

  return JSON.stringify({ en: english, no: norwegian });
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

  const ownedOrShared = `user_id.eq.${user?.id ?? ""},is_shared.eq.true`;

  const { data: analysisData } = await supabase
    .from("analyses")
    .select(
      "id, patient_id, patient_name, created_at, modality, status, findings, classifications, study_file_path, study_file_name, study_file_size_bytes, study_file_mime_type, grad_cam_study_file_path, grad_cam_study_file_name, grad_cam_study_file_size_bytes, grad_cam_study_file_mime_type, segmentation_roi_study_file_path, segmentation_roi_study_file_name, segmentation_roi_study_file_size_bytes, segmentation_roi_study_file_mime_type, visualization_data, cancer_type, classification_confidence, reasoning, proposed_tnm_stage, is_shared, updated_at",
    )
    .eq("id", id)
    .or(ownedOrShared)
    .maybeSingle();

  const analysis = analysisData as AnalysisRow | null;

  if (!analysis) {
    notFound();
  }

  const { data: patientData } = await supabase
    .from("patients")
    .select("name, clinician_email")
    .eq("id", analysis.patient_id)
    .or(ownedOrShared)
    .maybeSingle();

  const patient = patientData as PatientRow | null;
  const editableFindingsValue = resolveLocalizedText(analysis.findings, language) ?? "";
  const editableReasoningValue = resolveLocalizedText(analysis.reasoning, language) ?? "";
  const editableCancerTypeValue = resolveLocalizedText(analysis.cancer_type, language) ?? "";
  const editableProposedTnmStageValue = resolveLocalizedText(analysis.proposed_tnm_stage, language) ?? "";
  const createdAtLocale = language === "no" ? "nb-NO" : "en-US";

  const localizeModality = (modality: string) => {
    const normalized = modality.trim().toLowerCase();

    if (normalized === "ct chest" || normalized === "thorax ct") {
      return t.upload.chestCt;
    }

    if (normalized === "chest pet") {
      return language === "no" ? "Thorax PET" : "Chest PET";
    }

    if (normalized === "thorax pet") {
      return language === "en" ? "Chest PET" : "Thorax PET";
    }

    return modality;
  };

  const localizeStatus = (status: string) => {
    const normalized = status.trim().toLowerCase();

    if (isCompletedStatus(status)) {
      return t.analysisDetail.statusCompleted;
    }

    if (normalized.includes("review") || normalized.includes("vurdering")) {
      return t.analysisDetail.statusInReview;
    }

    if (
      normalized.includes("process") ||
      normalized.includes("progress") ||
      normalized.includes("pending") ||
      normalized.includes("behandles") ||
      normalized.includes("venter")
    ) {
      return t.analysisDetail.statusProcessing;
    }

    if (normalized.includes("fail") || normalized.includes("error") || normalized.includes("feil") || normalized.includes("feilet")) {
      return t.analysisDetail.statusFailed;
    }

    return status;
  };

  const localizedCreatedAt = new Date(analysis.created_at).toLocaleDateString(createdAtLocale);
  const localizedModality = localizeModality(analysis.modality);
  const localizedStatus = localizeStatus(analysis.status);
  const shouldSetInReview = isCompletedStatus(analysis.status);
  const statusToggleButtonLabel = shouldSetInReview
    ? t.analysisDetail.setAsInReview
    : t.analysisDetail.setAsCompleted;
  const visualization = parseVisualization(analysis.visualization_data);
  const niftiVariantCandidates = [
    {
      id: "normalCt" as const,
      label: t.visualization.normalCtLabel,
      description: t.visualization.normalCtDescription,
      plotFilePath: analysis.study_file_path,
      plotFileName: analysis.study_file_name,
    },
    {
      id: "gradCam" as const,
      label: t.visualization.gradCamLabel,
      description: t.visualization.gradCamDescription,
      plotFilePath: analysis.grad_cam_study_file_path,
      plotFileName: analysis.grad_cam_study_file_name,
    },
    {
      id: "segmentationRoi" as const,
      label: t.visualization.segmentationRoiLabel,
      description: t.visualization.segmentationRoiDescription,
      plotFilePath: analysis.segmentation_roi_study_file_path,
      plotFileName: analysis.segmentation_roi_study_file_name,
    },
  ];

  const niftiVariantOptions: NiftiVariantOption[] = [];

  for (const option of niftiVariantCandidates) {
    const plotFilePath = option.plotFilePath?.trim();
    if (!plotFilePath) {
      continue;
    }

    niftiVariantOptions.push({
      ...option,
      plotFilePath,
      signedFileUrl: await createSignedNiftiFileUrl(supabase, plotFilePath),
    });
  }

  const toggleStatusAction = async () => {
    "use server";

    const actionSupabase = await createClient();
    const {
      data: { user: actionUser },
    } = await actionSupabase.auth.getUser();

    if (!actionUser) {
      return;
    }

    const { data: currentAnalysis } = await actionSupabase
      .from("analyses")
      .select("status")
      .eq("id", id)
      .eq("user_id", actionUser.id)
      .maybeSingle();

    if (!currentAnalysis) {
      return;
    }

    const nextStatus = isCompletedStatus(currentAnalysis.status)
      ? IN_REVIEW_STATUS_VALUE
      : COMPLETED_STATUS_VALUE;

    await actionSupabase
      .from("analyses")
      .update({ status: nextStatus })
      .eq("id", id)
      .eq("user_id", actionUser.id);

    revalidatePath(`/analysis/${id}`);
    revalidatePath("/analyses");
    revalidatePath("/patients");
  };

  const saveClinicalFieldsAction = async (formData: FormData) => {
    "use server";

    const actionSupabase = await createClient();
    const {
      data: { user: actionUser },
    } = await actionSupabase.auth.getUser();

    if (!actionUser) {
      return;
    }

    const { data: currentAnalysis } = await actionSupabase
      .from("analyses")
      .select("findings, reasoning, cancer_type, proposed_tnm_stage")
      .eq("id", id)
      .eq("user_id", actionUser.id)
      .maybeSingle();

    if (!currentAnalysis) {
      return;
    }

    const findingsInput = normalizeEditableInput(formData.get("findings"));
    if (!findingsInput) {
      return;
    }

    const reasoningInput = normalizeEditableInput(formData.get("reasoning"));
    const cancerTypeInput = normalizeEditableInput(formData.get("cancerType"));
    const proposedTnmStageInput = normalizeEditableInput(formData.get("proposedTnmStage"));

    const currentFindings = getLocalizedValue(currentAnalysis.findings, language) ?? "";
    const currentReasoning = getLocalizedValue(currentAnalysis.reasoning, language) ?? "";
    const currentCancerType = getLocalizedValue(currentAnalysis.cancer_type, language) ?? "";
    const currentProposedTnmStage = getLocalizedValue(currentAnalysis.proposed_tnm_stage, language) ?? "";

    const findingsChanged = findingsInput !== currentFindings;
    const reasoningChanged = (reasoningInput ?? "") !== currentReasoning;
    const cancerTypeChanged = (cancerTypeInput ?? "") !== currentCancerType;
    const proposedTnmStageChanged = (proposedTnmStageInput ?? "") !== currentProposedTnmStage;
    const anyFieldChanged = findingsChanged || reasoningChanged || cancerTypeChanged || proposedTnmStageChanged;

    const findingsToStore = toStoredLocalizedUpdate(currentAnalysis.findings, findingsInput, language, false);
    if (!findingsToStore) {
      return;
    }

    const updatePayload: {
      findings: string;
      reasoning: string | null;
      cancer_type: string | null;
      proposed_tnm_stage: string | null;
      classification_confidence?: number;
    } = {
      findings: findingsToStore,
      reasoning: toStoredLocalizedUpdate(currentAnalysis.reasoning, reasoningInput, language, true),
      cancer_type: toStoredLocalizedUpdate(currentAnalysis.cancer_type, cancerTypeInput, language, true),
      proposed_tnm_stage: toStoredLocalizedUpdate(currentAnalysis.proposed_tnm_stage, proposedTnmStageInput, language, true),
    };

    if (anyFieldChanged) {
      updatePayload.classification_confidence = -1;
    }

    await actionSupabase
      .from("analyses")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", actionUser.id);

    revalidatePath(`/analysis/${id}`);
    revalidatePath("/analyses");
    revalidatePath("/patients");
  };

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <AnalysisProcessingWatcher analysisId={analysis.id} status={analysis.status} />
      <Card className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand via-third to-fifth text-white shadow-sm">
        <CardHeader>
          <p className="text-sm text-white/80">{localizedCreatedAt}</p>
          <CardTitle className="text-2xl tracking-tight">{t.analysisDetail.report} {analysis.id}</CardTitle>
          <p className="mt-1 inline-flex items-center gap-2 text-sm text-white/80">
            <span>{localizedModality}</span>
            <Badge variant="outline" className="border-white/50 bg-white/10 text-white">
              {localizedStatus}
            </Badge>
            {analysis.is_shared ? (
              <Badge variant="outline" className="border-white/50 bg-white/10 text-white">
                {t.analysisDetail.sharedExampleBadge}
              </Badge>
            ) : null}
          </p>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        <Card className="rounded-xl border-zinc-200 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <CardHeader>
            <CardTitle className="text-lg">{t.analysisDetail.classificationResult}</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalysisEditableFieldsForm
              key={`${id}-${language}-${analysis.updated_at}`}
              initialFindings={editableFindingsValue}
              initialReasoning={editableReasoningValue}
              initialCancerType={editableCancerTypeValue}
              initialProposedTnmStage={editableProposedTnmStageValue}
              classificationConfidence={analysis.classification_confidence}
              noDataLabel={t.common.noData}
              statusToggleButtonLabel={statusToggleButtonLabel}
              readOnly={analysis.is_shared}
              saveClinicalFieldsAction={saveClinicalFieldsAction}
              toggleStatusAction={toggleStatusAction}
              labels={{
                findings: t.analysisDetail.findings,
                reasoning: t.analysisDetail.reasoning,
                predictedCancerType: t.analysisDetail.predictedCancerType,
                topConfidence: t.analysisDetail.topConfidence,
                proposedTnm: t.analysisDetail.proposedTnm,
                confidenceAltered: t.analysisDetail.confidenceAltered,
                editField: t.analysisDetail.editField,
                saveClinicalUpdates: t.analysisDetail.saveClinicalUpdates,
                sharedExampleNotice: t.analysisDetail.sharedExampleNotice,
              }}
            />

            {niftiVariantOptions.length > 0 ? (
              <AnalysisNiftiVariantSelector
                options={niftiVariantOptions}
                labels={t.visualization}
                selectorTitle={t.visualization.niftiVariantTitle}
                selectorDescription={t.visualization.niftiVariantDescription}
              />
            ) : visualization ? (
              <AnalysisVisualization visualization={visualization} labels={t.visualization} />
            ) : null}

            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.analysisDetail.moreInformation}</p>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="meta" className="rounded-lg border border-zinc-200 px-3 dark:border-zinc-700">
                  <AccordionTrigger className="hover:no-underline cursor-pointer">{t.analysisDetail.patientDetails}</AccordionTrigger>
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
                        <dd>{analysis.study_file_name ?? t.analysisDetail.noPlotFile}</dd>
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
