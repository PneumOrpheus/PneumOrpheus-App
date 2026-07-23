"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 5_000;

export function AnalysisProcessingWatcher({ analysisId, status }: { analysisId: string; status: string }) {
  const router = useRouter();
  const isProcessing = status === "Processing";

  useEffect(() => {
    if (!isProcessing) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(`/api/reports/${analysisId}/poll`, { cache: "no-store" });
        const result = (await response.json().catch(() => null)) as { status?: string } | null;

        if (!cancelled && result?.status && result.status !== "Processing") {
          router.refresh();
        }
      } catch {
        // Transient error talking to our own API. The next tick retries.
      }
    };

    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [analysisId, isProcessing, router]);

  return null;
}
