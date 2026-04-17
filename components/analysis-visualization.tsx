"use client";

import { useEffect, useMemo, useState } from "react";

type VisualizationSlice = {
  sliceIndex: number;
  imageDataUrl: string;
  hasOverlay?: boolean;
  overlayCoverage?: number;
};

type VisualizationPayload = {
  imageFormat?: string;
  totalSlices?: number;
  defaultSliceIndex?: number;
  slices: VisualizationSlice[];
};

type Props = {
  visualization: VisualizationPayload;
  labels: {
    title: string;
    sliceSelector: string;
    slice: string;
    overlay: string;
    detected: string;
    none: string;
  };
};

const formatOverlayPercentage = (value: number | undefined): string | null => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return `${(Math.max(0, Math.min(1, value)) * 100).toFixed(1)}%`;
};

const normalizeCoverageToFraction = (value: number | undefined): number | null => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  if (value <= 1) {
    return Math.max(0, value);
  }

  if (value <= 100) {
    return value / 100;
  }

  return 1;
};

export function AnalysisVisualization({
  visualization,
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

  useEffect(() => {
    if (!slices.length) {
      return;
    }

    const preload = async () => {
      const uniqueUrls = [...new Set(slices.map((slice) => slice.imageDataUrl))];

      await Promise.all(
        uniqueUrls.map(
          (url) =>
            new Promise<void>((resolve) => {
              const image = new window.Image();
              image.src = url;

              if (typeof image.decode === "function") {
                image.decode().then(resolve).catch(resolve);
                return;
              }

              image.onload = () => resolve();
              image.onerror = () => resolve();
            }),
        ),
      );
    };

    void preload();
  }, [slices]);

  const currentSlice = slices[currentIndex] ?? null;
  const currentOverlayCoverage = normalizeCoverageToFraction(currentSlice?.overlayCoverage);
  const maxOverlayCoverage = useMemo(() => {
    let max = 0;

    for (const slice of slices) {
      const coverage = normalizeCoverageToFraction(slice.overlayCoverage);
      if (coverage !== null && coverage > max) {
        max = coverage;
      }
    }

    return max;
  }, [slices]);
  const normalizedOverlayCoverage =
    currentOverlayCoverage !== null
      ? (maxOverlayCoverage > 0
          ? Math.min(1, currentOverlayCoverage / maxOverlayCoverage)
          : currentOverlayCoverage)
      : null;
  const overlayPercentage = formatOverlayPercentage(normalizedOverlayCoverage ?? undefined);

  if (!currentSlice) {
    return null;
  }

  return (
    <section className="mt-5 space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
      <h3 className="text-base font-semibold">{labels.title}</h3>

      <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
        <img
          src={currentSlice.imageDataUrl}
          alt={`Combined NIfTI slice ${currentSlice.sliceIndex}`}
          className="h-auto w-full rounded-md border border-zinc-200 bg-zinc-50 object-contain dark:border-zinc-700 dark:bg-zinc-900"
          loading="eager"
          decoding="async"
        />

        <div className="mt-3 space-y-2">
          <input
            type="range"
            min={0}
            max={Math.max(0, slices.length - 1)}
            value={currentIndex}
            onChange={(event) => setCurrentIndex(Number(event.target.value))}
            className="h-8 w-full cursor-pointer accent-zinc-900 dark:accent-zinc-100"
            aria-label={labels.sliceSelector}
          />

          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              {labels.slice} {currentSlice.sliceIndex}
              {typeof visualization.totalSlices === "number" ? ` / ${visualization.totalSlices - 1}` : ""}
            </span>
            <span>
              {labels.overlay}: {currentSlice.hasOverlay ? labels.detected : labels.none}
              {overlayPercentage ? ` (${overlayPercentage})` : ""}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
