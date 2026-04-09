"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UploadPage() {
  const router = useRouter();
  const [fileError, setFileError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand via-third to-fifth p-6 text-white shadow-sm sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(77,255,246,0.22),transparent_40%)]" />
        <div className="relative z-10 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fourth/90">New Report</p>
          <h1 className="text-3xl font-semibold tracking-tight">Create New Analysis</h1>
          <p className="text-sm text-white/90">
            Upload a chest study and register patient metadata to generate a new pulmonary diagnostic report.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-brand/20 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const fileInput = form.elements.namedItem("studyFile") as HTMLInputElement | null;
            const selectedFile = fileInput?.files?.[0] ?? null;

            if (!form.checkValidity()) {
              return;
            }

            if (!selectedFile || !isAllowedFile(selectedFile.name, selectedFile.type)) {
              setFileError("Only DICOM (.dcm/.dicom) and NIfTI (.nii/.nii.gz) files are allowed.");
              return;
            }

            setFileError("");

            setIsSubmitting(true);
            setSubmitError("");

            const payload = new FormData(form);
            const response = await fetch("/api/reports", {
              method: "POST",
              body: payload,
            });

            const result = (await response.json()) as { id?: string; error?: string };

            if (!response.ok || !result.id) {
              setSubmitError(result.error ?? "Failed to submit report.");
              setIsSubmitting(false);
              return;
            }

            router.push(`/analysis/${result.id}`);
            router.refresh();
          }}
        >
          <label className="grid gap-1 text-sm">
            Patient ID
            <input
              name="patientId"
              className="rounded-md border border-sixth bg-transparent px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-100"
              placeholder="P-2004"
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            Patient Name
            <input
              name="patientName"
              className="rounded-md border border-sixth bg-transparent px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-100"
              placeholder="John Doe"
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            Study Modality
            <select name="modality" className="rounded-md border border-sixth bg-transparent px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-100" required>
              <option value="CT Chest">Chest CT</option>
              <option value="Chest PET">Chest PET</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Clinician Email
            <input
              name="clinicianEmail"
              type="email"
              autoComplete="email"
              className="rounded-md border border-sixth bg-transparent px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-100"
              placeholder="clinician@example.com"
              required
            />
          </label>
          <label className="sm:col-span-2 grid gap-1 text-sm">
            DICOM / NiFTi file
            <input
              name="studyFile"
              type="file"
              accept=".dcm,.dicom,.nii,.nii.gz,.gz,application/dicom,application/gzip,application/x-gzip,application/octet-stream"
              className="rounded-md border border-dashed border-sixth px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-100"
              onChange={(event) => {
                const selectedFile = event.currentTarget.files?.[0];
                if (!selectedFile) {
                  setFileError("");
                  return;
                }

                if (!isAllowedFile(selectedFile.name, selectedFile.type)) {
                  setFileError("Only DICOM (.dcm/.dicom) and NIfTI (.nii/.nii.gz) files are allowed.");
                  event.currentTarget.value = "";
                  return;
                }

                setFileError("");
              }}
              required
            />
          </label>

          {fileError ? (
            <p className="sm:col-span-2 rounded-md border border-fifth/40 bg-fifth/10 px-3 py-2 text-sm text-fifth">
              {fileError}
            </p>
          ) : null}

          {submitError ? (
            <p className="sm:col-span-2 rounded-md border border-fifth/40 bg-fifth/10 px-3 py-2 text-sm text-fifth">
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="sm:col-span-2 inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-third disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Submitting..." : "Upload and Create Report"}
          </button>
        </form>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Need historical reports first? Browse <Link href="/analyses" className="underline underline-offset-4">existing analyses</Link>.
      </p>
    </section>
  );
}
