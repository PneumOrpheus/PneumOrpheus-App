"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Phase =
  | "typing-line-1"
  | "pause-after-line-1"
  | "typing-line-2"
  | "pause-after-line-2"
  | "deleting-line-2"
  | "pause-after-delete-line-2"
  | "deleting-line-1"
  | "pause-after-delete-line-1";

type AuthTwoLineTypewriterProps = {
  line1: string;
  line2: string;
  className?: string;
};

const TYPE_MS = 70;
const DELETE_MS = 45;
const PAUSE_SHORT_MS = 450;
const PAUSE_LONG_MS = 1100;

export default function AuthTwoLineTypewriter({
  line1,
  line2,
  className,
}: AuthTwoLineTypewriterProps) {
  const [line1Length, setLine1Length] = useState(0);
  const [line2Length, setLine2Length] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing-line-1");

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (phase === "typing-line-1") {
      if (line1Length < line1.length) {
        timeoutId = setTimeout(() => setLine1Length((n) => n + 1), TYPE_MS);
      } else {
        timeoutId = setTimeout(() => setPhase("pause-after-line-1"), PAUSE_SHORT_MS);
      }
    }

    if (phase === "pause-after-line-1") {
      timeoutId = setTimeout(() => setPhase("typing-line-2"), 0);
    }

    if (phase === "typing-line-2") {
      if (line2Length < line2.length) {
        timeoutId = setTimeout(() => setLine2Length((n) => n + 1), TYPE_MS);
      } else {
        timeoutId = setTimeout(() => setPhase("pause-after-line-2"), PAUSE_LONG_MS);
      }
    }

    if (phase === "pause-after-line-2") {
      timeoutId = setTimeout(() => setPhase("deleting-line-2"), 0);
    }

    if (phase === "deleting-line-2") {
      if (line2Length > 0) {
        timeoutId = setTimeout(() => setLine2Length((n) => n - 1), DELETE_MS);
      } else {
        timeoutId = setTimeout(
          () => setPhase("pause-after-delete-line-2"),
          PAUSE_SHORT_MS
        );
      }
    }

    if (phase === "pause-after-delete-line-2") {
      timeoutId = setTimeout(() => setPhase("deleting-line-1"), 0);
    }

    if (phase === "deleting-line-1") {
      if (line1Length > 0) {
        timeoutId = setTimeout(() => setLine1Length((n) => n - 1), DELETE_MS);
      } else {
        timeoutId = setTimeout(() => setPhase("pause-after-delete-line-1"), PAUSE_SHORT_MS);
      }
    }

    if (phase === "pause-after-delete-line-1") {
      timeoutId = setTimeout(() => setPhase("typing-line-1"), 0);
    }

    return () => clearTimeout(timeoutId);
  }, [phase, line1Length, line2Length, line1.length, line2.length]);

  const activeLine = useMemo<1 | 2>(() => {
    if (
      phase === "typing-line-2" ||
      phase === "pause-after-line-2" ||
      phase === "deleting-line-2" ||
      phase === "pause-after-delete-line-2"
    ) {
      return 2;
    }

    return 1;
  }, [phase]);

  return (
    <p className={cn("inline-block", className)} aria-label={`${line1} ${line2}`}>
      <span className="block min-h-[1.25em] whitespace-nowrap">
        {line1.slice(0, line1Length)}
        {activeLine === 1 ? <span className="animate-pulse">|</span> : null}
      </span>
      <span className="block min-h-[1.25em] whitespace-nowrap">
        {line2.slice(0, line2Length)}
        {activeLine === 2 ? <span className="animate-pulse">|</span> : null}
      </span>
    </p>
  );
}
