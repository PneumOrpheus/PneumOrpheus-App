"use client";

import { useEffect, useRef, useState } from "react";
import * as nifti from "nifti-reader-js";
import { createClient } from "@/utils/supabase/client";

type NumericView =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

type DecodedVolume = {
  width: number;
  height: number;
  depth: number;
  data: NumericView;
  slope: number;
  intercept: number;
  min: number;
  max: number;
  overlayThreshold: number;
  maxOverlayCoverage: number;
};

type VisualizationLabels = {
  title: string;
  sliceSelector: string;
  slice: string;
  overlay: string;
  detected: string;
  none: string;
  loadingNifti?: string;
  failedNifti?: string;
};

type Props = {
  plotFilePath: string;
  signedFileUrl?: string | null;
  labels: VisualizationLabels;
};

const formatOverlayPercentage = (value: number): string => `${(value * 100).toFixed(1)}%`;
const SLICE_CACHE_LIMIT = 12;

type StorageCandidate = {
  bucket: string;
  objectPath: string;
};

const normalizeObjectPath = (value: string): string => {
  const trimmed = value.trim().replace(/^\/+/, "");
  const decoded = (() => {
    try {
      return decodeURIComponent(trimmed);
    } catch {
      return trimmed;
    }
  })();

  return decoded;
};

const buildStorageCandidates = (value: string): StorageCandidate[] => {
  const normalized = normalizeObjectPath(value);
  if (!normalized) {
    return [];
  }

  const candidates: StorageCandidate[] = [];
  const seen = new Set<string>();

  const add = (bucket: string, objectPath: string) => {
    const key = `${bucket}/${objectPath}`;
    if (!bucket || !objectPath || seen.has(key)) {
      return;
    }

    seen.add(key);
    candidates.push({ bucket, objectPath });
  };

  const parts = normalized.split("/").filter(Boolean);
  if (parts.length >= 2) {
    const [bucket, ...rest] = parts;
    add(bucket, rest.join("/"));
  }

  const studyFilesPrefix = "study-files/";
  let objectOnly = normalized;
  while (objectOnly.startsWith(studyFilesPrefix)) {
    objectOnly = objectOnly.slice(studyFilesPrefix.length);
  }
  add("study-files", objectOnly);

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      const pathSegments = url.pathname.split("/").filter(Boolean);
      const bucketIndex = pathSegments.findIndex((segment) => segment === "study-files");
      if (bucketIndex >= 0 && bucketIndex + 1 < pathSegments.length) {
        add("study-files", pathSegments.slice(bucketIndex + 1).join("/"));
      }
    } catch {
      // Keep non-URL candidates only.
    }
  }

  return candidates;
};

const getTypedView = (datatypeCode: number, imageBuffer: ArrayBuffer): NumericView | null => {
  switch (datatypeCode) {
    case nifti.NIFTI1.TYPE_UINT8:
      return new Uint8Array(imageBuffer);
    case nifti.NIFTI1.TYPE_INT8:
      return new Int8Array(imageBuffer);
    case nifti.NIFTI1.TYPE_UINT16:
      return new Uint16Array(imageBuffer);
    case nifti.NIFTI1.TYPE_INT16:
      return new Int16Array(imageBuffer);
    case nifti.NIFTI1.TYPE_UINT32:
      return new Uint32Array(imageBuffer);
    case nifti.NIFTI1.TYPE_INT32:
      return new Int32Array(imageBuffer);
    case nifti.NIFTI1.TYPE_FLOAT32:
      return new Float32Array(imageBuffer);
    case nifti.NIFTI1.TYPE_FLOAT64:
      return new Float64Array(imageBuffer);
    default:
      return null;
  }
};

const decodeNiftiVolume = (buffer: ArrayBuffer): DecodedVolume => {
  let niftiBuffer: ArrayBuffer = buffer;

  if (nifti.isCompressed(niftiBuffer)) {
    niftiBuffer = nifti.decompress(niftiBuffer) as ArrayBuffer;
  }

  if (!nifti.isNIFTI(niftiBuffer)) {
    throw new Error("File is not a valid NIfTI volume.");
  }

  const header = nifti.readHeader(niftiBuffer) as {
    dims: number[];
    datatypeCode: number;
    scl_slope?: number;
    scl_inter?: number;
  };
  const imageBuffer = nifti.readImage(header as never, niftiBuffer) as ArrayBuffer;
  const typedData = getTypedView(header.datatypeCode, imageBuffer);

  if (!typedData) {
    throw new Error(`Unsupported NIfTI datatype: ${header.datatypeCode}`);
  }

  const width = Number(header.dims[1] ?? 0);
  const height = Number(header.dims[2] ?? 0);
  const depth = Number(header.dims[3] ?? 0);

  if (!width || !height || !depth) {
    throw new Error("NIfTI dimensions are invalid for slice visualization.");
  }

  const voxelCount = width * height * depth;
  if (typedData.length < voxelCount) {
    throw new Error("NIfTI data is smaller than expected for volume dimensions.");
  }

  const slope = header.scl_slope && Number.isFinite(header.scl_slope) && header.scl_slope !== 0 ? header.scl_slope : 1;
  const intercept = Number.isFinite(header.scl_inter ?? NaN) ? (header.scl_inter as number) : 0;

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < voxelCount; index += 1) {
    const value = typedData[index] * slope + intercept;
    if (value < min) min = value;
    if (value > max) max = value;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error("Failed to derive value range from NIfTI volume.");
  }

  const pixelsPerSlice = width * height;
  const range = Math.max(1e-6, max - min);
  const overlayThreshold = min + range * 0.85;
  let maxOverlayCoverage = 0;

  for (let sliceIndex = 0; sliceIndex < depth; sliceIndex += 1) {
    const offset = sliceIndex * pixelsPerSlice;
    let overlayCount = 0;

    for (let index = 0; index < pixelsPerSlice; index += 1) {
      const value = typedData[offset + index] * slope + intercept;
      if (value >= overlayThreshold) {
        overlayCount += 1;
      }
    }

    const coverage = overlayCount / pixelsPerSlice;
    if (coverage > maxOverlayCoverage) {
      maxOverlayCoverage = coverage;
    }
  }

  return {
    width,
    height,
    depth,
    data: typedData,
    slope,
    intercept,
    min,
    max,
    overlayThreshold,
    maxOverlayCoverage,
  };
};

type SliceRender = {
  imageData: ImageData;
  overlayCoverage: number;
  hasOverlay: boolean;
};

const renderSlice = (
  volume: DecodedVolume,
  sliceIndex: number,
): SliceRender => {
  const { width, height, data, slope, intercept, min, max, overlayThreshold } = volume;
  const pixelsPerSlice = width * height;
  const offset = sliceIndex * pixelsPerSlice;
  const range = Math.max(1e-6, max - min);
  const imageData = new ImageData(width, height);
  let overlayCount = 0;

  for (let index = 0; index < pixelsPerSlice; index += 1) {
    const flatIndex = offset + index;
    const value = data[flatIndex] * slope + intercept;
    const normalized = Math.max(0, Math.min(1, (value - min) / range));
    const grayscale = Math.round(normalized * 255);

    if (value >= overlayThreshold) {
      overlayCount += 1;
    }

    const pixelIndex = index * 4;
    imageData.data[pixelIndex] = grayscale;
    imageData.data[pixelIndex + 1] = grayscale;
    imageData.data[pixelIndex + 2] = grayscale;
    imageData.data[pixelIndex + 3] = 255;
  }

  const overlayCoverage = overlayCount / pixelsPerSlice;
  return {
    imageData,
    overlayCoverage,
    hasOverlay: overlayCoverage > 0,
  };
};

const drawSliceToCanvas = (canvas: HTMLCanvasElement, imageData: ImageData): void => {
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas context is unavailable for NIfTI rendering.");
  }

  context.putImageData(imageData, 0, 0);
};

const readFromSliceCache = (
  cache: Map<number, SliceRender>,
  sliceIndex: number,
): SliceRender | null => {
  const cached = cache.get(sliceIndex);
  if (!cached) {
    return null;
  }

  cache.delete(sliceIndex);
  cache.set(sliceIndex, cached);
  return cached;
};

const writeToSliceCache = (
  cache: Map<number, SliceRender>,
  sliceIndex: number,
  rendered: SliceRender,
): void => {
  if (cache.has(sliceIndex)) {
    cache.delete(sliceIndex);
  }

  cache.set(sliceIndex, rendered);

  while (cache.size > SLICE_CACHE_LIMIT) {
    const oldest = cache.keys().next().value as number | undefined;
    if (oldest === undefined) {
      break;
    }

    cache.delete(oldest);
  }
};

type SliceMetrics = {
  sliceIndex: number;
  overlayCoverage: number;
  hasOverlay: boolean;
};

export function NiftiStorageVisualization({
  plotFilePath,
  signedFileUrl,
  labels,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sliceCacheRef = useRef<Map<number, SliceRender>>(new Map());
  const renderFrameRef = useRef<number | null>(null);
  const renderTokenRef = useRef(0);
  const [volume, setVolume] = useState<DecodedVolume | null>(null);
  const [currentSliceIndex, setCurrentSliceIndex] = useState(0);
  const [sliceMetrics, setSliceMetrics] = useState<SliceMetrics | null>(null);
  const [isRenderingSlice, setIsRenderingSlice] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    const loadVolume = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        let fileBlob: Blob | null = null;
        let lastError: string | null = null;

        if (signedFileUrl) {
          const signedResponse = await fetch(signedFileUrl, { cache: "no-store" });
          if (signedResponse.ok) {
            fileBlob = await signedResponse.blob();
          } else {
            lastError = `Signed URL fetch failed (${signedResponse.status}).`;
          }
        }

        const candidates = buildStorageCandidates(plotFilePath);
        if (!candidates.length && !fileBlob) {
          throw new Error("Stored plot file path must include bucket and object path.");
        }

        const supabase = createClient();

        if (!fileBlob) {
          for (const candidate of candidates) {
            const { data, error } = await supabase.storage
              .from(candidate.bucket)
              .download(candidate.objectPath);

            if (data) {
              fileBlob = data;
              break;
            }

            if (error) {
              lastError = `${error.message} [${candidate.bucket}/${candidate.objectPath}]`;
            }
          }
        }

        if (!fileBlob) {
          throw new Error(lastError ?? "Could not download the stored NIfTI file.");
        }

        const arrayBuffer = await fileBlob.arrayBuffer();
        const decodedVolume = decodeNiftiVolume(arrayBuffer);

        if (disposed) {
          return;
        }

        setVolume(decodedVolume);
        setCurrentSliceIndex(Math.floor(decodedVolume.depth / 2));
        setSliceMetrics(null);
        sliceCacheRef.current.clear();
      } catch (error) {
        if (disposed) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unknown NIfTI visualization error.";
        setErrorMessage(message);
      } finally {
        if (!disposed) {
          setIsLoading(false);
        }
      }
    };

    void loadVolume();

    return () => {
      disposed = true;
    };
  }, [plotFilePath, signedFileUrl]);

  useEffect(() => {
    if (!volume || !canvasRef.current) {
      return;
    }

    renderTokenRef.current += 1;
    const token = renderTokenRef.current;

    if (renderFrameRef.current !== null) {
      cancelAnimationFrame(renderFrameRef.current);
      renderFrameRef.current = null;
    }

    const cached = readFromSliceCache(sliceCacheRef.current, currentSliceIndex);
    if (cached) {
      try {
        drawSliceToCanvas(canvasRef.current, cached.imageData);
        if (token !== renderTokenRef.current) {
          return;
        }

        setSliceMetrics({
          sliceIndex: currentSliceIndex,
          overlayCoverage: cached.overlayCoverage,
          hasOverlay: cached.hasOverlay,
        });
        setIsRenderingSlice(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown NIfTI visualization error.";
        setErrorMessage(message);
      }

      return;
    }

    setIsRenderingSlice(true);

    renderFrameRef.current = requestAnimationFrame(() => {
      if (!canvasRef.current || token !== renderTokenRef.current) {
        return;
      }

      try {
        const rendered = renderSlice(volume, currentSliceIndex);
        drawSliceToCanvas(canvasRef.current, rendered.imageData);
        if (token !== renderTokenRef.current) {
          return;
        }

        writeToSliceCache(sliceCacheRef.current, currentSliceIndex, rendered);

        setSliceMetrics({
          sliceIndex: currentSliceIndex,
          overlayCoverage: rendered.overlayCoverage,
          hasOverlay: rendered.hasOverlay,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown NIfTI visualization error.";
        setErrorMessage(message);
      } finally {
        if (token === renderTokenRef.current) {
          setIsRenderingSlice(false);
        }
      }
    });

    return () => {
      if (renderFrameRef.current !== null) {
        cancelAnimationFrame(renderFrameRef.current);
        renderFrameRef.current = null;
      }
    };
  }, [volume, currentSliceIndex]);

  const hasRenderedSlice = Boolean(
    sliceMetrics && sliceMetrics.sliceIndex === currentSliceIndex,
  );
  const maxOverlayCoverage = volume?.maxOverlayCoverage ?? 0;
  const overlayLabel = hasRenderedSlice
    ? (sliceMetrics?.hasOverlay ? labels.detected : labels.none)
    : "...";
  const normalizedCoverage = hasRenderedSlice && sliceMetrics
    ? (maxOverlayCoverage > 0
        ? Math.min(1, sliceMetrics.overlayCoverage / maxOverlayCoverage)
        : sliceMetrics.overlayCoverage)
    : null;
  const overlayPercentage = hasRenderedSlice && sliceMetrics
    ? formatOverlayPercentage(normalizedCoverage ?? sliceMetrics.overlayCoverage)
    : null;

  if (isLoading) {
    return (
      <section className="mt-5 rounded-xl border border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
        {labels.loadingNifti ?? "Loading NIfTI volume..."}
      </section>
    );
  }

  if (errorMessage || !volume) {
    return (
      <section className="mt-5 rounded-xl border border-zinc-200 p-4 text-sm text-red-700 dark:border-zinc-700 dark:text-red-300">
        {labels.failedNifti ?? "Could not render the uploaded NIfTI volume."}
        {errorMessage ? ` ${errorMessage}` : ""}
      </section>
    );
  }

  return (
    <section className="mt-5 space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
      <h3 className="text-base font-semibold">{labels.title}</h3>

      <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
        <canvas
          ref={canvasRef}
          aria-label={`NIfTI slice ${currentSliceIndex}`}
          className="h-auto w-full rounded-md border border-zinc-200 bg-zinc-50 object-contain dark:border-zinc-700 dark:bg-zinc-900"
        />

        <div className="mt-3 space-y-2">
          <input
            type="range"
            min={0}
            max={Math.max(0, volume.depth - 1)}
            value={currentSliceIndex}
            onChange={(event) => setCurrentSliceIndex(Number(event.target.value))}
            className="h-8 w-full cursor-pointer accent-zinc-900 dark:accent-zinc-100"
            aria-label={labels.sliceSelector}
          />

          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              {labels.slice} {currentSliceIndex} / {Math.max(0, volume.depth - 1)}
            </span>
            <span>
              {labels.overlay}: {overlayLabel}
              {overlayPercentage ? ` (${overlayPercentage})` : ""}
              {isRenderingSlice && hasRenderedSlice ? " ..." : ""}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
