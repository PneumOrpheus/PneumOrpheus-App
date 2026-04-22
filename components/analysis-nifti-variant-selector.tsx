"use client";

import { useMemo, useState } from "react";
import { NiftiStorageVisualization } from "@/components/nifti-storage-visualization";
import { Button } from "@/components/ui/button";
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
  viewOptionsTitle?: string;
  viewOptionsDescription?: string;
  invertSliceIndexLabel?: string;
  sliceIndexInvertedLabel?: string;
  viewPlaneTitle?: string;
  axialPlaneLabel?: string;
  sagittalPlaneLabel?: string;
  coronalPlaneLabel?: string;
};

type ViewPlane = "axial" | "sagittal" | "coronal";

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
  const [invertSliceDirection, setInvertSliceDirection] = useState(false);
  const [viewPlane, setViewPlane] = useState<ViewPlane>("axial");

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

      <div>
        <NiftiStorageVisualization
          plotFilePath={selectedOption.plotFilePath}
          signedFileUrl={selectedOption.signedFileUrl}
          variantId={selectedOption.id}
          invertSliceDirection={invertSliceDirection}
          viewPlane={viewPlane}
          prefetchTargets={prefetchTargets}
          labels={labels}
        />

        <section className="mt-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {labels.viewOptionsTitle ?? "View options"}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {labels.viewOptionsDescription ?? "Adjust how image slices are navigated in all variants."}
            </p>
          </div>

          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {labels.viewPlaneTitle ?? "View plane"}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {([
                { id: "axial" as const, label: labels.axialPlaneLabel ?? "Axial" },
                { id: "sagittal" as const, label: labels.sagittalPlaneLabel ?? "Sagittal" },
                { id: "coronal" as const, label: labels.coronalPlaneLabel ?? "Coronal" },
              ] as const).map((plane) => {
                const isActive = viewPlane === plane.id;

                return (
                  <Button
                    key={plane.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setViewPlane(plane.id)}
                    className={cn(
                      "w-full border-brand/50",
                      isActive
                        ? "bg-brand text-white hover:bg-third hover:text-white text-lg"
                        : "text-brand hover:bg-brand/10 dark:text-fourth dark:hover:bg-brand/20 text-lg",
                    )}
                  >
                    {plane.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setInvertSliceDirection((previous) => !previous)}
            className={cn(
              "mt-3 w-full border-brand/50",
              invertSliceDirection
                ? "bg-brand text-white hover:bg-third hover:text-white text-lg"
                : "text-brand hover:bg-brand/10 dark:text-fourth dark:hover:bg-brand/20 text-lg",
            )}
          >
            {invertSliceDirection
              ? (labels.sliceIndexInvertedLabel ?? "Slice index inverted")
              : (labels.invertSliceIndexLabel ?? "Invert slice index")}
          </Button>
        </section>
      </div>
    </div>
  );
}
