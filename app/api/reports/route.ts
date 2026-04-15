import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_INFERENCE_DURATION_MS = 120_000;

type AnalysisStatus = "Completed" | "In Review";

type ClassificationItem = {
  side: string;
  prediction: string;
  confidence: number;
  explanation: string;
};

type InferenceRecord = Record<string, unknown>;

type NormalizedInferenceResult = {
  findings: string;
  classifications: ClassificationItem[];
  segmentationData: unknown;
  cancerType: string | null;
  classificationConfidence: number | null;
  reasoning: string | null;
  proposedTnmStage: string | null;
  status: AnalysisStatus;
};

const isAllowedFile = (fileName: string, mimeType?: string) => {
  const lower = fileName.trim().toLowerCase();
  const validExtension = /(\.dcm|\.dicom|\.nii|\.nii\.gz)$/i.test(lower);
  const validMime =
    mimeType === "application/dicom" ||
    mimeType === "application/gzip" ||
    mimeType === "application/x-gzip" ||
    mimeType === "application/octet-stream";

  return validExtension || validMime;
};

const sanitizeFileName = (fileName: string) => fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

const asString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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

const parseClassificationItem = (input: unknown): ClassificationItem | null => {
  const item = asObject(input);
  if (!item) {
    return null;
  }

  const side = asString(item.side) ?? asString(item.region) ?? "Primary";
  const prediction =
    asString(item.prediction) ?? asString(item.label) ?? asString(item.cancerType) ?? "Unknown";
  const confidence = asNumber(item.confidence) ?? asNumber(item.probability) ?? 0;
  const explanation =
    asString(item.explanation) ?? asString(item.reasoning) ?? asString(item.rationale) ?? "";

  return {
    side,
    prediction,
    confidence: Math.max(0, Math.min(1, confidence > 1 ? confidence / 100 : confidence)),
    explanation,
  };
};

const normalizeInferenceResult = (payload: unknown): NormalizedInferenceResult => {
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

  const inferredCancerType =
    asString(data.cancerType) ??
    asString(data.classificationType) ??
    asString(topClassification?.label) ??
    asString(topClassification?.prediction) ??
    (classifications[0]?.prediction ?? null);

  const inferredReasoning =
    asString(data.reasoning) ??
    asString(data.rationale) ??
    asString(topClassification?.reasoning) ??
    asString(topClassification?.explanation) ??
    (classifications[0]?.explanation || null);

  const inferredConfidence =
    asNumber(data.classificationConfidence) ??
    asNumber(topClassification?.confidence) ??
    (classifications[0]?.confidence ?? null);

  const normalizedConfidence =
    inferredConfidence === null
      ? null
      : Math.max(0, Math.min(1, inferredConfidence > 1 ? inferredConfidence / 100 : inferredConfidence));

  const segmentationData =
    data.segmentationData ?? data.segmentation ?? data.segmentationMask ?? data.segmentation_output ?? null;

  const proposedTnmStage =
    asString(data.proposedTnmStage) ?? asString(data.tnmStage) ?? asString(asObject(data.tnm)?.stage) ?? null;

  const findings =
    asString(data.findings) ??
    asString(data.summary) ??
    (inferredCancerType
      ? `Model predicts ${inferredCancerType}${normalizedConfidence !== null ? ` (${Math.round(normalizedConfidence * 100)}% confidence)` : ""}.`
      : "Inference completed.");

  const hasInferenceOutput =
    classifications.length > 0 ||
    Boolean(inferredCancerType) ||
    normalizedConfidence !== null ||
    Boolean(inferredReasoning) ||
    Boolean(proposedTnmStage) ||
    segmentationData !== null;

  return {
    findings,
    classifications,
    segmentationData,
    cancerType: inferredCancerType,
    classificationConfidence: normalizedConfidence,
    reasoning: inferredReasoning,
    proposedTnmStage,
    status: hasInferenceOutput ? "Completed" : "In Review",
  };
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    const patientId = formData.get("patientId")?.toString().trim() ?? "";
    const patientName = formData.get("patientName")?.toString().trim() ?? "";
    const modality = formData.get("modality")?.toString().trim() ?? "";
    const clinicianEmail = user.email?.trim() ?? "";
    const studyFile = formData.get("studyFile");

    if (!patientId || !patientName || !modality || !(studyFile instanceof File)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!clinicianEmail) {
      return NextResponse.json(
        { error: "Authenticated clinician account must have an email address." },
        { status: 400 },
      );
    }

    if (!isAllowedFile(studyFile.name, studyFile.type)) {
      return NextResponse.json(
        { error: "Only DICOM (.dcm/.dicom) and NIfTI (.nii/.nii.gz) files are allowed." },
        { status: 400 },
      );
    }

    if (studyFile.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Maximum allowed size is 25 MB." },
        { status: 400 },
      );
    }

    const analysisId = `A-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const inferenceApiUrl = process.env.INFERENCE_API_URL?.trim();
    if (!inferenceApiUrl) {
      return NextResponse.json(
        { error: "Inference backend is not configured. Set INFERENCE_API_URL." },
        { status: 500 },
      );
    }

    const inferencePayload = new FormData();
    inferencePayload.append("analysisId", analysisId);
    inferencePayload.append("patientId", patientId);
    inferencePayload.append("patientName", patientName);
    inferencePayload.append("modality", modality);
    inferencePayload.append("clinicianEmail", clinicianEmail);
    inferencePayload.append("studyFile", studyFile, studyFile.name);

    const inferenceHeaders: HeadersInit = {};
    if (process.env.INFERENCE_API_KEY?.trim()) {
      inferenceHeaders["Authorization"] = `Bearer ${process.env.INFERENCE_API_KEY.trim()}`;
    }

    const inferenceResponse = await fetch(inferenceApiUrl, {
      method: "POST",
      headers: inferenceHeaders,
      body: inferencePayload,
      signal: AbortSignal.timeout(MAX_INFERENCE_DURATION_MS),
      cache: "no-store",
    });

    const inferenceResult = (await inferenceResponse.json().catch(() => null)) as
      | { error?: string }
      | InferenceRecord
      | null;

    if (!inferenceResponse.ok || !inferenceResult) {
      const inferenceError =
        inferenceResult && "error" in inferenceResult && typeof inferenceResult.error === "string"
          ? inferenceResult.error
          : "Model inference failed for the uploaded study.";

      return NextResponse.json({ error: inferenceError }, { status: 502 });
    }

    const normalizedInference = normalizeInferenceResult(inferenceResult);

    // Sensitive scan bytes are used only in-memory for inference and are not persisted for privacy reasons. We store metadata and inference results in the database, but not the raw file.
    const safeFileName = sanitizeFileName(studyFile.name);

    const { error: rpcError } = await supabase.rpc("create_analysis_atomic", {
      p_analysis_id: analysisId,
      p_patient_id: patientId,
      p_patient_name: patientName,
      p_modality: modality,
      p_study_file_path: null,
      p_study_file_name: safeFileName,
      p_study_file_size_bytes: studyFile.size,
      p_study_file_mime_type: studyFile.type || null,
      p_status: normalizedInference.status,
      p_findings: normalizedInference.findings,
      p_classifications: normalizedInference.classifications,
      p_segmentation_data: normalizedInference.segmentationData,
      p_cancer_type: normalizedInference.cancerType,
      p_classification_confidence: normalizedInference.classificationConfidence,
      p_reasoning: normalizedInference.reasoning,
      p_proposed_tnm_stage: normalizedInference.proposedTnmStage,
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({ id: analysisId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}