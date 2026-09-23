/**
 * LeaderboardSkeleton
 *
 * Skeleton loading state untuk halaman leaderboard.
 * Dirender oleh LeaderboardClient saat:
 *  - useAuth() masih loading (status autentikasi belum diketahui)
 *  - Data Firestore sedang diambil
 *
 * Tidak ada "use client" — komponen ini adalah static markup tanpa hooks.
 * Semua blok menggunakan animate-pulse bg-slate-200 sesuai panduan desain.
 */

export default function LeaderboardSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* ── Page heading skeleton ───────────────────────────────────────── */}
      <div className="text-center space-y-3">
        <div className="bg-slate-200 animate-pulse rounded-full h-8 w-48 mx-auto" />
        <div className="bg-slate-200 animate-pulse rounded h-4 w-72 mx-auto" />
      </div>

      {/* ── Podium skeleton ─────────────────────────────────────────────── */}
      {/*
        Tiga kolom dengan ketinggian tiang berbeda:
          rank 1 — tengah (order-2), tiang h-36, avatar lg (80px)
          rank 2 — kiri   (order-1), tiang h-24, avatar md (48px)
          rank 3 — kanan  (order-3), tiang h-20, avatar md (48px)
      */}
      <section aria-label="Skeleton podium tiga besar">
        <div className="flex items-end justify-center gap-6">
          {/* Rank 2 — kiri */}
          <div className="order-1 flex flex-col items-center gap-2">
            {/* Avatar placeholder md=48px */}
            <div className="bg-slate-200 animate-pulse rounded-full w-12 h-12" />
            {/* Name */}
            <div className="bg-slate-200 animate-pulse rounded h-3 w-16" />
            {/* School */}
            <div className="bg-slate-200 animate-pulse rounded h-2.5 w-12" />
            {/* Score */}
            <div className="bg-slate-200 animate-pulse rounded h-3 w-14" />
            {/* Podium pillar */}
            <div className="bg-slate-200 animate-pulse rounded-t-2xl w-24 h-24" />
          </div>

          {/* Rank 1 — tengah */}
          <div className="order-2 flex flex-col items-center gap-2">
            {/* Crown placeholder */}
            <div className="bg-slate-200 animate-pulse rounded h-6 w-6" />
            {/* Avatar placeholder lg=80px */}
            <div className="bg-slate-200 animate-pulse rounded-full w-20 h-20" />
            {/* Name */}
            <div className="bg-slate-200 animate-pulse rounded h-3 w-20" />
            {/* School */}
            <div className="bg-slate-200 animate-pulse rounded h-2.5 w-16" />
            {/* Score */}
            <div className="bg-slate-200 animate-pulse rounded h-3 w-18" />
            {/* Podium pillar */}
            <div className="bg-slate-200 animate-pulse rounded-t-2xl w-28 h-36" />
          </div>

          {/* Rank 3 — kanan */}
          <div className="order-3 flex flex-col items-center gap-2">
            {/* Avatar placeholder md=48px */}
            <div className="bg-slate-200 animate-pulse rounded-full w-12 h-12" />
            {/* Name */}
            <div className="bg-slate-200 animate-pulse rounded h-3 w-16" />
            {/* School */}
            <div className="bg-slate-200 animate-pulse rounded h-2.5 w-12" />
            {/* Score */}
            <div className="bg-slate-200 animate-pulse rounded h-3 w-14" />
            {/* Podium pillar */}
            <div className="bg-slate-200 animate-pulse rounded-t-2xl w-24 h-20" />
          </div>
        </div>
      </section>

      {/* ── Table skeleton ──────────────────────────────────────────────── */}
      {/*
        10 baris, setiap baris memiliki kolom:
          rank badge | avatar | name + school | score
      */}
      <section aria-label="Skeleton tabel peringkat">
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-100">
            <div className="bg-slate-200 animate-pulse rounded h-4 w-24" />
          </div>

          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-50 last:border-0"
            >
              {/* Rank badge */}
              <div className="bg-slate-200 animate-pulse rounded-lg w-9 h-9 shrink-0" />

              {/* Avatar */}
              <div className="bg-slate-200 animate-pulse rounded-full w-10 h-10 shrink-0" />

              {/* Name + school */}
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="bg-slate-200 animate-pulse rounded h-3.5 w-32" />
                <div className="bg-slate-200 animate-pulse rounded h-2.5 w-20" />
              </div>

              {/* Score */}
              <div className="bg-slate-200 animate-pulse rounded h-4 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </section>

      {/* ── OwnRankCard skeleton ────────────────────────────────────────── */}
      {/*
        Satu baris kartu yang mencerminkan layout OwnRankCard:
          rank badge | avatar | name + school | score
        dengan border intblue yang di-grey-kan
      */}
      <section aria-label="Skeleton kartu peringkatmu">
        <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 flex items-center gap-4">
          {/* Rank badge */}
          <div className="bg-slate-200 animate-pulse rounded-xl w-12 h-12 shrink-0" />

          {/* Avatar */}
          <div className="bg-slate-200 animate-pulse rounded-full w-12 h-12 shrink-0" />

          {/* Name + school */}
          <div className="flex-1 space-y-2 min-w-0">
            <div className="bg-slate-200 animate-pulse rounded h-3.5 w-36" />
            <div className="bg-slate-200 animate-pulse rounded h-2.5 w-24" />
          </div>

          {/* Score */}
          <div className="bg-slate-200 animate-pulse rounded h-5 w-20 shrink-0" />
        </div>
      </section>
    </div>
  );
}
