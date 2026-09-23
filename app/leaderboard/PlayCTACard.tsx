// app/leaderboard/PlayCTACard.tsx
import Link from "next/link";

/**
 * Kartu ajakan bermain yang ditampilkan ketika pengguna tidak login
 * atau belum memiliki skor (totalScore = 0).
 * Komponen ini bersifat statis (tidak memerlukan 'use client').
 */
export default function PlayCTACard() {
  return (
    <div
      className="mt-6 rounded-2xl border-2 border-intblue bg-intblue-light p-6"
      aria-label="Mulai bermain untuk masuk leaderboard"
    >
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Ikon dekoratif */}
        <div className="shrink-0 w-14 h-14 rounded-2xl bg-intblue flex items-center justify-center text-3xl shadow-md select-none">
          🏆
        </div>

        {/* Teks */}
        <div className="flex-1 text-center sm:text-left">
          <h2 className="font-bold text-lg text-[#0f172a] mb-1"
            style={{ fontFamily: "var(--font-heading), system-ui, sans-serif" }}
          >
            Belum ada namamu di sini?
          </h2>
          <p className="text-slate-500 text-sm">
            Pelajari materi bilangan bulat dan mainkan game untuk mengumpulkan
            poin. Raih skor tertinggi dan masuk ke papan peringkat!
          </p>
        </div>

        {/* Tombol CTA */}
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <Link
            href="/materi"
            className="bg-intblue text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-intblue-dark transition-colors text-center"
          >
            Pelajari Materi
          </Link>
          <Link
            href="/game-virus"
            className="border-2 border-intblue text-intblue text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-intblue hover:text-white transition-colors text-center"
          >
            Main Sekarang
          </Link>
        </div>
      </div>
    </div>
  );
}
