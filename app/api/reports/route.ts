import { createClient } from "@/utils/supabase/server";
import { isAllowedFile, sanitizeFileName } from "@/lib/inference-normalization";
import { NextResponse } from "next/server";

const MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024;
const MAX_INFERENCE_ACCEPT_DURATION_MS = 180_000;

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
        { error: "File is too large. Maximum allowed size is 500 MB." },
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

    let inferenceResponse: Response;
    try {
      inferenceResponse = await fetch(inferenceApiUrl, {
        method: "POST",
        headers: inferenceHeaders,
        body: inferencePayload,
        signal: AbortSignal.timeout(MAX_INFERENCE_ACCEPT_DURATION_MS),
        cache: "no-store",
      });
    } catch {
      // Network-level failure transferring the file to pneumorpheus-server
      // (connection reset, timed out, etc.) rather than an HTTP error
      // response — most commonly the shared B1 instance being too busy with
      // a prior background job to accept a large upload in time.
      return NextResponse.json(
        {
          error:
            "Could not reach the inference service while uploading the study — it may be busy processing another study. Please try again shortly.",
        },
        { status: 503 },
      );
    }

    const inferenceResult = (await inferenceResponse.json().catch(() => null)) as
      | { error?: string }
      | Record<string, unknown>
      | null;

    if (!inferenceResponse.ok || !inferenceResult) {
      const inferenceError =
        inferenceResult && "error" in inferenceResult && typeof inferenceResult.error === "string"
          ? inferenceResult.error
          : "Model inference failed for the uploaded study.";

      return NextResponse.json({ error: inferenceError }, { status: 502 });
    }

    // Sensitive scan bytes are used only in-memory for inference and are not persisted for privacy reasons. We store metadata and inference results in the database, but not the raw file.
    const { error: rpcError } = await supabase.rpc("create_analysis_atomic", {
      p_analysis_id: analysisId,
      p_patient_id: patientId,
      p_patient_name: patientName,
      p_modality: modality,
      p_study_file_name: sanitizeFileName(studyFile.name),
      p_study_file_size_bytes: studyFile.size,
      p_study_file_mime_type: studyFile.type || null,
      p_status: "Processing",
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
