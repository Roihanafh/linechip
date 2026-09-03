"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LEADERBOARD_DATA,
  LEVEL_STYLE,
  LEVELS,
  type Period,
  type Filter,
} from "@/constants/leaderboard";

const PODIUM_ORDER = [1, 0, 2];
const MEDAL = ["🥇", "🥈", "🥉"];
const MEDAL_BG = ["bg-yellow-400", "bg-slate-400", "bg-amber-500"];
const PODIUM_H = ["h-36", "h-24", "h-20"];
const RANK_ROW_BG = [
  "bg-yellow-50/60 border-yellow-100",
  "bg-slate-50 border-slate-100",
  "bg-amber-50/40 border-amber-100",
];

const TREND_ICON = {
  up: <span className="text-success text-xs font-bold">▲</span>,
  down: <span className="text-error text-xs font-bold">▼</span>,
  same: <span className="text-slate-300 text-xs">●</span>,
};

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("weekly");
  const [filter, setFilter] = useState<Filter>("all");

  const data = LEADERBOARD_DATA[period];
  const top3 = data.slice(0, 3);
  const rest = data.slice(3);
  const periodLabel =
    period === "weekly"
      ? "Minggu Ini"
      : period === "monthly"
      ? "Bulan Ini"
      : "Sepanjang Masa";

  const avgScore = Math.round(
    data.reduce((acc, s) => acc + s.score, 0) / data.length
  );
  const avgScoreLabel =
    avgScore >= 1000
      ? (avgScore / 1000).toFixed(1) + "k"
      : avgScore.toString();

  return (
    <div className="min-h-screen bg-surface py-10">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white border border-border rounded-full px-4 py-1.5 mb-4 shadow-sm">
            <span>🏆</span>
            <span className="text-sm font-semibold text-slate-600">Papan Peringkat</span>
          </div>
          <h1
            className="font-bold text-4xl text-[#0f172a] mb-2"
            style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
          >
            Leaderboard LineChip
          </h1>
          <p className="text-slate-500">Siapa penjuara matematika? Lihat rankingmu dan kejar posisi teratas!</p>
        </div>

        {/* Period tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white border border-border rounded-2xl p-1 flex gap-1 shadow-sm">
            {(
              [
                { id: "weekly", label: "Mingguan" },
                { id: "monthly", label: "Bulanan" },
                { id: "alltime", label: "Sepanjang Masa" },
              ] as { id: Period; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id)}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  period === tab.id
                    ? "bg-intblue text-white shadow-md"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Podium */}
        <div className="bg-gradient-to-br from-[#1E4FC4] via-intblue to-[#0f172a] rounded-3xl p-8 mb-6 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/5 rounded-full" />
            <div className="absolute -bottom-16 -right-12 w-80 h-80 bg-intpink/15 rounded-full" />
          </div>
          <p className="text-white/60 text-xs font-semibold text-center uppercase tracking-widest mb-8 relative z-10">
            ✦ Top 3 {periodLabel} ✦
          </p>
          <div className="flex items-end justify-center gap-6 relative z-10">
            {PODIUM_ORDER.map((idx) => {
              const s = top3[idx];
              const isGold = idx === 0;
              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center ${isGold ? "order-2" : idx === 1 ? "order-1" : "order-3"}`}
                >
                  {isGold && (
                    <div className="text-2xl mb-1 animate-bounce" style={{ animationDuration: "2s" }}>
                      👑
                    </div>
                  )}
                  <div className="relative mb-3">
                    <div
                      className="rounded-full flex items-center justify-center border-4 shadow-lg"
                      style={{
                        width: isGold ? 76 : 60,
                        height: isGold ? 76 : 60,
                        fontSize: isGold ? "2.2rem" : "1.7rem",
                        borderColor: isGold ? "#FDE68A" : idx === 1 ? "#CBD5E1" : "#FCD34D",
                        background: isGold ? "rgba(253,230,138,0.15)" : "rgba(255,255,255,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {s.avatar}
                    </div>
                    {s.badge && (
                      <div className="absolute -top-2 -right-1 text-base leading-none">{s.badge}</div>
                    )}
                  </div>
                  <p
                    className={`font-bold text-white text-center ${isGold ? "text-base" : "text-sm"} leading-tight mb-0.5`}
                    style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
                  >
                    {s.name.split(" ")[0]}
                  </p>
                  <p className="text-white/50 text-xs font-mono mb-1">Kelas {s.school}</p>
                  <p className="text-white/80 text-sm font-bold font-mono mb-3">
                    {s.score.toLocaleString()} pts
                  </p>
                  <div className={`w-24 sm:w-28 ${PODIUM_H[idx]} ${MEDAL_BG[idx]} rounded-t-2xl relative overflow-hidden flex flex-col items-center justify-start pt-3`}>
                    <div className="absolute inset-0 bg-white/15" />
                    <div className="absolute inset-x-0 top-0 h-1 bg-white/30 rounded-t-2xl" />
                    <span className="text-2xl relative z-10">{MEDAL[idx]}</span>
                    <span
                      className="text-sm font-black relative z-10 mt-1"
                      style={{
                        fontFamily: "var(--font-baloo2), system-ui, sans-serif",
                        color: isGold ? "#78350f" : idx === 1 ? "#374151" : "#451a03",
                      }}
                    >
                      #{idx + 1}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Siswa", val: "1.247", icon: "👥", color: "intblue" },
            { label: "Skor Rata-rata", val: avgScoreLabel, icon: "📊", color: "intpink" },
            { label: "Akurasi Terbaik", val: `${data[0].accuracy}%`, icon: "🎯", color: "intblue" },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border p-4 text-center shadow-sm">
              <div className="text-xl mb-1">{stat.icon}</div>
              <p
                className={`font-bold text-xl ${stat.color === "intblue" ? "text-intblue" : "text-intpink"}`}
                style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
              >
                {stat.val}
              </p>
              <p className="text-xs text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <span className="text-xs text-slate-400 font-medium shrink-0">Kategori:</span>
          {(
            [
              { id: "all", label: "Semua Mode" },
              { id: "garis", label: "📏 Garis Bilangan" },
              { id: "chip", label: "🔵 Model Chip" },
              { id: "game", label: "🎮 Game" },
            ] as { id: Filter; label: string }[]
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                filter === f.id
                  ? "bg-intblue text-white shadow-sm"
                  : "bg-white border border-border text-slate-600 hover:border-intblue/30 hover:text-intblue"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Rankings table */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
            <h2
              className="font-semibold text-lg text-[#0f172a]"
              style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
            >
              Peringkat Lengkap
            </h2>
            <span className="text-xs text-slate-400 bg-surface px-3 py-1 rounded-full border border-border">
              {periodLabel}
            </span>
          </div>

          {top3.map((s, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 border-b border-[#F8FAFC] ${RANK_ROW_BG[i]}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${RANK_ROW_BG[i]}`}>
                {MEDAL[i]}
              </div>
              <div className="w-9 h-9 rounded-full bg-intblue-light flex items-center justify-center text-xl shrink-0">
                {s.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-[#0f172a] text-sm">{s.name}</span>
                  {s.badge && <span className="text-sm">{s.badge}</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${LEVEL_STYLE[s.level]}`}>
                    {s.level}
                  </span>
                  <span className="hidden sm:block text-[10px] text-slate-300 font-medium">
                    Kelas {s.school}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-xs text-slate-400">⭐ {s.stars}</span>
                  <span className="text-xs text-slate-400">🔥 {s.streak} hari</span>
                  <span className="text-xs text-slate-400">🎯 {s.accuracy}%</span>
                </div>
              </div>
              <div className="text-right shrink-0 flex items-center gap-2">
                <div>{TREND_ICON[s.trend]}</div>
                <div>
                  <p
                    className="font-bold text-lg text-intblue"
                    style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
                  >
                    {s.score.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400">pts</p>
                </div>
              </div>
            </div>
          ))}

          <div className="px-5 py-2 bg-surface border-y border-[#E2E8F0] flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-slate-400 font-medium shrink-0">
              Peringkat 4–{data.length}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {rest.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-surface/60 transition-colors border-b border-[#F8FAFC] last:border-0"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-sm text-slate-500 shrink-0">
                {s.rank}
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xl shrink-0">
                {s.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-[#0f172a] text-sm truncate">{s.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${LEVEL_STYLE[s.level]}`}>
                    {s.level}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-400">⭐ {s.stars}</span>
                  <span className="text-xs text-slate-400">🔥 {s.streak}d</span>
                  <span className="text-xs text-slate-400">🎯 {s.accuracy}%</span>
                </div>
              </div>
              <div className="text-right shrink-0 flex items-center gap-2">
                <div>{TREND_ICON[s.trend]}</div>
                <div>
                  <p
                    className="font-bold text-base text-slate-700"
                    style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
                  >
                    {s.score.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400">pts</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Your rank card */}
        <div className="bg-white rounded-2xl border-2 border-intblue/20 p-4 mb-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-intblue-light flex items-center justify-center font-bold text-intblue text-sm shrink-0">
            ?
          </div>
          <div className="w-10 h-10 rounded-full bg-intblue-light flex items-center justify-center text-xl shrink-0">
            🙋
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-700 text-sm">Posisimu saat ini</p>
            <p className="text-xs text-slate-400">Mainkan game dan pelajari materi untuk masuk ke papan peringkat!</p>
          </div>
          <Link
            href="/materi"
            className="shrink-0 bg-intblue text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-intblue-dark transition-colors"
          >
            Mulai Belajar
          </Link>
        </div>

        {/* Level legend */}
        <div className="bg-white rounded-2xl border border-border p-5 mb-6">
          <h3
            className="font-semibold text-[#0f172a] mb-3"
            style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
          >
            🎖 Level & Syarat
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LEVELS.map((lv) => (
              <div key={lv.level} className="flex items-center gap-2 p-2">
                <span className="text-base">{lv.icon}</span>
                <div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LEVEL_STYLE[lv.level]}`}>
                    {lv.level}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">{lv.req}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-intblue to-intpink rounded-2xl p-6 text-center text-white overflow-hidden relative">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-8 -left-8 w-32 h-32 bg-white rounded-full" />
            <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white rounded-full" />
          </div>
          <p
            className="font-bold text-xl mb-2 relative z-10"
            style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
          >
            Siap naik peringkat?
          </p>
          <p className="text-white/75 text-sm mb-4 relative z-10">
            Mainkan game, kalahkan streakmu, dan raih gelar Grandmaster!
          </p>
          <Link
            href="/materi"
            className="bg-white text-intblue font-bold px-8 py-3 rounded-full hover:shadow-xl transition-all hover:scale-[1.03] relative z-10 inline-block"
          >
            Mulai Belajar
          </Link>
        </div>
      </div>
    </div>
  );
}