import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  where,
  getCountFromServer,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/features/auth/services/firebase.client';
import type { LeaderboardEntry } from './types';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Map array of raw Firestore document data ke `LeaderboardEntry[]`.
 * Rank ditetapkan 1-indexed sesuai posisi dalam array (asumsi array sudah
 * diurutkan descending oleh query Firestore).
 * `totalScore` yang undefined dinormalisasi ke 0.
 */
export function mapDocsToEntries(
  docs: Array<{
    id: string;
    data: () => Record<string, unknown>;
  }>
): LeaderboardEntry[] {
  return docs.map((snap, index) => {
    const data = snap.data();
    const totalScore =
      typeof data['totalScore'] === 'number' ? data['totalScore'] : 0;
    return {
      uid: snap.id,
      rank: index + 1,
      name: typeof data['name'] === 'string' ? data['name'] : '',
      school: typeof data['school'] === 'string' ? data['school'] : '',
      photoURL:
        typeof data['photoURL'] === 'string' ? data['photoURL'] : null,
      totalScore,
    };
  });
}

/**
 * Hitung peringkat untuk `userScore` berdasarkan daftar skor lain.
 * Peringkat = jumlah skor yang lebih tinggi dari userScore + 1.
 * Tie-breaking tidak dilakukan — semua skor yang sama mendapat peringkat sama.
 *
 * CATATAN: Fungsi ini untuk keperluan testing / kalkulasi lokal.
 * Untuk kalkulasi peringkat sebenarnya dari Firestore, gunakan `getCountFromServer`.
 */
export function calculateRank(userScore: number, scores: number[]): number {
  return scores.filter((s) => s > userScore).length + 1;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Mengambil 10 entri teratas dari koleksi Firestore `users`,
 * diurutkan berdasarkan `totalScore` secara descending.
 *
 * Propagate error Firestore (network error, permission error, dsb.)
 * agar dapat ditangani oleh caller.
 */
export async function fetchTop10(): Promise<LeaderboardEntry[]> {
  const { db } = getFirebaseClient();
  const q = query(
    collection(db, 'users'),
    orderBy('totalScore', 'desc'),
    limit(10)
  );
  const snapshot = await getDocs(q);
  // QueryDocumentSnapshot satisfies the { id, data() } shape expected by mapDocsToEntries
  return mapDocsToEntries(
    snapshot.docs.map((d) => ({ id: d.id, data: () => d.data() as Record<string, unknown> }))
  );
}

/**
 * Mengambil entri leaderboard untuk pengguna yang sedang login beserta
 * peringkat mereka yang tepat.
 *
 * Mengembalikan `null` jika:
 * - `uid` bernilai `null`
 * - `userScore` ≤ 0 (pengguna belum pernah bermain)
 *
 * Peringkat dihitung dengan `getCountFromServer`: hitungan dokumen yang
 * memiliki `totalScore > userScore` + 1. Ini mendukung tie-handling yang
 * benar — semua pengguna dengan skor sama mendapat peringkat yang sama.
 *
 * Propagate error Firestore agar dapat ditangani oleh caller.
 */
export async function fetchCurrentUserEntry(
  uid: string | null,
  userScore: number
): Promise<LeaderboardEntry | null> {
  if (uid === null || userScore <= 0) {
    return null;
  }

  const { db } = getFirebaseClient();

  // Ambil dokumen profil pengguna untuk mendapatkan name, school, photoURL
  const userDocRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userDocRef);

  if (!userSnap.exists()) {
    return null;
  }

  const data = userSnap.data() as Record<string, unknown>;

  // Hitung jumlah pengguna dengan skor lebih tinggi → rank = count + 1
  const countQuery = query(
    collection(db, 'users'),
    where('totalScore', '>', userScore)
  );
  const countSnapshot = await getCountFromServer(countQuery);
  const rank = countSnapshot.data().count + 1;

  const totalScore =
    typeof data['totalScore'] === 'number' ? data['totalScore'] : 0;

  return {
    uid,
    rank,
    name: typeof data['name'] === 'string' ? data['name'] : '',
    school: typeof data['school'] === 'string' ? data['school'] : '',
    photoURL:
      typeof data['photoURL'] === 'string' ? data['photoURL'] : null,
    totalScore,
  };
}
