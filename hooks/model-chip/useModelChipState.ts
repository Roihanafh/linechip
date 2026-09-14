"use client";

import { useState } from "react";
import type { VizPhase } from "@/lib/model-chip/types";

export interface ModelChipState {
  bil1: number;
  bil2: number;
  setBil1: (v: number) => void;
  setBil2: (v: number) => void;
  vizPhase: VizPhase;
  setVizPhase: (p: VizPhase) => void;
  snapshot: { bil1: number; bil2: number } | null;
  setSnapshot: (s: { bil1: number; bil2: number } | null) => void;
}

/**
 * Manages input and visualization phase state for the model-chip page.
 * SSR-safe: uses only useState — no access to sessionStorage, Audio, or window.
 * Requirements: 1.1, 1.6
 */
export function useModelChipState(): ModelChipState {
  const [bil1, setBil1] = useState<number>(0);
  const [bil2, setBil2] = useState<number>(0);
  const [vizPhase, setVizPhase] = useState<VizPhase>("idle");
  const [snapshot, setSnapshot] = useState<{ bil1: number; bil2: number } | null>(null);

  return {
    bil1,
    bil2,
    setBil1,
    setBil2,
    vizPhase,
    setVizPhase,
    snapshot,
    setSnapshot,
  };
}
