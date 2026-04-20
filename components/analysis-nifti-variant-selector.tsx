"use client";

import { useMemo, useState } from "react";
import { NiftiStorageVisualization } from "@/components/nifti-storage-visualization";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

type VisualizationLabels = {
  title: string;
  sliceSelector: string;
  slice: string;
  overlay: string;
  gradCamIntensity?: string;
  detected: string;
  none: string;
  loadingNifti?: string;
  failedNifti?: string;
};

export type NiftiVariantOption = {
  id: "normalCt" | "gradCam" | "segmentationRoi";
  label: string;
  description: string;
  plotFilePath: string;
  plotFileName?: string | null;
  signedFileUrl?: string | null;
};

type Props = {
  options: NiftiVariantOption[];
  labels: VisualizationLabels;
  selectorTitle: string;
  selectorDescription: string;
};

export function AnalysisNiftiVariantSelector({
  options,
  labels,
  selectorTitle,
  selectorDescription,
}: Props) {
  const [selectedOptionId, setSelectedOptionId] = useState<string>(options[0]?.id ?? "");

  const selectedOption = useMemo(
    () => options.find((option) => option.id === selectedOptionId) ?? options[0] ?? null,
    [options, selectedOptionId],
  );

  const prefetchTargets = useMemo(
    () =>
      options
        .filter((option) => option.id !== selectedOption?.id)
        .map((option) => ({
          plotFilePath: option.plotFilePath,
          signedFileUrl: option.signedFileUrl,
        })),
    [options, selectedOption?.id],
  );

  if (!selectedOption) {
    return null;
  }

  return (
    <div className="mt-5 space-y-4">
      <section className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{selectorTitle}</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{selectorDescription}</p>
        </div>

        <RadioGroup
          value={selectedOption.id}
          onValueChange={(value) => {
            if (options.some((option) => option.id === value)) {
              setSelectedOptionId(value);
            }
          }}
          className="space-y-2"
        >
          {options.map((option) => {
            const inputId = `nifti-variant-${option.id}`;
            const isSelected = selectedOption.id === option.id;

            return (
              <div
                key={option.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                  isSelected
                    ? "border-brand/50 bg-brand/5 dark:border-brand/40 dark:bg-brand/10"
                    : "border-zinc-200 dark:border-zinc-700",
                )}
              >
                <RadioGroupItem
                  value={option.id}
                  id={inputId}
                  className="mt-0.5"
                />
                <Label htmlFor={inputId} className="grid cursor-pointer gap-1">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {option.label}
                  </span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">{option.description}</span>
                  {option.plotFileName ? (
                    <span className="text-xs text-zinc-500 dark:text-zinc-500">{option.plotFileName}</span>
                  ) : null}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </section>

      <NiftiStorageVisualization
        plotFilePath={selectedOption.plotFilePath}
        signedFileUrl={selectedOption.signedFileUrl}
        variantId={selectedOption.id}
        prefetchTargets={prefetchTargets}
        labels={labels}
      />
    </div>
  );
}
