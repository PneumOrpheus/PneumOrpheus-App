import { createClient } from "@/utils/supabase/server";
import type { createClient as createClientType } from "@/utils/supabase/server";
import { inferFileNameFromPath, normalizeInferenceResult, uploadNiftiFile } from "@/lib/inference-normalization";
import { NextResponse } from "next/server";

// Just a status lookup on the inference server, not a wait for the model to
// finish — the job itself keeps running in the background regardless of
// whether/how often this is polled.
const POLL_TIMEOUT_MS = 15_000;

// Finalizing a completed job (uploading the NIfTI overlay volumes to
// Supabase Storage — potentially 1GB+ combined for a large CT once the
// RGB24 GradCAM/segmentation variants are baked in) can itself run well
// past Azure's front-end gateway timeout. It must not block this request's
// response, so it's kicked off detached and tracked here only to stop a
// second poll arriving mid-finalize from starting a duplicate run — this
// process is long-lived (standalone Next.js server, not serverless), so
// work continuing after the response is sent is safe.
const finalizingAnalysisIds = new Set<string>();

async function finalizeCompletedAnalysis(
  supabase: Awaited<ReturnType<typeof createClientType>>,
  userId: string,
  id: string,
  body: Record<string, unknown>,
): Promise<void> {
  const normalizedInference = normalizeInferenceResult(body);

  const persistedGradCamPlotFileName =
    normalizedInference.gradCamPlotFileName ?? inferFileNameFromPath(normalizedInference.gradCamPlotFilePath);
  const persistedSegmentationRoiPlotFileName =
    normalizedInference.segmentationRoiPlotFileName ?? inferFileNameFromPath(normalizedInference.segmentationRoiPlotFilePath);

  const [uploadedPlainCt, uploadedGradCam, uploadedSegmentationRoi] = await Promise.all([
    uploadNiftiFile(supabase, userId, id, normalizedInference.plainCtFile),
    uploadNiftiFile(supabase, userId, id, normalizedInference.gradCamFile),
    uploadNiftiFile(supabase, userId, id, normalizedInference.segmentationRoiFile),
  ]);

  await supabase
    .from("analyses")
    .update({
      status: normalizedInference.status,
      findings: normalizedInference.findings,
      classifications: normalizedInference.classifications,
      // Fall back to `undefined` (omitted from the JSON body, so the
      // placeholder row's original-upload metadata survives) rather than
      // `null` when the pipeline didn't produce a replacement file.
      study_file_path: uploadedPlainCt?.path ?? normalizedInference.plotFilePath ?? undefined,
      study_file_name: uploadedPlainCt?.name ?? normalizedInference.plotFileName ?? undefined,
      study_file_size_bytes: uploadedPlainCt?.sizeBytes ?? normalizedInference.plotFileSizeBytes ?? undefined,
      study_file_mime_type: uploadedPlainCt?.mimeType ?? normalizedInference.plotFileMimeType ?? undefined,
      grad_cam_study_file_path: uploadedGradCam?.path ?? normalizedInference.gradCamPlotFilePath,
      grad_cam_study_file_name: uploadedGradCam?.name ?? persistedGradCamPlotFileName,
      grad_cam_study_file_size_bytes: uploadedGradCam?.sizeBytes ?? normalizedInference.gradCamPlotFileSizeBytes,
      grad_cam_study_file_mime_type: uploadedGradCam?.mimeType ?? normalizedInference.gradCamPlotFileMimeType,
      segmentation_roi_study_file_path: uploadedSegmentationRoi?.path ?? normalizedInference.segmentationRoiPlotFilePath,
      segmentation_roi_study_file_name: uploadedSegmentationRoi?.name ?? persistedSegmentationRoiPlotFileName,
      segmentation_roi_study_file_size_bytes:
        uploadedSegmentationRoi?.sizeBytes ?? normalizedInference.segmentationRoiPlotFileSizeBytes,
      segmentation_roi_study_file_mime_type:
        uploadedSegmentationRoi?.mimeType ?? normalizedInference.segmentationRoiPlotFileMimeType,
      visualization_data: normalizedInference.visualizationData,
      cancer_type: normalizedInference.cancerType,
      classification_confidence: normalizedInference.classificationConfidence,
      reasoning: normalizedInference.reasoning,
      proposed_tnm_stage: normalizedInference.proposedTnmStage,
    })
    .eq("id", id)
    .eq("user_id", userId);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: analysis } = await supabase
    .from("analyses")
    .select("id, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!analysis) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Already terminal from a previous poll — the inference server has since
  // evicted this job from its store, so don't ask it again.
  if (analysis.status !== "Processing") {
    return NextResponse.json({ status: analysis.status });
  }

  const inferenceApiUrl = process.env.INFERENCE_API_URL?.trim();
  if (!inferenceApiUrl) {
    return NextResponse.json({ error: "Inference backend is not configured." }, { status: 500 });
  }

  const inferenceHeaders: HeadersInit = {};
  if (process.env.INFERENCE_API_KEY?.trim()) {
    inferenceHeaders["Authorization"] = `Bearer ${process.env.INFERENCE_API_KEY.trim()}`;
  }

  let statusResponse: Response;
  try {
    statusResponse = await fetch(`${inferenceApiUrl}/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: inferenceHeaders,
      signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    // Transient network hiccup talking to the inference server — stay
    // "Processing" and let the client retry rather than failing the job.
    return NextResponse.json({ status: "Processing" });
  }

  if (statusResponse.status === 404) {
    // Job unknown to the inference server: either it never started, or the
    // server restarted mid-run and lost its in-memory job store. Only mark
    // the row Failed if it's still Processing at the moment of the write, so
    // a second poll racing just behind a first poll's success doesn't
    // clobber a result that already landed.
    const { data: stillProcessing } = await supabase
      .from("analyses")
      .update({ status: "Failed", findings: "Analysis failed: the inference job could not be found." })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "Processing")
      .select("id")
      .maybeSingle();

    return NextResponse.json({ status: stillProcessing ? "Failed" : "Processing" });
  }

  const body = (await statusResponse.json().catch(() => null)) as Record<string, unknown> | null;

  if (!statusResponse.ok || !body) {
    return NextResponse.json({ status: "Processing" });
  }

  if (body.status === "processing") {
    return NextResponse.json({ status: "Processing" });
  }

  if (body.status === "failed") {
    const errorMessage = typeof body.error === "string" ? body.error : "Model inference failed for the uploaded study.";
    await supabase
      .from("analyses")
      .update({ status: "Failed", findings: `Analysis failed: ${errorMessage}` })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "Processing");

    return NextResponse.json({ status: "Failed", error: errorMessage });
  }

  // body.status === "completed": finalize (NIfTI upload + DB update) can run
  // long on a large file, so it's kicked off detached rather than awaited
  // here. The row stays "Processing" until it lands; the client just keeps
  // polling and will see "Completed"/"Failed" once it does.
  if (!finalizingAnalysisIds.has(id)) {
    finalizingAnalysisIds.add(id);
    finalizeCompletedAnalysis(supabase, user.id, id, body)
      .catch((error) => {
        console.error(`Failed to finalize analysis ${id}:`, error);
        return supabase
          .from("analyses")
          .update({ status: "Failed", findings: "Analysis failed while saving results." })
          .eq("id", id)
          .eq("user_id", user.id)
          .eq("status", "Processing");
      })
      .finally(() => {
        finalizingAnalysisIds.delete(id);
      });
  }

  return NextResponse.json({ status: "Processing" });
}
