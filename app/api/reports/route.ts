import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

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
    const clinicianEmail = formData.get("clinicianEmail")?.toString().trim() ?? "";
    const studyFile = formData.get("studyFile");

    if (!patientId || !patientName || !modality || !clinicianEmail || !(studyFile instanceof File)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
    const safeFileName = sanitizeFileName(studyFile.name);
    const storagePath = `${user.id}/${analysisId}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("study-files")
      .upload(storagePath, studyFile, {
        upsert: false,
        contentType: studyFile.type || undefined,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { error: patientError } = await supabase.from("patients").upsert(
      {
        id: patientId,
        user_id: user.id,
        name: patientName,
        email: clinicianEmail,
      },
      { onConflict: "id" },
    );

    if (patientError) {
      return NextResponse.json({ error: patientError.message }, { status: 500 });
    }

    const { error: analysisError } = await supabase.from("analyses").insert({
      id: analysisId,
      user_id: user.id,
      patient_id: patientId,
      patient_name: patientName,
      modality,
      status: "In Review",
      findings: "Report submitted. Processing in progress.",
      classifications: [],
      study_file_path: storagePath,
      study_file_name: studyFile.name,
      study_file_size_bytes: studyFile.size,
      study_file_mime_type: studyFile.type || null,
    });

    if (analysisError) {
      return NextResponse.json({ error: analysisError.message }, { status: 500 });
    }

    return NextResponse.json({ id: analysisId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}