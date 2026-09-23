/**
 * Podium
 *
 * Menampilkan hierarki visual tiga besar leaderboard.
 *
 * Layout: flex items-end justify-center
 *   - Rank 1 → tengah (order-2), tiang h-36, Avatar size="lg"
 *   - Rank 2 → kiri   (order-1), tiang h-24, Avatar size="md"
 *   - Rank 3 → kanan  (order-3), tiang h-20, Avatar size="md"
 *
 * Ikon mahkota 👑 hanya muncul di atas slot rank 1.
 * Slot kosong tidak dirender jika array < 3 elemen.
 *
 * Tidak menggunakan "use client" — komponen presentasional murni.
 */

import Avatar from "@/components/profile/Avatar";
import type { LeaderboardEntry } from "@/features/leaderboard";

interface PodiumProps {
  /** 0–3 entri, sudah terurut ascending berdasarkan rank (index 0 = rank 1) */
  entries: LeaderboardEntry[];
}

/** Konfigurasi tampilan tiap slot podium */
const SLOT_CONFIG: Record<
  1 | 2 | 3,
  {
    order: string;
    pillarHeight: string;
    pillarColor: string;
    avatarSize: "lg" | "md";
    showCrown: boolean;
  }
> = {
  1: {
    order: "order-2",
    pillarHeight: "h-36",
    pillarColor: "bg-amber-400",
    avatarSize: "lg",
    showCrown: true,
  },
  2: {
    order: "order-1",
    pillarHeight: "h-24",
    pillarColor: "bg-slate-400",
    avatarSize: "md",
    showCrown: false,
  },
  3: {
    order: "order-3",
    pillarHeight: "h-20",
    pillarColor: "bg-amber-700",
    avatarSize: "md",
    showCrown: false,
  },
};

export default function Podium({ entries }: PodiumProps) {
  if (entries.length === 0) return null;

  return (
    <div
      className="flex items-end justify-center gap-4"
      aria-label="Podium tiga besar"
    >
      {entries.map((entry) => {
        const rank = entry.rank as 1 | 2 | 3;
        const config = SLOT_CONFIG[rank];

        // Jika rank di luar 1–3 (entri tidak terduga), lewati
        if (!config) return null;

        return (
          <div
            key={entry.uid}
            className={`${config.order} flex flex-col items-center gap-1`}
          >
            {/* Mahkota — hanya rank 1 */}
            {config.showCrown && (
              <span
                className="text-2xl leading-none"
                role="img"
                aria-label="Mahkota juara pertama"
              >
                👑
              </span>
            )}

            {/* Avatar */}
            <Avatar
              photoURL={entry.photoURL}
              name={entry.name}
              size={config.avatarSize}
            />

            {/* Info pemain */}
            <div className="flex flex-col items-center text-center max-w-[6rem]">
              <span className="text-sm font-semibold text-slate-800 leading-tight truncate w-full">
                {entry.name}
              </span>
              <span className="text-xs text-slate-500 truncate w-full">
                {entry.school}
              </span>
              <span className="text-sm font-bold text-intblue mt-0.5">
                {entry.totalScore.toLocaleString("id-ID")}
              </span>
            </div>

            {/* Tiang podium */}
            <div
              className={`${config.pillarHeight} ${config.pillarColor} w-24 rounded-t-xl flex items-start justify-center pt-2`}
              aria-hidden="true"
            >
              <span className="text-white font-bold text-lg">{rank}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
