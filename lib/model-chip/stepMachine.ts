/**
 * lib/model-chip/stepMachine.ts
 *
 * Pure helper for computing the next (tierIdx, pairInTier) step in the
 * animation step machine. No React imports — zero side effects.
 */

import type { TierGroup } from "./types";

export interface NextPairResult {
  /** Landed on a valid pair — proceed to animate */
  type: "pair";
  tIdx: number;
  pIdx: number;
}

export interface NextDoneResult {
  /** All tiers exhausted — transition to "center" then "done" */
  type: "done";
}

export type NextStepResult = NextPairResult | NextDoneResult;

/**
 * Given the current (tIdx, pIdx), advance by one pair.
 * Skips exhausted tiers. Returns {type:"done"} when all tiers are exhausted.
 */
export function computeNextStep(
  groups: TierGroup[],
  tIdx: number,
  pIdx: number
): NextStepResult {
  let nTIdx = tIdx;
  let nPIdx = pIdx + 1;

  while (nTIdx < groups.length && nPIdx >= groups[nTIdx].count) {
    nTIdx += 1;
    nPIdx = 0;
  }

  if (nTIdx >= groups.length) {
    return { type: "done" };
  }
  return { type: "pair", tIdx: nTIdx, pIdx: nPIdx };
}

/**
 * Given the initial (0, 0) start, determine whether to begin animating
 * or immediately mark as done (empty groups).
 */
export function computeInitialStep(groups: TierGroup[]): NextStepResult {
  if (groups.length === 0) return { type: "done" };
  return { type: "pair", tIdx: 0, pIdx: 0 };
}
