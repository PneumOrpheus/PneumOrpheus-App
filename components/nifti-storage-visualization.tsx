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
  channels: 1 | 3;
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
  gradCamIntensity?: string;
  detected: string;
  none: string;
  loadingNifti?: string;
  failedNifti?: string;
};

type NiftiVariantId = "normalCt" | "gradCam" | "segmentationRoi";

type Props = {
  plotFilePath: string;
  signedFileUrl?: string | null;
  variantId?: NiftiVariantId;
  prefetchTargets?: Array<{
    plotFilePath: string;
    signedFileUrl?: string | null;
  }>;
  labels: VisualizationLabels;
};

const formatOverlayPercentage = (value: number): string => `${(value * 100).toFixed(1)}%`;
const SLICE_CACHE_LIMIT = 12;
const VOLUME_CACHE_LIMIT = 6;
const GRAD_CAM_CHROMA_NOISE_FLOOR = 0.08;
const GRAD_CAM_ACTIVE_SIGNAL_THRESHOLD = 0.03;
const GRAD_CAM_SIGNAL_HISTOGRAM_BINS = 128;
const GRAD_CAM_SIGNAL_PERCENTILE = 0.99;
const GRAD_CAM_INTENSITY_PERCENTILE_WEIGHT = 0.78;
const GRAD_CAM_INTENSITY_ACTIVE_MEAN_WEIGHT = 0.14;
const GRAD_CAM_INTENSITY_ACTIVE_RATIO_WEIGHT = 0.08;
const GRAD_CAM_INTENSITY_MIN_DISPLAY_SCORE = 0.01;
const GRAD_CAM_INTENSITY_DISPLAY_GAMMA = 0.55;
const GRAD_CAM_INTENSITY_DISPLAY_GAIN = 1.18;

const volumeCache = new Map<string, DecodedVolume>();
const volumeLoadPromises = new Map<string, Promise<DecodedVolume>>();

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

type TypedDataInfo = {
  data: NumericView;
  channels: 1 | 3;
};

const getTypedView = (datatypeCode: number, imageBuffer: ArrayBuffer): TypedDataInfo | null => {
  switch (datatypeCode) {
    case nifti.NIFTI1.TYPE_UINT8:
      return { data: new Uint8Array(imageBuffer), channels: 1 };
    case nifti.NIFTI1.TYPE_INT8:
      return { data: new Int8Array(imageBuffer), channels: 1 };
    case nifti.NIFTI1.TYPE_UINT16:
      return { data: new Uint16Array(imageBuffer), channels: 1 };
    case nifti.NIFTI1.TYPE_INT16:
      return { data: new Int16Array(imageBuffer), channels: 1 };
    case nifti.NIFTI1.TYPE_UINT32:
      return { data: new Uint32Array(imageBuffer), channels: 1 };
    case nifti.NIFTI1.TYPE_INT32:
      return { data: new Int32Array(imageBuffer), channels: 1 };
    case nifti.NIFTI1.TYPE_FLOAT32:
      return { data: new Float32Array(imageBuffer), channels: 1 };
    case nifti.NIFTI1.TYPE_FLOAT64:
      return { data: new Float64Array(imageBuffer), channels: 1 };
    // NIfTI datatype 128: RGB24 (3 unsigned bytes per voxel).
    case 128:
      return { data: new Uint8Array(imageBuffer), channels: 3 };
    default:
      return null;
  }
};

const getRgbIntensity = (data: Uint8Array, index: number): number => {
  const offset = index * 3;
  const red = data[offset] ?? 0;
  const green = data[offset + 1] ?? 0;
  const blue = data[offset + 2] ?? 0;

  // Standard luminance weighting in sRGB.
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const getGradCamColorSignal = (red: number, green: number, blue: number): number => {
  const channelMax = Math.max(red, green, blue);
  const channelMin = Math.min(red, green, blue);
  const chroma = (channelMax - channelMin) / 255;

  if (chroma <= GRAD_CAM_CHROMA_NOISE_FLOOR) {
    return 0;
  }

  const chromaSignal = (chroma - GRAD_CAM_CHROMA_NOISE_FLOOR) / (1 - GRAD_CAM_CHROMA_NOISE_FLOOR);

  const maxChannel = channelMax / 255;
  const minChannel = channelMin / 255;
  const delta = maxChannel - minChannel;

  if (delta <= 1e-6) {
    return 0;
  }

  const redNorm = red / 255;
  const greenNorm = green / 255;
  const blueNorm = blue / 255;

  let hue = 0;
  if (maxChannel === redNorm) {
    hue = ((greenNorm - blueNorm) / delta) % 6;
  } else if (maxChannel === greenNorm) {
    hue = (blueNorm - redNorm) / delta + 2;
  } else {
    hue = (redNorm - greenNorm) / delta + 4;
  }

  const hueDegrees = ((hue * 60) + 360) % 360;

  let heatWeight = 0;
  if (hueDegrees < 60) {
    heatWeight = 1;
  } else if (hueDegrees < 120) {
    heatWeight = 0.75 - ((hueDegrees - 60) / 60) * 0.3;
  } else if (hueDegrees < 180) {
    heatWeight = 0.45 - ((hueDegrees - 120) / 60) * 0.2;
  } else if (hueDegrees < 240) {
    heatWeight = 0.25 - ((hueDegrees - 180) / 60) * 0.15;
  } else if (hueDegrees < 300) {
    heatWeight = 0.1 + ((hueDegrees - 240) / 60) * 0.1;
  } else {
    heatWeight = 0.2 + ((hueDegrees - 300) / 60) * 0.8;
  }

  return Math.max(0, Math.min(1, chromaSignal * heatWeight));
};

const percentileFromHistogram = (
  histogram: Uint32Array,
  totalCount: number,
  percentile: number,
): number => {
  if (totalCount <= 0) {
    return 0;
  }

  const targetRank = Math.max(1, Math.ceil(totalCount * percentile));
  let cumulative = 0;

  for (let bin = 0; bin < histogram.length; bin += 1) {
    cumulative += histogram[bin] ?? 0;
    if (cumulative >= targetRank) {
      return bin / (histogram.length - 1);
    }
  }

  return 1;
};

const calibrateGradCamIntensityScore = (rawScore: number): number => {
  const clamped = Math.max(0, Math.min(1, rawScore));
  if (clamped < GRAD_CAM_INTENSITY_MIN_DISPLAY_SCORE) {
    return 0;
  }

  const boosted = GRAD_CAM_INTENSITY_DISPLAY_GAIN * Math.pow(clamped, GRAD_CAM_INTENSITY_DISPLAY_GAMMA);
  return Math.max(0, Math.min(1, boosted));
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
  const typedDataInfo = getTypedView(header.datatypeCode, imageBuffer);

  if (!typedDataInfo) {
    throw new Error(`Unsupported NIfTI datatype: ${header.datatypeCode}`);
  }

  const { data: typedData, channels } = typedDataInfo;

  const width = Number(header.dims[1] ?? 0);
  const height = Number(header.dims[2] ?? 0);
  const depth = Number(header.dims[3] ?? 0);

  if (!width || !height || !depth) {
    throw new Error("NIfTI dimensions are invalid for slice visualization.");
  }

  const voxelCount = width * height * depth;
  if (typedData.length < voxelCount * channels) {
    throw new Error("NIfTI data is smaller than expected for volume dimensions.");
  }

  const slope =
    channels === 1 && header.scl_slope && Number.isFinite(header.scl_slope) && header.scl_slope !== 0
      ? header.scl_slope
      : 1;
  const intercept = channels === 1 && Number.isFinite(header.scl_inter ?? NaN) ? (header.scl_inter as number) : 0;

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  if (channels === 3) {
    const rgbData = typedData as Uint8Array;
    for (let index = 0; index < voxelCount; index += 1) {
      const value = getRgbIntensity(rgbData, index);
      if (value < min) min = value;
      if (value > max) max = value;
    }
  } else {
    for (let index = 0; index < voxelCount; index += 1) {
      const value = typedData[index] * slope + intercept;
      if (value < min) min = value;
      if (value > max) max = value;
    }
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
      const flatIndex = offset + index;
      const value =
        channels === 3
          ? getRgbIntensity(typedData as Uint8Array, flatIndex)
          : typedData[flatIndex] * slope + intercept;
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
    channels,
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
  gradCamIntensityScore: number;
};

const renderSlice = (
  volume: DecodedVolume,
  sliceIndex: number,
): SliceRender => {
  const { width, height, data, channels, slope, intercept, min, max, overlayThreshold } = volume;
  const pixelsPerSlice = width * height;
  const offset = sliceIndex * pixelsPerSlice;
  const range = Math.max(1e-6, max - min);
  const imageData = new ImageData(width, height);
  let overlayCount = 0;
  let normalizedIntensityTotal = 0;
  let gradCamSignalTotal = 0;
  let gradCamActiveCount = 0;
  const gradCamSignalHistogram = new Uint32Array(GRAD_CAM_SIGNAL_HISTOGRAM_BINS);

  for (let index = 0; index < pixelsPerSlice; index += 1) {
    const flatIndex = offset + index;
    const pixelIndex = index * 4;

    if (channels === 3) {
      const rgbData = data as Uint8Array;
      const rgbOffset = flatIndex * 3;
      const red = rgbData[rgbOffset] ?? 0;
      const green = rgbData[rgbOffset + 1] ?? 0;
      const blue = rgbData[rgbOffset + 2] ?? 0;
      const intensity = getRgbIntensity(rgbData, flatIndex);
      const normalized = Math.max(0, Math.min(1, (intensity - min) / range));
      normalizedIntensityTotal += normalized;
      const gradCamSignal = getGradCamColorSignal(red, green, blue);
      if (gradCamSignal >= GRAD_CAM_ACTIVE_SIGNAL_THRESHOLD) {
        gradCamSignalTotal += gradCamSignal;
        gradCamActiveCount += 1;
        const histogramIndex = Math.min(
          GRAD_CAM_SIGNAL_HISTOGRAM_BINS - 1,
          Math.floor(gradCamSignal * (GRAD_CAM_SIGNAL_HISTOGRAM_BINS - 1)),
        );
        gradCamSignalHistogram[histogramIndex] += 1;
      }

      if (intensity >= overlayThreshold) {
        overlayCount += 1;
      }

      imageData.data[pixelIndex] = red;
      imageData.data[pixelIndex + 1] = green;
      imageData.data[pixelIndex + 2] = blue;
      imageData.data[pixelIndex + 3] = 255;
      continue;
    }

    const value = data[flatIndex] * slope + intercept;
    const normalized = Math.max(0, Math.min(1, (value - min) / range));
    normalizedIntensityTotal += normalized;
    const grayscale = Math.round(normalized * 255);

    if (value >= overlayThreshold) {
      overlayCount += 1;
    }

    imageData.data[pixelIndex] = grayscale;
    imageData.data[pixelIndex + 1] = grayscale;
    imageData.data[pixelIndex + 2] = grayscale;
    imageData.data[pixelIndex + 3] = 255;
  }

  const overlayCoverage = overlayCount / pixelsPerSlice;
  const meanNormalizedIntensity = normalizedIntensityTotal / pixelsPerSlice;
  const gradCamActiveRatio = gradCamActiveCount / pixelsPerSlice;
  const gradCamActiveMean = gradCamActiveCount > 0 ? gradCamSignalTotal / gradCamActiveCount : 0;
  const gradCamActivePercentile = percentileFromHistogram(
    gradCamSignalHistogram,
    gradCamActiveCount,
    GRAD_CAM_SIGNAL_PERCENTILE,
  );
  const rawGradCamScore = Math.max(
    0,
    Math.min(
      1,
      (GRAD_CAM_INTENSITY_PERCENTILE_WEIGHT * gradCamActivePercentile) +
      (GRAD_CAM_INTENSITY_ACTIVE_MEAN_WEIGHT * gradCamActiveMean) +
      (GRAD_CAM_INTENSITY_ACTIVE_RATIO_WEIGHT * gradCamActiveRatio),
    ),
  );
  const gradCamIntensityScore = channels === 3
    ? calibrateGradCamIntensityScore(rawGradCamScore)
    : meanNormalizedIntensity;

  return {
    imageData,
    overlayCoverage,
    hasOverlay: overlayCoverage > 0,
    gradCamIntensityScore,
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

const buildVolumeCacheKey = (plotFilePath: string, signedFileUrl?: string | null): string => {
  if (signedFileUrl) {
    return `signed:${signedFileUrl}`;
  }

  return `path:${normalizeObjectPath(plotFilePath)}`;
};

const readFromVolumeCache = (key: string): DecodedVolume | null => {
  const cached = volumeCache.get(key);
  if (!cached) {
    return null;
  }

  volumeCache.delete(key);
  volumeCache.set(key, cached);
  return cached;
};

const writeToVolumeCache = (key: string, volume: DecodedVolume): void => {
  if (volumeCache.has(key)) {
    volumeCache.delete(key);
  }

  volumeCache.set(key, volume);

  while (volumeCache.size > VOLUME_CACHE_LIMIT) {
    const oldest = volumeCache.keys().next().value as string | undefined;
    if (!oldest) {
      break;
    }

    volumeCache.delete(oldest);
  }
};

const fetchVolumeFileBlob = async (
  plotFilePath: string,
  signedFileUrl?: string | null,
): Promise<Blob> => {
  let fileBlob: Blob | null = null;
  let lastError: string | null = null;

  if (signedFileUrl) {
    const signedResponse = await fetch(signedFileUrl, { cache: "force-cache" });
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

  if (!fileBlob) {
    const supabase = createClient();
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

  return fileBlob;
};

const getOrLoadDecodedVolume = async (
  plotFilePath: string,
  signedFileUrl?: string | null,
): Promise<DecodedVolume> => {
  const key = buildVolumeCacheKey(plotFilePath, signedFileUrl);
  const cached = readFromVolumeCache(key);
  if (cached) {
    return cached;
  }

  const inFlight = volumeLoadPromises.get(key);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    try {
      const fileBlob = await fetchVolumeFileBlob(plotFilePath, signedFileUrl);
      const arrayBuffer = await fileBlob.arrayBuffer();
      const decodedVolume = decodeNiftiVolume(arrayBuffer);
      writeToVolumeCache(key, decodedVolume);
      return decodedVolume;
    } finally {
      volumeLoadPromises.delete(key);
    }
  })();

  volumeLoadPromises.set(key, promise);
  return promise;
};

type SliceMetrics = {
  sliceIndex: number;
  overlayCoverage: number;
  hasOverlay: boolean;
  gradCamIntensityScore: number;
};

export function NiftiStorageVisualization({
  plotFilePath,
  signedFileUrl,
  variantId = "normalCt",
  prefetchTargets = [],
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
        const decodedVolume = await getOrLoadDecodedVolume(plotFilePath, signedFileUrl);

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
    const targets = prefetchTargets.filter(
      (target) =>
        Boolean(target.plotFilePath) &&
        buildVolumeCacheKey(target.plotFilePath, target.signedFileUrl) !==
          buildVolumeCacheKey(plotFilePath, signedFileUrl),
    );

    if (!targets.length) {
      return;
    }

    let cancelled = false;

    const prefetch = async () => {
      for (const target of targets) {
        if (cancelled) {
          return;
        }

        try {
          await getOrLoadDecodedVolume(target.plotFilePath, target.signedFileUrl);
        } catch {
          // Ignore prefetch errors; foreground load will surface actionable errors.
        }
      }
    };

    void prefetch();

    return () => {
      cancelled = true;
    };
  }, [plotFilePath, signedFileUrl, prefetchTargets]);

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
          gradCamIntensityScore: cached.gradCamIntensityScore,
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
          gradCamIntensityScore: rendered.gradCamIntensityScore,
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
  const showOverlayMetric = variantId === "segmentationRoi";
  const showGradCamIntensity = variantId === "gradCam";
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
  const gradCamIntensityPercentage = hasRenderedSlice && sliceMetrics
    ? formatOverlayPercentage(sliceMetrics.gradCamIntensityScore)
    : null;

  if (isLoading && !volume) {
    return (
      <section className="mt-5 rounded-xl border border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
        {labels.loadingNifti ?? "Loading NIfTI volume..."}
      </section>
    );
  }

  if (errorMessage && !volume) {
    return (
      <section className="mt-5 rounded-xl border border-zinc-200 p-4 text-sm text-red-700 dark:border-zinc-700 dark:text-red-300">
        {labels.failedNifti ?? "Could not render the uploaded NIfTI volume."}
        {errorMessage ? ` ${errorMessage}` : ""}
      </section>
    );
  }

  if (!volume) {
    return (
      <section className="mt-5 rounded-xl border border-zinc-200 p-4 text-sm text-red-700 dark:border-zinc-700 dark:text-red-300">
        {labels.failedNifti ?? "Could not render the uploaded NIfTI volume."}
      </section>
    );
  }

  return (
    <section className="mt-5 space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
      <h3 className="text-base font-semibold">{labels.title}</h3>

      {isLoading ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {labels.loadingNifti ?? "Loading NIfTI volume..."}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="text-xs text-red-700 dark:text-red-300">
          {labels.failedNifti ?? "Could not render the uploaded NIfTI volume."}
          {` ${errorMessage}`}
        </p>
      ) : null}

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
            className="viz-range h-8 w-full cursor-pointer"
            aria-label={labels.sliceSelector}
          />

          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              {labels.slice} {currentSliceIndex} / {Math.max(0, volume.depth - 1)}
            </span>
            {showOverlayMetric ? (
              <span>
                {labels.overlay}: {overlayLabel}
                {overlayPercentage ? ` (${overlayPercentage})` : ""}
                {isRenderingSlice && hasRenderedSlice ? " ..." : ""}
              </span>
            ) : null}
            {showGradCamIntensity ? (
              <span>
                {labels.gradCamIntensity ?? "Grad-CAM intensity"}: {gradCamIntensityPercentage ?? "..."}
                {isRenderingSlice && hasRenderedSlice ? " ..." : ""}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
