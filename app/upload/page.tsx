"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function UploadPage() {
  const router = useRouter();
  const [fileError, setFileError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modality, setModality] = useState("CT Chest");

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

      <Card className="border border-brand/20 ring-0 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
          <CardDescription>
            Provide patient metadata and upload a compatible chest study file. All patient information is anonymized, securely stored and handled in accordance with our clinical data policy.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
          <div className="grid gap-1">
            <Label htmlFor="patient-id">Patient ID</Label>
            <Input
              id="patient-id"
              name="patientId"
              placeholder="P-2001"
              required
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="patient-name">Patient Name</Label>
            <Input
              id="patient-name"
              name="patientName"
              placeholder="John Doe"
              required
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="modality">Study Modality</Label>
            <input type="hidden" name="modality" value={modality} />
            <Select
              value={modality}
              onValueChange={(value) => setModality(value ?? "CT Chest")}
            >
              <SelectTrigger id="modality" className="h-10 w-full cursor-pointer">
                <SelectValue placeholder="Select study modality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CT Chest">Chest CT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="clinician-email">Clinician Email</Label>
            <Input
              id="clinician-email"
              name="clinicianEmail"
              type="email"
              autoComplete="email"
              placeholder="clinician@example.com"
              required
            />
          </div>
          <div className="sm:col-span-2 grid gap-1">
            <Label htmlFor="study-file">DICOM / NiFTi file</Label>
            <input
              id="study-file"
              name="studyFile"
              type="file"
              accept=".dcm,.dicom,.nii,.nii.gz,.gz,application/dicom,application/gzip,application/x-gzip,application/octet-stream"
              className="file:text-foreground rounded-md border border-dashed border-input px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 dark:bg-input/30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:file:bg-muted/30"
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
          </div>

          {fileError ? (
            <p className="sm:col-span-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {fileError}
            </p>
          ) : null}

          {submitError ? (
            <p className="sm:col-span-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="sm:col-span-2 h-10 bg-brand text-white hover:bg-third"
          >
            {isSubmitting ? "Submitting..." : "Upload and Create Report"}
          </Button>
        </form>
        </CardContent>
      </Card>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Need historical reports first? Browse <Link href="/analyses" className={cn(buttonVariants({ variant: "link" }), "h-auto p-0 align-baseline")}>existing analyses</Link>.
      </p>
    </section>
  );
}
