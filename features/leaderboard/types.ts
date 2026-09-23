/** Satu entri dalam leaderboard — merepresentasikan data satu pemain */
export interface LeaderboardEntry {
  /** Firebase UID pengguna */
  uid: string;
  /** Peringkat 1-indexed berdasarkan totalScore secara descending */
  rank: number;
  /** Nama tampilan pengguna */
  name: string;
  /** Nama sekolah pengguna */
  school: string;
  /** URL foto profil; null atau undefined jika tidak ada */
  photoURL: string | null | undefined;
  /** Total poin yang dikumpulkan; selalu ≥ 0 (undefined dari Firestore dinormalisasi ke 0) */
  totalScore: number;
}
