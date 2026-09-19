/**
 * features/game/scoreService.ts
 *
 * Atomic Firestore increment untuk totalScore.
 * - Retry 3x jika gagal, lalu antrekan ke localStorage.
 * - Tidak pernah memunculkan error ke UI.
 *
 * Req 5.3, 5.5, 5.6, 11.4
 */

import { doc, updateDoc, increment } from "firebase/firestore";
import { getFirebaseClient } from "@/features/auth/services/firebase.client";

const PENDING_KEY = (uid: string) => `linechip_pending_score_${uid}`;
export const POINTS_PER_CORRECT = 10;

function getPending(uid: string): number {
  try {
    return parseInt(localStorage.getItem(PENDING_KEY(uid)) ?? "0", 10) || 0;
  } catch { return 0; }
}

function setPending(uid: string, pts: number): void {
  try {
    if (pts > 0) localStorage.setItem(PENDING_KEY(uid), String(pts));
    else localStorage.removeItem(PENDING_KEY(uid));
  } catch { /* ignore */ }
}

async function writeIncrement(uid: string, pts: number, attempt = 1): Promise<void> {
  try {
    const { db } = getFirebaseClient();
    await updateDoc(doc(db, "users", uid), { totalScore: increment(pts) });
    setPending(uid, 0); // clear queue on success
  } catch {
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 500 * attempt));
      return writeIncrement(uid, pts, attempt + 1);
    }
    // Queue locally after 3 failures (cap at 99990)
    setPending(uid, Math.min(getPending(uid) + pts, 99990));
  }
}

/**
 * Award 10 pts. Fire-and-forget Firestore write.
 * Returns the local delta (always POINTS_PER_CORRECT).
 */
export function awardPoints(uid: string | null | undefined): number {
  if (uid) {
    const queued = getPending(uid);
    writeIncrement(uid, POINTS_PER_CORRECT + queued).catch(() => {});
  }
  return POINTS_PER_CORRECT;
}
