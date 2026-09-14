"use client";

import { useState } from "react";
import type { VizPhaseSub, SubtractionSnapshot } from "@/lib/model-chip/subtractionTypes";

export interface SubtractionState {
  bil1: number;
  bil2: number;
  setBil1: (v: number) => void;
  setBil2: (v: number) => void;
  vizPhase: VizPhaseSub;
  setVizPhase: (p: VizPhaseSub) => void;
  snapshot: SubtractionSnapshot | null;
  setSnapshot: (s: SubtractionSnapshot | null) => void;
}

/**
 * Manages input and visualization phase state for the model-chip subtraction page.
 * SSR-safe: uses only useState — no access to sessionStorage, Audio, or window.
 * Requirements: 1.1, 1.3, 2.5
 */
export function useSubtractionState(): SubtractionState {
  const [bil1, setBil1] = useState<number>(0);
  const [bil2, setBil2] = useState<number>(0);
  const [vizPhase, setVizPhase] = useState<VizPhaseSub>("idle");
  const [snapshot, setSnapshot] = useState<SubtractionSnapshot | null>(null);

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
