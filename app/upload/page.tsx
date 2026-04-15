"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";

const MAX_BATCH_FILES = 10;
const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

type BatchItemStatus = "pending" | "processing" | "completed" | "failed";

type BatchItem = {
  fileName: string;
  status: BatchItemStatus;
  analysisId?: string;
  error?: string;
};

export default function UploadPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [fileError, setFileError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modality, setModality] = useState("CT Chest");
  const [selectedFilesCount, setSelectedFilesCount] = useState(0);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);

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

  const updateBatchItem = (index: number, next: Partial<BatchItem>) => {
    setBatchItems((previous) =>
      previous.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return { ...item, ...next };
      }),
    );
  };

  const getStatusBadgeVariant = (status: BatchItemStatus) => {
    if (status === "completed") {
      return "default" as const;
    }

    if (status === "failed") {
      return "destructive" as const;
    }

    if (status === "processing") {
      return "secondary" as const;
    }

    return "outline" as const;
  };

  const getStatusLabel = (status: BatchItemStatus) => {
    if (status === "completed") {
      return t.upload.batchStatusCompleted;
    }

    if (status === "failed") {
      return t.upload.batchStatusFailed;
    }

    if (status === "processing") {
      return t.upload.batchStatusProcessing;
    }

    return t.upload.batchStatusPending;
  };

  const completedCount = batchItems.filter((item) => item.status === "completed").length;
  const failedCount = batchItems.filter((item) => item.status === "failed").length;
  const processedCount = completedCount + failedCount;

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand via-third to-fifth p-6 text-white shadow-sm sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(77,255,246,0.22),transparent_40%)]" />
        <div className="relative z-10 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fourth/90">{t.upload.sectionLabel}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{t.upload.title}</h1>
          <p className="text-sm text-white/90">
            {t.upload.subtitle}
          </p>
        </div>
      </div>

      <Card className="border border-brand/20 ring-0 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>{t.upload.reportDetails}</CardTitle>
          <CardDescription>
            {t.upload.reportDetailsDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const fileInput = form.elements.namedItem("studyFile") as HTMLInputElement | null;
            const selectedFiles = Array.from(fileInput?.files ?? []);

            if (!form.checkValidity()) {
              return;
            }

            if (!selectedFiles.length) {
              setFileError(t.upload.batchNoFilesError);
              return;
            }

            if (selectedFiles.length > MAX_BATCH_FILES) {
              setFileError(t.upload.batchTooManyFilesError);
              return;
            }

            const invalidFiles = selectedFiles.filter((file) => !isAllowedFile(file.name, file.type));
            if (invalidFiles.length) {
              setFileError(t.upload.fileTypeError);
              return;
            }

            const oversizedFiles = selectedFiles.filter((file) => file.size > MAX_UPLOAD_SIZE_BYTES);
            if (oversizedFiles.length) {
              setFileError(t.upload.fileTooLargeError);
              return;
            }

            setFileError("");
            setIsSubmitting(true);
            setSubmitError("");

            const patientId = (form.elements.namedItem("patientId") as HTMLInputElement | null)?.value.trim() ?? "";
            const patientName =
              (form.elements.namedItem("patientName") as HTMLInputElement | null)?.value.trim() ?? "";

            const initialBatchItems = selectedFiles.map((file) => ({
              fileName: file.name,
              status: "pending" as const,
            }));
            setBatchItems(initialBatchItems);

            let firstSuccessfulAnalysisId: string | null = null;
            let successfulCount = 0;
            let failedCountLocal = 0;

            for (const [index, file] of selectedFiles.entries()) {
              updateBatchItem(index, { status: "processing", error: undefined, analysisId: undefined });

              const payload = new FormData();
              payload.append("patientId", patientId);
              payload.append("patientName", patientName);
              payload.append("modality", modality);
              payload.append("studyFile", file, file.name);

              try {
                const response = await fetch("/api/reports", {
                  method: "POST",
                  body: payload,
                });

                const result = (await response.json().catch(() => null)) as {
                  id?: string;
                  error?: string;
                } | null;

                if (!response.ok || !result?.id) {
                  failedCountLocal += 1;
                  updateBatchItem(index, {
                    status: "failed",
                    error: result?.error ?? t.upload.submitError,
                  });
                } else {
                  if (!firstSuccessfulAnalysisId) {
                    firstSuccessfulAnalysisId = result.id;
                  }

                  successfulCount += 1;
                  updateBatchItem(index, {
                    status: "completed",
                    analysisId: result.id,
                    error: undefined,
                  });
                }
              } catch (error) {
                failedCountLocal += 1;
                const message = error instanceof Error ? error.message : t.upload.submitError;
                updateBatchItem(index, {
                  status: "failed",
                  error: message,
                });
              } finally {
                router.refresh();
              }
            }

            setIsSubmitting(false);

            if (successfulCount === 0) {
              setSubmitError(t.upload.batchAllFailedError);
              return;
            }

            if (failedCountLocal > 0) {
              setSubmitError(t.upload.batchPartialFailureError);
            }

            if (selectedFiles.length === 1 && firstSuccessfulAnalysisId) {
              router.push(`/analysis/${firstSuccessfulAnalysisId}`);
              router.refresh();
            }
          }}
        >
          <div className="grid gap-1">
            <Label htmlFor="patient-id">{t.upload.patientId}</Label>
            <Input
              id="patient-id"
              name="patientId"
              placeholder={t.upload.patientIdPlaceholder}
              required
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="patient-name">{t.upload.patientName}</Label>
            <Input
              id="patient-name"
              name="patientName"
              placeholder={t.upload.patientNamePlaceholder}
              required
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="modality">{t.upload.modality}</Label>
            <input type="hidden" name="modality" value={modality} />
            <Select
              value={modality}
              onValueChange={(value) => setModality(value ?? "CT Chest")}
            >
              <SelectTrigger id="modality" className="h-10 w-full cursor-pointer">
                <SelectValue placeholder={t.upload.selectModality} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CT Chest">{t.upload.chestCt}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 grid gap-1">
            <Label htmlFor="study-file">{t.upload.fileLabel}</Label>
            <input
              id="study-file"
              name="studyFile"
              type="file"
              multiple
              accept=".dcm,.dicom,.nii,.nii.gz,.gz,application/dicom,application/gzip,application/x-gzip,application/octet-stream"
              className="file:text-foreground rounded-md border border-dashed border-input px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 dark:bg-input/30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:file:bg-muted/30"
              disabled={isSubmitting}
              onChange={(event) => {
                const files = Array.from(event.currentTarget.files ?? []);
                setSelectedFilesCount(files.length);
                setBatchItems([]);

                if (!files.length) {
                  setFileError("");
                  return;
                }

                if (files.length > MAX_BATCH_FILES) {
                  setFileError(t.upload.batchTooManyFilesError);
                  event.currentTarget.value = "";
                  setSelectedFilesCount(0);
                  return;
                }

                const invalidFiles = files.filter((file) => !isAllowedFile(file.name, file.type));
                if (invalidFiles.length) {
                  setFileError(t.upload.fileTypeError);
                  event.currentTarget.value = "";
                  setSelectedFilesCount(0);
                  return;
                }

                const oversizedFiles = files.filter((file) => file.size > MAX_UPLOAD_SIZE_BYTES);
                if (oversizedFiles.length) {
                  setFileError(t.upload.fileTooLargeError);
                  event.currentTarget.value = "";
                  setSelectedFilesCount(0);
                  return;
                }

                setFileError("");
              }}
              required
            />
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {t.upload.batchLimitHelp}
              {selectedFilesCount > 0 ? ` ${t.upload.batchSelectedPrefix} ${selectedFilesCount}.` : ""}
            </p>
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

          {batchItems.length > 0 ? (
            <div className="sm:col-span-2 space-y-3 rounded-md border border-brand/20 bg-brand/5 p-3" aria-live="polite">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {t.upload.batchProgressTitle} {processedCount}/{batchItems.length}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {t.upload.batchProgressSummary} {completedCount} {t.upload.batchCompletedLabel} / {failedCount} {t.upload.batchFailedLabel}
              </p>
              <ul className="space-y-2 text-sm">
                {batchItems.map((item, index) => (
                  <li
                    key={`${item.fileName}-${index}`}
                    className="rounded border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.fileName}</span>
                      <Badge variant={getStatusBadgeVariant(item.status)}>{getStatusLabel(item.status)}</Badge>
                    </div>
                    {item.analysisId ? (
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        <Link href={`/analysis/${item.analysisId}`} className={cn(buttonVariants({ variant: "link" }), "h-auto p-0 text-xs")}>{t.upload.batchOpenAnalysis}</Link>
                      </p>
                    ) : null}
                    {item.error ? <p className="mt-1 text-xs text-destructive">{item.error}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="sm:col-span-2 h-10 bg-brand text-white hover:bg-third"
          >
            {isSubmitting ? t.upload.batchSubmitting : t.upload.submit}
          </Button>
        </form>
        </CardContent>
      </Card>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {t.upload.existingAnalysesPrompt}{" "}
        <Link href="/analyses" className={cn(buttonVariants({ variant: "link" }), "h-auto p-0 align-baseline")}>{t.upload.existingAnalysesLink}</Link>.
      </p>
    </section>
  );
}
