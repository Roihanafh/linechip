"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  DecomposedChips,
  chipClasses,
  TIERS,
  TIER_LABEL,
  type Tier,
  type AnimPhase,
} from "@/components/TieredChips";

interface HistoryEntry {
  type: "ab" | "ku";
  tier: Tier;
  bil: 1 | 2;
}

const isTier = (n: number): n is Tier => [1, 10, 100, 1000].includes(n);

function signed(v: number): string {
  return v > 0 ? `+${v.toLocaleString("id-ID")}` : v.toLocaleString("id-ID");
}

function chipType(v: number): "ab" | "ku" {
  return v >= 0 ? "ab" : "ku";
}

export default function GameVirusPage() {
  const [bil1Value, setBil1Value] = useState(0);
  const [bil2Value, setBil2Value] = useState(0);
  const [resultValue, setResultValue] = useState<number | null>(null);
  const [phase, setPhase] = useState<AnimPhase>("idle");
  const [dragOverZone, setDragOverZone] = useState<null | 1 | 2>(null);
  const [abTarget, setAbTarget] = useState<1 | 2>(1);
  const [kuTarget, setKuTarget] = useState<1 | 2>(2);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const hasChips = bil1Value !== 0 || bil2Value !== 0;
  const canCompute = hasChips && phase === "idle" && resultValue === null;
  const poolDisabled = phase !== "idle" || resultValue !== null;

  const addToBilangan = useCallback(
    (bil: 1 | 2, type: "ab" | "ku", tier: Tier) => {
      if (phase !== "idle" || resultValue !== null) return;
      const delta = type === "ab" ? tier : -tier;
      if (bil === 1) setBil1Value((v) => v + delta);
      else setBil2Value((v) => v + delta);
      setHistory((h) => [...h, { type, tier, bil }]);
    },
    [phase, resultValue]
  );

  const undoLast = () => {
    if (!history.length || phase !== "idle") return;
    const last = history[history.length - 1];
    const delta = last.type === "ab" ? last.tier : -last.tier;
    if (last.bil === 1) setBil1Value((v) => v - delta);
    else setBil2Value((v) => v - delta);
    setHistory((h) => h.slice(0, -1));
  };

  const handleDragStart = (type: "ab" | "ku", tier: Tier) => (e: React.DragEvent) => {
    e.dataTransfer.setData("itemType", type);
    e.dataTransfer.setData("itemTier", String(tier));
    e.dataTransfer.effectAllowed = "copy";
  };

  const makeDropHandler = (bil: 1 | 2) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverZone(null);
    const type = e.dataTransfer.getData("itemType") as "ab" | "ku";
    const tierNum = Number(e.dataTransfer.getData("itemTier"));
    if ((type === "ab" || type === "ku") && isTier(tierNum)) {
      addToBilangan(bil, type, tierNum);
    }
  };

  const handleCompute = () => {
    if (!canCompute) return;
    const r = bil1Value + bil2Value;
    setPhase("charging");
    setTimeout(() => {
      setPhase("exploding");
      setTimeout(() => {
        setResultValue(r);
        setBil1Value(0);
        setBil2Value(0);
        setPhase("settled");
        setTimeout(() => setPhase("idle"), 1400);
      }, 700);
    }, 650);
  };

  const reset = () => {
    setBil1Value(0);
    setBil2Value(0);
    setResultValue(null);
    setPhase("idle");
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/materi"
              className="p-2 rounded-xl bg-white border border-border hover:bg-slate-50 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <div>
              <h1
                className="font-bold text-2xl text-[#0f172a]"
                style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
              >
                Antibodi vs Kuman 🧬
              </h1>
              <p className="text-sm text-slate-500">
                Isi <strong>Bilangan 1</strong> dan <strong>Bilangan 2</strong> dengan chip Ab (+) atau Ku (−), lalu hitung hasilnya
              </p>
            </div>
          </div>
        </div>

        {/* Tier legend */}
        <div className="bg-white rounded-2xl border border-border p-3 mb-4 flex flex-wrap gap-x-5 gap-y-2 items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">Tingkatan:</span>
          <div className="flex gap-4 items-center flex-wrap">
            {TIERS.map((t) => (
              <div key={`ab-${t}`} className="flex items-center gap-1.5">
                <div className={chipClasses("ab", t)}>{TIER_LABEL[t]}</div>
                <span className="text-xs text-slate-500">= +{t.toLocaleString("id-ID")}</span>
              </div>
            ))}
            <div className="w-px h-4 bg-border shrink-0" />
            {TIERS.map((t) => (
              <div key={`ku-${t}`} className="flex items-center gap-1.5">
                <div className={chipClasses("ku", t)}>{TIER_LABEL[t]}</div>
                <span className="text-xs text-slate-500">= &#8722;{t.toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3-col game layout */}
        <div className="grid grid-cols-[200px_1fr_200px] gap-4 mb-5">
          {/* Kolam Antibodi */}
          <div className="bg-white rounded-2xl border-2 border-intblue/25 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-intblue rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0">Ab</div>
              <div>
                <p className="font-bold text-intblue text-sm leading-tight" style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>Kolam Antibodi</p>
                <p className="text-[10px] text-slate-400">positif (+)</p>
              </div>
            </div>
            {/* Target toggle */}
            <div className="flex items-center gap-1 mb-3">
              <span className="text-[10px] text-slate-400 mr-1">Kirim ke:</span>
              {([1, 2] as const).map((b) => (
                <button
                  key={b}
                  disabled={poolDisabled}
                  onClick={() => setAbTarget(b)}
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all ${
                    abTarget === b
                      ? "bg-intblue text-white"
                      : "bg-intblue-light text-intblue hover:bg-intblue/20"
                  } ${poolDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  Bil.{b}
                </button>
              ))}
            </div>
            <div className="flex-1 space-y-2">
              {([1000, 100, 10, 1] as Tier[]).map((tier) => (
                <div
                  key={tier}
                  draggable={!poolDisabled}
                  onClick={() => addToBilangan(abTarget, "ab", tier)}
                  onDragStart={handleDragStart("ab", tier)}
                  className={`flex items-center gap-2 p-2 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-150 select-none bg-intblue-light border-intblue/20 hover:border-intblue hover:shadow-sm ${
                    poolDisabled ? "opacity-40 pointer-events-none" : "hover:scale-[1.02] active:scale-[0.98]"
                  }`}
                >
                  <div className={chipClasses("ab", tier)}>{TIER_LABEL[tier]}</div>
                  <div className="flex-1">
                    <p className="font-bold text-sm leading-tight text-intblue">+{tier >= 1000 ? "1.000" : tier}</p>
                    <p className="text-[9px] text-slate-400">&rarr; Bil.{abTarget}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reaktor Netral */}
          <div
            className={`rounded-2xl border-2 p-4 flex flex-col transition-all duration-300 relative ${
              phase === "charging"
                ? "border-yellow-400 bg-yellow-50"
                : phase === "settled"
                ? "border-success/60 bg-success/5"
                : hasChips
                ? "border-slate-300 bg-white"
                : "border-dashed border-slate-300 bg-white"
            }`}
          >
            {/* Flash overlay */}
            <div
              className={`absolute inset-0 rounded-[inherit] z-10 pointer-events-none transition-opacity duration-500 bg-white ${
                phase === "exploding" ? "opacity-90" : "opacity-0"
              }`}
            />

            <div className="text-center mb-3">
              <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-intblue to-intpink text-white text-xs font-bold px-3 py-1 rounded-full mb-1">
                ⚗️ REAKTOR NETRAL
              </div>
              <p
                className={`text-xs font-semibold ${
                  phase === "charging"
                    ? "text-yellow-600 animate-pulse"
                    : phase === "exploding"
                    ? "text-orange-600"
                    : phase === "settled"
                    ? "text-success"
                    : "text-slate-400"
                }`}
              >
                {phase === "charging"
                  ? "⚡ Mengisi daya..."
                  : phase === "exploding"
                  ? "💥 Menghitung..."
                  : phase === "settled"
                  ? "✓ Hasil ditemukan!"
                  : "Isi Bilangan 1 dan Bilangan 2"}
              </p>
            </div>

            {resultValue !== null && phase === "idle" ? (
              <div className="flex-1 flex flex-col items-center justify-center py-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Hasil</p>
                <p
                  className={`font-black text-4xl mb-3 ${
                    resultValue > 0 ? "text-intblue" : resultValue < 0 ? "text-intpink" : "text-success"
                  }`}
                  style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
                >
                  {resultValue === 0 ? "0" : signed(resultValue)}
                </p>
                {resultValue !== 0 && (
                  <div className="flex justify-center">
                    <DecomposedChips value={Math.abs(resultValue)} type={chipType(resultValue)} maxPerTier={6} />
                  </div>
                )}
                {resultValue === 0 && (
                  <div className="text-center">
                    <p className="text-4xl">🎉</p>
                    <p className="text-success font-semibold text-sm mt-1">Tepat nol!</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex-1 flex flex-col gap-2 mb-3">
                  {/* Bilangan 1 zone */}
                  <div
                    className={`flex-1 rounded-xl border-2 p-3 transition-all duration-200 relative ${
                      dragOverZone === 1
                        ? "border-intblue bg-intblue/5 scale-[1.01] shadow-md"
                        : bil1Value !== 0
                        ? bil1Value > 0
                          ? "border-intblue/40 bg-intblue-light/30"
                          : "border-intpink/40 bg-intpink-light/30"
                        : "border-dashed border-slate-200 bg-slate-50/50"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragOverZone(1); }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverZone(null); }}
                    onDrop={makeDropHandler(1)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white ${bil1Value > 0 ? "bg-intblue" : bil1Value < 0 ? "bg-intpink" : "bg-slate-300"}`}>1</div>
                        <span className="text-[10px] font-semibold text-slate-400">Bilangan 1</span>
                      </div>
                      <span className={`font-mono font-bold text-sm ${bil1Value > 0 ? "text-intblue" : bil1Value < 0 ? "text-intpink" : "text-slate-300"}`}>
                        {bil1Value !== 0 ? signed(bil1Value) : "—"}
                      </span>
                    </div>
                    {Math.abs(bil1Value) > 0 ? (
                      <DecomposedChips value={Math.abs(bil1Value)} type={chipType(bil1Value)} phase={phase} maxPerTier={6} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-3 text-slate-300">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                          <circle cx="14" cy="14" r="12" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 2.5"/>
                          <path d="M9 14h10M14 9v10" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <p className="text-[9px] mt-1 text-center">Seret Ab (+) atau Ku (&#8722;)<br/>ke zona ini</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-slate-400 font-bold text-base">+</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  {/* Bilangan 2 zone */}
                  <div
                    className={`flex-1 rounded-xl border-2 p-3 transition-all duration-200 relative ${
                      dragOverZone === 2
                        ? "border-intblue bg-intblue/5 scale-[1.01] shadow-md"
                        : bil2Value !== 0
                        ? bil2Value > 0
                          ? "border-intblue/40 bg-intblue-light/30"
                          : "border-intpink/40 bg-intpink-light/30"
                        : "border-dashed border-slate-200 bg-slate-50/50"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragOverZone(2); }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverZone(null); }}
                    onDrop={makeDropHandler(2)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white ${bil2Value > 0 ? "bg-intblue" : bil2Value < 0 ? "bg-intpink" : "bg-slate-300"}`}>2</div>
                        <span className="text-[10px] font-semibold text-slate-400">Bilangan 2</span>
                      </div>
                      <span className={`font-mono font-bold text-sm ${bil2Value > 0 ? "text-intblue" : bil2Value < 0 ? "text-intpink" : "text-slate-300"}`}>
                        {bil2Value !== 0 ? signed(bil2Value) : "—"}
                      </span>
                    </div>
                    {Math.abs(bil2Value) > 0 ? (
                      <DecomposedChips value={Math.abs(bil2Value)} type={chipType(bil2Value)} phase={phase} maxPerTier={6} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-3 text-slate-300">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                          <circle cx="14" cy="14" r="12" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 2.5"/>
                          <path d="M9 14h10M14 9v10" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <p className="text-[9px] mt-1 text-center">Seret Ab (+) atau Ku (&#8722;)<br/>ke zona ini</p>
                      </div>
                    )}
                  </div>
                </div>

                {hasChips && (
                  <div className="bg-surface rounded-xl px-3 py-2 mb-3 text-center font-mono text-sm">
                    <span className={bil1Value >= 0 ? "text-intblue font-bold" : "text-intpink font-bold"}>
                      {bil1Value !== 0 ? signed(bil1Value) : "0"}
                    </span>
                    <span className="text-slate-400 mx-1.5">+</span>
                    <span className={bil2Value >= 0 ? "text-intblue font-bold" : "text-intpink font-bold"}>
                      {bil2Value !== 0 ? (bil2Value < 0 ? `(${signed(bil2Value)})` : signed(bil2Value)) : "0"}
                    </span>
                    <span className="text-slate-400 mx-1.5">=</span>
                    <span className="text-slate-300 font-bold">?</span>
                  </div>
                )}
              </>
            )}

            <div className="pt-3 border-t border-dashed border-slate-200 space-y-2">
              {resultValue !== null ? (
                <button
                  onClick={reset}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-success/10 text-success border border-success/30 hover:bg-success/20 transition-colors"
                >
                  ↺ Hitung Lagi
                </button>
              ) : (
                <button
                  onClick={handleCompute}
                  disabled={!canCompute}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                    canCompute
                      ? "bg-gradient-to-r from-intblue to-intpink text-white hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  } ${phase === "charging" ? "animate-pulse" : ""}`}
                >
                  {phase === "charging"
                    ? "⚡ Mengisi daya..."
                    : phase === "exploding"
                    ? "💥 Menghitung!"
                    : phase === "settled"
                    ? "✓ Selesai!"
                    : canCompute
                    ? "⚡ Hitung Hasil"
                    : "Isi bilangan dulu"}
                </button>
              )}

              {history.length > 0 && phase === "idle" && resultValue === null && (
                <button
                  onClick={undoLast}
                  className="w-full py-2 rounded-xl text-xs text-slate-400 hover:text-slate-600 border border-border hover:bg-slate-50 transition-colors"
                >
                  ↩ Urungkan terakhir
                </button>
              )}
            </div>
          </div>

          {/* Kolam Kuman */}
          <div className="bg-white rounded-2xl border-2 border-intpink/25 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-1 flex-row-reverse">
              <div className="w-8 h-8 bg-intpink rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0">Ku</div>
              <div className="flex-1 text-right">
                <p className="font-bold text-intpink text-sm leading-tight" style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>Kolam Kuman</p>
                <p className="text-[10px] text-slate-400">negatif (&#8722;)</p>
              </div>
            </div>
            {/* Ku target toggle */}
            <div className="flex justify-end mb-1">
              <div className="flex items-center gap-1 mb-3">
                <span className="text-[10px] text-slate-400 mr-1">Kirim ke:</span>
                {([1, 2] as const).map((b) => (
                  <button
                    key={b}
                    disabled={poolDisabled}
                    onClick={() => setKuTarget(b)}
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all ${
                      kuTarget === b
                        ? "bg-intpink text-white"
                        : "bg-intpink-light text-intpink hover:bg-intpink/20"
                    } ${poolDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    Bil.{b}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {([1000, 100, 10, 1] as Tier[]).map((tier) => (
                <div
                  key={tier}
                  draggable={!poolDisabled}
                  onClick={() => addToBilangan(kuTarget, "ku", tier)}
                  onDragStart={handleDragStart("ku", tier)}
                  className={`flex items-center gap-2 p-2 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-150 select-none bg-intpink-light border-intpink/20 hover:border-intpink hover:shadow-sm flex-row-reverse ${
                    poolDisabled ? "opacity-40 pointer-events-none" : "hover:scale-[1.02] active:scale-[0.98]"
                  }`}
                >
                  <div className={chipClasses("ku", tier)}>{TIER_LABEL[tier]}</div>
                  <div className="flex-1 text-right">
                    <p className="font-bold text-sm leading-tight text-intpink">&#8722;{tier >= 1000 ? "1.000" : tier}</p>
                    <p className="text-[9px] text-slate-400">&rarr; Bil.{kuTarget}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Result equation summary */}
        {resultValue !== null && phase === "idle" && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-5 mb-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3 text-center">
              Persamaan Lengkap
            </p>
            <div className="text-center font-mono flex items-baseline justify-center gap-2 flex-wrap">
              <span className={`font-bold text-xl ${bil1Value >= 0 ? "text-intblue" : "text-intpink"}`}>
                {signed(bil1Value)}
              </span>
              <span className="text-slate-400 text-xl">+</span>
              <span className={`font-bold text-xl ${bil2Value >= 0 ? "text-intblue" : "text-intpink"}`}>
                {bil2Value < 0 ? `(${signed(bil2Value)})` : signed(bil2Value)}
              </span>
              <span className="text-slate-400 text-xl">=</span>
              <span
                className={`font-bold text-2xl ${
                  resultValue > 0 ? "text-intblue" : resultValue < 0 ? "text-intpink" : "text-success"
                }`}
              >
                {resultValue === 0 ? "0 ✓" : signed(resultValue)}
              </span>
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={reset}
            className="flex items-center gap-2 border border-border text-slate-600 font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7A5 5 0 1 0 7 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M7 2L4.5 0v4z" fill="currentColor"/>
            </svg>
            Reset Ulang
          </button>
          <div className="flex gap-3">
            <Link href="/materi" className="text-sm text-slate-400 hover:text-slate-600 transition-colors px-3 py-2.5">
              ← Materi
            </Link>
            <Link
              href="/leaderboard"
              className="bg-intblue text-white font-bold px-5 py-2.5 rounded-full hover:bg-intblue-dark transition-colors flex items-center gap-2"
            >
              🏆 Leaderboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}