import { createClient } from "@/utils/supabase/server";
import {
  mergeLocalizedText,
  resolveLocalizedText,
  toStoredLocalizedJsonValue,
  toStoredLocalizedText,
  type LocalizedTextMap,
} from "@/lib/analysis-localization";

export type AnalysisStatus = "Completed" | "In Review" | "Processing" | "Failed";

type LocalizedTextValue = string | LocalizedTextMap;

type ClassificationItem = {
  side: LocalizedTextValue;
  prediction: LocalizedTextValue;
  confidence: number;
  explanation: LocalizedTextValue;
};

export type InferenceRecord = Record<string, unknown>;

export type NiftiFileBlob = { filename: string; mimeType: string; sizeBytes: number; base64Data: string };

export type NormalizedInferenceResult = {
  findings: string;
  classifications: ClassificationItem[];
  plotFilePath: string | null;
  plotFileName: string | null;
  plotFileSizeBytes: number | null;
  plotFileMimeType: string | null;
  gradCamPlotFilePath: string | null;
  gradCamPlotFileName: string | null;
  gradCamPlotFileSizeBytes: number | null;
  gradCamPlotFileMimeType: string | null;
  segmentationRoiPlotFilePath: string | null;
  segmentationRoiPlotFileName: string | null;
  segmentationRoiPlotFileSizeBytes: number | null;
  segmentationRoiPlotFileMimeType: string | null;
  plainCtFile: NiftiFileBlob | null;
  gradCamFile: NiftiFileBlob | null;
  segmentationRoiFile: NiftiFileBlob | null;
  visualizationData: InferenceRecord | null;
  cancerType: string | null;
  classificationConfidence: number | null;
  reasoning: string | null;
  proposedTnmStage: string | null;
  status: "Completed" | "In Review";
};

export const isAllowedFile = (fileName: string, mimeType?: string) => {
  const lower = fileName.trim().toLowerCase();
  const validExtension = /(\.dcm|\.dicom|\.nii|\.nii\.gz)$/i.test(lower);
  const validMime =
    mimeType === "application/dicom" ||
    mimeType === "application/gzip" ||
    mimeType === "application/x-gzip" ||
    mimeType === "application/octet-stream";

  return validExtension || validMime;
};

export const sanitizeFileName = (fileName: string) => fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

const asString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const asObject = (value: unknown): InferenceRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as InferenceRecord;
};

const parseNiftiFileBlob = (value: unknown): NiftiFileBlob | null => {
  const obj = asObject(value);
  const base64Data = asString(obj?.base64Data);
  if (!base64Data) {
    return null;
  }

  return {
    filename: asString(obj?.filename) ?? "file.nii.gz",
    mimeType: asString(obj?.mimeType) ?? "application/gzip",
    sizeBytes: asNumber(obj?.sizeBytes) ?? 0,
    base64Data,
  };
};

export const inferFileNameFromPath = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const parts = value
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return null;
  }

  const fileName = parts[parts.length - 1] ?? null;
  return fileName && fileName.length > 0 ? fileName : null;
};

const getFirstDefinedValue = (record: InferenceRecord | null, keys: string[]): unknown => {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined) {
      return value;
    }
  }

  return null;
};

const normalizeRequiredLocalizedJsonValue = (
  baseValue: unknown,
  norwegianValue: unknown,
  fallbackEnglish: string,
  fallbackNorwegian?: string,
): LocalizedTextValue => {
  const merged =
    mergeLocalizedText(baseValue, norwegianValue) ??
    mergeLocalizedText(fallbackEnglish, fallbackNorwegian ?? fallbackEnglish);

  return toStoredLocalizedJsonValue(merged) ?? fallbackEnglish;
};

const normalizeOptionalLocalizedText = (baseValue: unknown, norwegianValue: unknown): string | null => {
  const merged = mergeLocalizedText(baseValue, norwegianValue);
  if (!merged) {
    return null;
  }

  return toStoredLocalizedText(merged);
};

const normalizeRequiredLocalizedText = (
  baseValue: unknown,
  norwegianValue: unknown,
  fallbackEnglish: string,
  fallbackNorwegian?: string,
): string => {
  const merged =
    mergeLocalizedText(baseValue, norwegianValue) ??
    mergeLocalizedText(fallbackEnglish, fallbackNorwegian ?? fallbackEnglish);

  return toStoredLocalizedText(merged) ?? fallbackEnglish;
};

const parseClassificationItem = (input: unknown): ClassificationItem | null => {
  const item = asObject(input);
  if (!item) {
    return null;
  }

  const side = normalizeRequiredLocalizedJsonValue(
    getFirstDefinedValue(item, ["side", "region"]),
    getFirstDefinedValue(item, ["sideNo", "side_no", "regionNo", "region_no"]),
    "Primary",
    "Primar",
  );
  const prediction = normalizeRequiredLocalizedJsonValue(
    getFirstDefinedValue(item, ["prediction", "label", "cancerType", "cancer_type"]),
    getFirstDefinedValue(item, ["predictionNo", "prediction_no", "labelNo", "label_no", "cancerTypeNo", "cancer_type_no"]),
    "Unknown",
    "Ukjent",
  );
  const confidence = asNumber(item.confidence) ?? asNumber(item.probability) ?? 0;
  const explanation = normalizeRequiredLocalizedJsonValue(
    getFirstDefinedValue(item, ["explanation", "reasoning", "rationale"]),
    getFirstDefinedValue(item, ["explanationNo", "explanation_no", "reasoningNo", "reasoning_no", "rationaleNo", "rationale_no"]),
    "No explanation provided.",
    "Ingen begrunnelse oppgitt.",
  );

  return {
    side,
    prediction,
    confidence: Math.max(0, Math.min(1, confidence > 1 ? confidence / 100 : confidence)),
    explanation,
  };
};

const extractVisualizationData = (record: InferenceRecord): InferenceRecord | null => {
  const direct = asObject(
    getFirstDefinedValue(record, [
      "visualizationData",
      "visualization_data",
      "visualization",
      "plotVisualization",
      "plot_visualization",
      "overlayVisualization",
      "overlay_visualization",
    ]),
  );

  if (direct && Array.isArray(direct.slices)) {
    return direct;
  }

  const legacySegmentation = asObject(
    getFirstDefinedValue(record, ["segmentationData", "segmentation", "segmentation_output"]),
  );
  const legacyVisualization = asObject(legacySegmentation?.visualization);

  if (legacyVisualization && Array.isArray(legacyVisualization.slices)) {
    return legacyVisualization;
  }

  return null;
};

export const normalizeInferenceResult = (payload: unknown): NormalizedInferenceResult => {
  const data = asObject(payload) ?? {};

  const classificationsInput = Array.isArray(data.classifications)
    ? data.classifications
    : Array.isArray(data.classificationResults)
      ? data.classificationResults
      : [];

  const classifications = classificationsInput
    .map((item) => parseClassificationItem(item))
    .filter((item): item is ClassificationItem => Boolean(item));

  const topClassification = asObject(data.classification);

  const inferredCancerType = normalizeOptionalLocalizedText(
    getFirstDefinedValue(data, ["cancerType", "classificationType"]) ??
      getFirstDefinedValue(topClassification, ["label", "prediction", "cancerType", "cancer_type"]) ??
      (classifications[0]?.prediction ?? null),
    getFirstDefinedValue(data, ["cancerTypeNo", "cancer_type_no", "classificationTypeNo", "classification_type_no"]) ??
      getFirstDefinedValue(topClassification, ["labelNo", "label_no", "predictionNo", "prediction_no", "cancerTypeNo", "cancer_type_no"]),
  );

  const inferredReasoning = normalizeOptionalLocalizedText(
    getFirstDefinedValue(data, ["reasoning", "rationale"]) ??
      getFirstDefinedValue(topClassification, ["reasoning", "explanation", "rationale"]) ??
      (classifications[0]?.explanation ?? null),
    getFirstDefinedValue(data, ["reasoningNo", "reasoning_no", "rationaleNo", "rationale_no"]) ??
      getFirstDefinedValue(topClassification, ["reasoningNo", "reasoning_no", "explanationNo", "explanation_no", "rationaleNo", "rationale_no"]),
  );

  const inferredConfidence =
    asNumber(data.classificationConfidence) ??
    asNumber(topClassification?.confidence) ??
    (classifications[0]?.confidence ?? null);

  const normalizedConfidence =
    inferredConfidence === null
      ? null
      : Math.max(0, Math.min(1, inferredConfidence > 1 ? inferredConfidence / 100 : inferredConfidence));

  const plotFilePath = asString(
    getFirstDefinedValue(data, [
      "plotFilePath",
      "plot_file_path",
      "plottedNiftiFilePath",
      "plotted_nifti_file_path",
      "combinedNiftiFilePath",
      "combined_nifti_file_path",
      "visualizationFilePath",
      "visualization_file_path",
    ]),
  );
  const plotFileName = asString(
    getFirstDefinedValue(data, [
      "plotFileName",
      "plot_file_name",
      "plottedNiftiFileName",
      "plotted_nifti_file_name",
      "combinedNiftiFileName",
      "combined_nifti_file_name",
      "visualizationFileName",
      "visualization_file_name",
    ]),
  );
  const plotFileSizeBytes = asNumber(
    getFirstDefinedValue(data, [
      "plotFileSizeBytes",
      "plot_file_size_bytes",
      "plottedNiftiFileSizeBytes",
      "plotted_nifti_file_size_bytes",
      "combinedNiftiFileSizeBytes",
      "combined_nifti_file_size_bytes",
      "visualizationFileSizeBytes",
      "visualization_file_size_bytes",
    ]),
  );
  const plotFileMimeType = asString(
    getFirstDefinedValue(data, [
      "plotFileMimeType",
      "plot_file_mime_type",
      "plottedNiftiFileMimeType",
      "plotted_nifti_file_mime_type",
      "combinedNiftiFileMimeType",
      "combined_nifti_file_mime_type",
      "visualizationFileMimeType",
      "visualization_file_mime_type",
    ]),
  );
  const gradCamPlotFilePath = asString(
    getFirstDefinedValue(data, [
      "gradCamPlotFilePath",
      "grad_cam_plot_file_path",
      "gradCamFilePath",
      "grad_cam_file_path",
      "gradCamNiftiFilePath",
      "grad_cam_nifti_file_path",
    ]),
  );
  const gradCamPlotFileName = asString(
    getFirstDefinedValue(data, [
      "gradCamPlotFileName",
      "grad_cam_plot_file_name",
      "gradCamFileName",
      "grad_cam_file_name",
      "gradCamNiftiFileName",
      "grad_cam_nifti_file_name",
    ]),
  );
  const gradCamPlotFileSizeBytes = asNumber(
    getFirstDefinedValue(data, [
      "gradCamPlotFileSizeBytes",
      "grad_cam_plot_file_size_bytes",
      "gradCamFileSizeBytes",
      "grad_cam_file_size_bytes",
      "gradCamNiftiFileSizeBytes",
      "grad_cam_nifti_file_size_bytes",
    ]),
  );
  const gradCamPlotFileMimeType = asString(
    getFirstDefinedValue(data, [
      "gradCamPlotFileMimeType",
      "grad_cam_plot_file_mime_type",
      "gradCamFileMimeType",
      "grad_cam_file_mime_type",
      "gradCamNiftiFileMimeType",
      "grad_cam_nifti_file_mime_type",
    ]),
  );
  const segmentationRoiPlotFilePath = asString(
    getFirstDefinedValue(data, [
      "segmentationRoiPlotFilePath",
      "segmentation_roi_plot_file_path",
      "segmentationPlotFilePath",
      "segmentation_plot_file_path",
      "segmentationRoiFilePath",
      "segmentation_roi_file_path",
    ]),
  );
  const segmentationRoiPlotFileName = asString(
    getFirstDefinedValue(data, [
      "segmentationRoiPlotFileName",
      "segmentation_roi_plot_file_name",
      "segmentationPlotFileName",
      "segmentation_plot_file_name",
      "segmentationRoiFileName",
      "segmentation_roi_file_name",
    ]),
  );
  const segmentationRoiPlotFileSizeBytes = asNumber(
    getFirstDefinedValue(data, [
      "segmentationRoiPlotFileSizeBytes",
      "segmentation_roi_plot_file_size_bytes",
      "segmentationPlotFileSizeBytes",
      "segmentation_plot_file_size_bytes",
      "segmentationRoiFileSizeBytes",
      "segmentation_roi_file_size_bytes",
    ]),
  );
  const segmentationRoiPlotFileMimeType = asString(
    getFirstDefinedValue(data, [
      "segmentationRoiPlotFileMimeType",
      "segmentation_roi_plot_file_mime_type",
      "segmentationPlotFileMimeType",
      "segmentation_plot_file_mime_type",
      "segmentationRoiFileMimeType",
      "segmentation_roi_file_mime_type",
    ]),
  );
  const visualizationData = extractVisualizationData(data);

  const niftiFiles = asObject(asObject(getFirstDefinedValue(data, ["segmentationData"]))?.niftiFiles);
  const plainCtFile = parseNiftiFileBlob(niftiFiles?.plainCt);
  const gradCamFile = parseNiftiFileBlob(niftiFiles?.gradCam);
  const segmentationRoiFile = parseNiftiFileBlob(niftiFiles?.segmentationRoi);

  const proposedTnmStage = normalizeOptionalLocalizedText(
    getFirstDefinedValue(data, ["proposedTnmStage", "tnmStage"]) ?? getFirstDefinedValue(asObject(data.tnm), ["stage"]),
    getFirstDefinedValue(data, ["proposedTnmStageNo", "proposed_tnm_stage_no", "tnmStageNo", "tnm_stage_no"]) ??
      getFirstDefinedValue(asObject(data.tnm), ["stageNo", "stage_no"]),
  );

  const inferredCancerTypeEn = resolveLocalizedText(inferredCancerType, "en");
  const inferredCancerTypeNo = resolveLocalizedText(inferredCancerType, "no");
  const confidenceSuffixEn =
    normalizedConfidence !== null ? ` (${Math.round(normalizedConfidence * 100)}% confidence)` : "";
  const confidenceSuffixNo =
    normalizedConfidence !== null ? ` (${Math.round(normalizedConfidence * 100)}% sannsynlighet)` : "";

  const findings = normalizeRequiredLocalizedText(
    getFirstDefinedValue(data, ["findings", "summary"]),
    getFirstDefinedValue(data, ["findingsNo", "findings_no", "summaryNo", "summary_no"]),
    inferredCancerTypeEn
      ? `Model predicts ${inferredCancerTypeEn}${confidenceSuffixEn}.`
      : "Inference completed.",
    inferredCancerTypeNo
      ? `Modellen predikerer ${inferredCancerTypeNo}${confidenceSuffixNo}.`
      : "Inferens fullfort.",
  );

  const hasInferenceOutput =
    classifications.length > 0 ||
    Boolean(inferredCancerType) ||
    normalizedConfidence !== null ||
    Boolean(inferredReasoning) ||
    Boolean(proposedTnmStage) ||
    Boolean(plotFilePath) ||
    Boolean(plotFileName) ||
    Boolean(gradCamPlotFilePath) ||
    Boolean(gradCamPlotFileName) ||
    Boolean(segmentationRoiPlotFilePath) ||
    Boolean(segmentationRoiPlotFileName) ||
    Boolean(plainCtFile) ||
    Boolean(visualizationData);

  return {
    findings,
    classifications,
    plotFilePath,
    plotFileName,
    plotFileSizeBytes,
    plotFileMimeType,
    gradCamPlotFilePath,
    gradCamPlotFileName,
    gradCamPlotFileSizeBytes,
    gradCamPlotFileMimeType,
    segmentationRoiPlotFilePath,
    segmentationRoiPlotFileName,
    segmentationRoiPlotFileSizeBytes,
    segmentationRoiPlotFileMimeType,
    plainCtFile,
    gradCamFile,
    segmentationRoiFile,
    visualizationData,
    cancerType: inferredCancerType,
    classificationConfidence: normalizedConfidence,
    reasoning: inferredReasoning,
    proposedTnmStage,
    status: hasInferenceOutput ? "Completed" : "In Review",
  };
};

export type UploadedNiftiFile = { path: string; name: string; sizeBytes: number; mimeType: string };

export const uploadNiftiFile = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  analysisId: string,
  file: NiftiFileBlob | null,
): Promise<UploadedNiftiFile | null> => {
  if (!file) {
    return null;
  }

  const buffer = Buffer.from(file.base64Data, "base64");
  const objectPath = `${userId}/${analysisId}/${sanitizeFileName(file.filename)}`;

  const { data, error } = await supabase.storage
    .from("study-files")
    .upload(objectPath, buffer, { contentType: file.mimeType, upsert: true });

  if (error || !data) {
    console.error(`Failed to upload ${file.filename} to Storage:`, error);
    return null;
  }

  return { path: data.path, name: file.filename, sizeBytes: file.sizeBytes, mimeType: file.mimeType };
};
