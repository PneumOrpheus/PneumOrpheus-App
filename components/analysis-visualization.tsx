"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type VisualizationSlice = {
  sliceIndex: number;
  imageDataUrl: string;
  hasMask?: boolean;
  maskCoverage?: number;
};

type VisualizationPayload = {
  imageFormat?: string;
  totalSlices?: number;
  defaultSliceIndex?: number;
  slices: VisualizationSlice[];
};

type Props = {
  visualization: VisualizationPayload;
  cancerType: string | null;
  classificationConfidence: number | null;
  proposedTnmStage: string | null;
  labels: {
    title: string;
    sliceSelector: string;
    slice: string;
    mask: string;
    detected: string;
    none: string;
    classification: string;
    subtype: string;
    confidence: string;
    proposedTnm: string;
  };
};

export function AnalysisVisualization({
  visualization,
  cancerType,
  classificationConfidence,
  proposedTnmStage,
  labels,
}: Props) {
  const slices = useMemo(() => visualization.slices ?? [], [visualization.slices]);

  const defaultSliderIndex = useMemo(() => {
    if (!slices.length) {
      return 0;
    }

    if (typeof visualization.defaultSliceIndex === "number") {
      const match = slices.findIndex((slice) => slice.sliceIndex === visualization.defaultSliceIndex);
      if (match >= 0) {
        return match;
      }
    }

    return Math.floor(slices.length / 2);
  }, [slices, visualization.defaultSliceIndex]);

  const [currentIndex, setCurrentIndex] = useState(defaultSliderIndex);
  const currentSlice = slices[currentIndex] ?? null;

  if (!currentSlice) {
    return null;
  }

  return (
    <section className="mt-5 space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
      <h3 className="text-base font-semibold">{labels.title}</h3>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
          <Image
            src={currentSlice.imageDataUrl}
            alt={`Processed NIfTI slice ${currentSlice.sliceIndex}`}
            className="h-auto w-full rounded-md border border-zinc-200 bg-zinc-50 object-contain dark:border-zinc-700 dark:bg-zinc-900"
            width={640}
            height={640}
            unoptimized
          />

          <div className="mt-3 space-y-2">
            <input
              type="range"
              min={0}
              max={Math.max(0, slices.length - 1)}
              value={currentIndex}
              onChange={(event) => setCurrentIndex(Number(event.target.value))}
              className="w-full"
              aria-label={labels.sliceSelector}
            />

            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                {labels.slice} {currentSlice.sliceIndex}
                {typeof visualization.totalSlices === "number" ? ` / ${visualization.totalSlices - 1}` : ""}
              </span>
              <span>
                {labels.mask}: {currentSlice.hasMask ? labels.detected : labels.none}
                {typeof currentSlice.maskCoverage === "number"
                  ? ` (${Math.round(currentSlice.maskCoverage * 100)}%)`
                  : ""}
              </span>
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-700">
          <h4 className="text-sm font-semibold">{labels.classification}</h4>
          <dl className="mt-2 space-y-3">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">{labels.subtype}</dt>
              <dd className="mt-1 font-medium">{cancerType ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">{labels.confidence}</dt>
              <dd className="mt-1 font-medium">
                {classificationConfidence !== null ? `${Math.round(classificationConfidence * 100)}%` : "-"}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      <div className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-700">
        <p className="text-zinc-500 dark:text-zinc-400">{labels.proposedTnm}</p>
        <p className="mt-1 font-medium">{proposedTnmStage ?? "-"}</p>
      </div>
    </section>
  );
}
