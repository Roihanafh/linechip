// app/game-virus/page.tsx
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  TIERS,
  type Tier,
  type AnimPhase,
} from "@/components/TieredChips";
import {
  AntibodyCharacter,
  VirusCharacter,
  CharacterChips,
  TIER_TO_PLACE,
  CHAR_NAMES,
  dominantPlace,
  type PlaceValue,
} from "@/components/game/CharacterSVGs";

interface HistoryEntry {
  type: "ab" | "ku";
  tier: Tier;
  bil: 1 | 2;
}

const isTier = (n: number): n is Tier => [1, 10, 100, 1000].includes(n);

function signed(v: number): string {
  return v > 0 ? `+${v.toLocaleString("id-ID")}` : v.toLocaleString("id-ID");
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
  const darkArena = hasChips && resultValue === null;

  const addToBilangan = useCallback(
    (bil: 1 | 2, type: "ab" | "ku", tier: Tier) => {
      if (phase !== "idle" || resultValue !== null) return;
      const delta = type === "ab" ? tier : -tier;
      if (bil === 1) setBil1Value((v) => v + delta);
      else setBil2Value((v) => v + delta);
      setHistory((h) => [...h, { type, tier, bil }]);
    },
    [phase, resultValue],
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

  function TargetToggle({
    target,
    setTarget,
    color,
  }: {
    target: 1 | 2;
    setTarget: (t: 1 | 2) => void;
    color: "intblue" | "intpink";
  }) {
    return (
      <div className="flex items-center gap-1 mb-3">
        <span className="text-[10px] text-slate-400 mr-1">Kirim ke:</span>
        {([1, 2] as const).map((b) => (
          <button
            key={b}
            disabled={poolDisabled}
            onClick={() => setTarget(b)}
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all ${
              target === b
                ? color === "intblue"
                  ? "bg-intblue text-white"
                  : "bg-intpink text-white"
                : color === "intblue"
                ? "bg-intblue-light text-intblue hover:bg-intblue/20"
                : "bg-intpink-light text-intpink hover:bg-intpink/20"
            } ${poolDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            Bil.{b}
          </button>
        ))}
      </div>
    );
  }

  function PoolButton({ type, tier }: { type: "ab" | "ku"; tier: Tier }) {
    const isAb = type === "ab";
    const target = isAb ? abTarget : kuTarget;
    const place = TIER_TO_PLACE[tier];
    const charName = CHAR_NAMES[type][place];
    const valueLabel = tier >= 1000 ? "1.000" : String(tier);
    return (
      <div
        draggable={!poolDisabled}
        onClick={() => addToBilangan(target, type, tier)}
        onDragStart={handleDragStart(type, tier)}
        className={`flex items-center gap-2 p-2 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-150 select-none ${
          isAb
            ? "bg-intblue-light border-intblue/20 hover:border-intblue hover:shadow-sm"
            : "bg-intpink-light border-intpink/20 hover:border-intpink hover:shadow-sm"
        } ${poolDisabled ? "opacity-40 pointer-events-none" : "hover:scale-[1.02] active:scale-[0.98]"}`}
      >
        {/* SVG character — large and prominent */}
        <div className="w-11 h-11 shrink-0">
          {isAb
            ? <AntibodyCharacter type={place} uid={`pool-ab-${tier}`} />
            : <VirusCharacter type={place} uid={`pool-ku-${tier}`} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm leading-tight ${isAb ? "text-intblue" : "text-intpink"}`}>
            {isAb ? "+" : "−"}{valueLabel}
          </p>
          <p className="text-[9px] text-slate-500 truncate">{charName}</p>
          <p className="text-[9px] text-slate-400">→ Bil.{target}</p>
        </div>
      </div>
    );
  }

  function BilanganZone({ bil, value }: { bil: 1 | 2; value: number }) {
    const isDragTarget = dragOverZone === bil;
    const absVal = Math.abs(value);
    const charType: "ab" | "ku" = value >= 0 ? "ab" : "ku";
    const place = dominantPlace(value);

    return (
      <div
        className={`flex-1 rounded-xl border-2 p-3 transition-all duration-300 relative ${
          isDragTarget
            ? "border-intblue bg-intblue/10 scale-[1.01] shadow-md"
            : darkArena
              ? value !== 0
                ? value > 0
                  ? "border-intblue/50 bg-blue-950/40"
                  : "border-rose-500/50 bg-rose-950/40"
                : "border-dashed border-slate-600 bg-white/5"
              : value !== 0
                ? value > 0
                  ? "border-intblue/40 bg-intblue-light/30"
                  : "border-intpink/40 bg-intpink-light/30"
                : "border-dashed border-slate-200 bg-slate-50/50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOverZone(bil); }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverZone(null);
        }}
        onDrop={makeDropHandler(bil)}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white ${
              value > 0 ? "bg-intblue" : value < 0 ? "bg-intpink" : darkArena ? "bg-slate-600" : "bg-slate-300"
            }`}>
              {bil}
            </div>
            {absVal > 0 && (
              <div className="w-7 h-7 shrink-0">
                {value > 0
                  ? <AntibodyCharacter type={place} uid={`zone${bil}-ab`} />
                  : <VirusCharacter type={place} uid={`zone${bil}-ku`} />
                }
              </div>
            )}
            <span className={`text-[10px] font-semibold ${darkArena ? "text-slate-400" : "text-slate-400"}`}>
              Bilangan {bil}
            </span>
          </div>
          <span className={`font-mono font-bold text-sm ${
            value > 0 ? "text-intblue" : value < 0 ? "text-intpink" : darkArena ? "text-slate-600" : "text-slate-300"
          }`}>
            {value !== 0 ? signed(value) : "—"}
          </span>
        </div>

        {/* Character chips or empty state */}
        {absVal > 0 ? (
          <CharacterChips
            value={absVal}
            type={charType}
            phase={phase}
            maxPerTier={6}
            size="sm"
            uidPrefix={`zone${bil}`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-3">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="12" stroke={darkArena ? "#475569" : "#CBD5E1"} strokeWidth="1.5" strokeDasharray="3 2.5" />
              <path d="M9 14h10M14 9v10" stroke={darkArena ? "#475569" : "#CBD5E1"} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className={`text-[9px] mt-1 text-center ${darkArena ? "text-slate-600" : "text-slate-300"}`}>
              Seret Ab (+) atau Ku (−)<br />ke zona ini
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-full bg-surface overflow-auto">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/materi"
              className="p-2 rounded-xl bg-white border border-border hover:bg-slate-50 transition-colors"
              aria-label="Kembali ke Materi"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <div>
              <h1 className="font-heading font-bold text-2xl text-[#0f172a]">Antibodi vs Kuman 🧬</h1>
              <p className="text-sm text-slate-500">
                Isi <strong>Bilangan 1</strong> dan <strong>Bilangan 2</strong> dengan karakter Ab (+) atau Ku (−), lalu hitung hasilnya
              </p>
            </div>
          </div>
          {/* Live VS preview */}
          {bil1Value !== 0 && bil2Value !== 0 && (
            <div className="hidden sm:flex items-center gap-2 shrink-0 bg-[#0f172a] rounded-2xl px-3 py-2 border border-[#1e293b]">
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-9 h-9">
                  {bil1Value > 0
                    ? <AntibodyCharacter type={dominantPlace(bil1Value)} uid="hdr-b1" />
                    : <VirusCharacter type={dominantPlace(bil1Value)} uid="hdr-b1" />
                  }
                </div>
                <span className={`font-mono text-[9px] font-bold ${bil1Value > 0 ? "text-blue-400" : "text-rose-400"}`}>
                  {signed(bil1Value)}
                </span>
              </div>
              <span className="font-mono font-bold text-white/30 text-sm px-1">vs</span>
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-9 h-9">
                  {bil2Value > 0
                    ? <AntibodyCharacter type={dominantPlace(bil2Value)} uid="hdr-b2" />
                    : <VirusCharacter type={dominantPlace(bil2Value)} uid="hdr-b2" />
                  }
                </div>
                <span className={`font-mono text-[9px] font-bold ${bil2Value > 0 ? "text-blue-400" : "text-rose-400"}`}>
                  {signed(bil2Value)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tier legend — SVG characters, no chip badges */}
        <div className="bg-white rounded-2xl border border-border p-4 mb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">Tingkatan Karakter:</p>
          {/* Antibodi row */}
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-intblue" />
              <span className="text-[10px] font-semibold text-intblue uppercase tracking-wide">Antibodi (positif +)</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {TIERS.map((t) => {
                const place = TIER_TO_PLACE[t];
                return (
                  <div key={t} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-intblue-light/40 border border-intblue/10">
                    <div className="w-12 h-12">
                      <AntibodyCharacter type={place} uid={`leg-ab-${t}`} />
                    </div>
                    <span className="text-[10px] font-bold text-intblue">+{t.toLocaleString("id-ID")}</span>
                    <span className="text-[8px] text-slate-500 text-center leading-tight">{CHAR_NAMES.ab[place]}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Kuman row */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-intpink" />
              <span className="text-[10px] font-semibold text-intpink uppercase tracking-wide">Kuman (negatif −)</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {TIERS.map((t) => {
                const place = TIER_TO_PLACE[t];
                return (
                  <div key={t} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-intpink-light/40 border border-intpink/10">
                    <div className="w-12 h-12">
                      <VirusCharacter type={place} uid={`leg-ku-${t}`} />
                    </div>
                    <span className="text-[10px] font-bold text-intpink">−{t.toLocaleString("id-ID")}</span>
                    <span className="text-[8px] text-slate-500 text-center leading-tight">{CHAR_NAMES.ku[place]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3-col game layout */}
        <div className="grid grid-cols-[200px_1fr_200px] gap-4 mb-5">

          {/* Kolam Antibodi */}
          <div className="bg-white rounded-2xl border-2 border-intblue/25 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-intblue rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0">Ab</div>
              <div>
                <p className="font-heading font-bold text-intblue text-sm leading-tight">Kolam Antibodi</p>
                <p className="text-[10px] text-slate-400">positif (+)</p>
              </div>
            </div>
            <TargetToggle target={abTarget} setTarget={setAbTarget} color="intblue" />
            <div className="flex-1 space-y-2">
              {([1000, 100, 10, 1] as Tier[]).map((tier) => (
                <PoolButton key={tier} type="ab" tier={tier} />
              ))}
            </div>
          </div>

          {/* Reaktor Netral */}
          <div className={`rounded-2xl border-2 p-4 flex flex-col transition-all duration-500 relative ${
            phase === "charging" ? "border-yellow-400 bg-yellow-50"
            : phase === "settled" ? "border-success/60 bg-success/5"
            : darkArena ? "border-[#1e293b] bg-[#0f172a]"
            : "border-dashed border-slate-300 bg-white"
          }`}>
            {/* Flash overlay */}
            <div
              className={`absolute inset-0 rounded-[inherit] z-10 pointer-events-none transition-opacity duration-500 bg-white ${
                phase === "exploding" ? "opacity-90" : "opacity-0"
              }`}
            />

            {/* Battle header */}
            {darkArena && phase === "idle" && (
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex flex-col items-center gap-0.5">
                  <div className={`w-10 h-10 ${bil1Value !== 0 ? "battle-float" : "opacity-20"}`}>
                    {bil1Value > 0
                      ? <AntibodyCharacter type={dominantPlace(bil1Value)} uid="arena-b1" />
                      : bil1Value < 0
                        ? <VirusCharacter type={dominantPlace(bil1Value)} uid="arena-b1" />
                        : <AntibodyCharacter type="satuan" uid="arena-b1-empty" />
                    }
                  </div>
                  <span className={`font-mono text-[9px] font-bold ${bil1Value > 0 ? "text-blue-400" : bil1Value < 0 ? "text-rose-400" : "text-slate-600"}`}>
                    {bil1Value !== 0 ? signed(bil1Value) : "Bil.1"}
                  </span>
                </div>
                <div className="text-center">
                  <p className="font-mono font-bold text-white/20 text-lg leading-none">VS</p>
                  <p className="text-[9px] font-bold mt-1 text-slate-500">⚗️</p>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <div className={`w-10 h-10 ${bil2Value !== 0 ? "battle-float" : "opacity-20"}`} style={{ animationDelay: "0.3s" }}>
                    {bil2Value > 0
                      ? <AntibodyCharacter type={dominantPlace(bil2Value)} uid="arena-b2" />
                      : bil2Value < 0
                        ? <VirusCharacter type={dominantPlace(bil2Value)} uid="arena-b2" />
                        : <VirusCharacter type="satuan" uid="arena-b2-empty" />
                    }
                  </div>
                  <span className={`font-mono text-[9px] font-bold ${bil2Value > 0 ? "text-blue-400" : bil2Value < 0 ? "text-rose-400" : "text-slate-600"}`}>
                    {bil2Value !== 0 ? signed(bil2Value) : "Bil.2"}
                  </span>
                </div>
              </div>
            )}

            {/* Light mode title */}
            {!darkArena && (
              <div className="text-center mb-3">
                <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-intblue to-intpink text-white text-xs font-bold px-3 py-1 rounded-full mb-1">
                  ⚡️ REAKTOR NETRAL
                </div>
                <p className="text-xs font-semibold text-slate-400">Isi Bilangan 1 dan Bilangan 2</p>
              </div>
            )}

            {/* Charging/exploding */}
            {darkArena && (phase === "charging" || phase === "exploding") && (
              <div className="text-center mb-3">
                <p className={`text-xs font-semibold ${phase === "charging" ? "text-yellow-400 animate-pulse" : "text-orange-400"}`}>
                  {phase === "charging" ? "⚡ Mengisi daya..." : "💥 Menghitung..."}
                </p>
              </div>
            )}

            {/* Result */}
            {resultValue !== null && phase === "idle" ? (
              <div className="flex-1 flex flex-col items-center justify-center py-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Hasil</p>
                {resultValue !== 0 && (
                  <div className="w-16 h-16 mb-2 victory-pop">
                    {resultValue > 0
                      ? <AntibodyCharacter type={dominantPlace(resultValue)} uid="result-char" />
                      : <VirusCharacter type={dominantPlace(resultValue)} uid="result-char" />
                    }
                  </div>
                )}
                <p className={`font-heading font-black text-4xl mb-3 ${
                  resultValue > 0 ? "text-intblue" : resultValue < 0 ? "text-intpink" : "text-success"
                }`}>
                  {resultValue === 0 ? "0" : signed(resultValue)}
                </p>
                {resultValue !== 0 && (
                  <div className="flex justify-center">
                    <CharacterChips
                      value={Math.abs(resultValue)}
                      type={resultValue > 0 ? "ab" : "ku"}
                      size="sm"
                      uidPrefix="result"
                      maxPerTier={6}
                    />
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
                  <BilanganZone bil={1} value={bil1Value} />
                  <div className="flex items-center justify-center gap-2">
                    <div className={`flex-1 h-px ${darkArena ? "bg-slate-700" : "bg-slate-200"}`} />
                    <span className={`font-bold text-base ${darkArena ? "text-slate-500" : "text-slate-400"}`}>+</span>
                    <div className={`flex-1 h-px ${darkArena ? "bg-slate-700" : "bg-slate-200"}`} />
                  </div>
                  <BilanganZone bil={2} value={bil2Value} />
                </div>
                {hasChips && (
                  <div className={`rounded-xl px-3 py-2 mb-3 text-center font-mono text-sm ${darkArena ? "bg-white/5 border border-white/10" : "bg-surface"}`}>
                    <span className={bil1Value >= 0 ? "text-intblue font-bold" : "text-intpink font-bold"}>
                      {bil1Value !== 0 ? signed(bil1Value) : "0"}
                    </span>
                    <span className={`mx-1.5 ${darkArena ? "text-slate-500" : "text-slate-400"}`}>+</span>
                    <span className={bil2Value >= 0 ? "text-intblue font-bold" : "text-intpink font-bold"}>
                      {bil2Value !== 0 ? (bil2Value < 0 ? `(${signed(bil2Value)})` : signed(bil2Value)) : "0"}
                    </span>
                    <span className={`mx-1.5 ${darkArena ? "text-slate-500" : "text-slate-400"}`}>=</span>
                    <span className={`font-bold ${darkArena ? "text-slate-600" : "text-slate-300"}`}>?</span>
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className={`pt-3 border-t space-y-2 ${darkArena ? "border-slate-700 border-dashed" : "border-dashed border-slate-200"}`}>
              {resultValue !== null ? (
                <button onClick={reset} className="w-full py-3 rounded-xl font-bold text-sm bg-success/10 text-success border border-success/30 hover:bg-success/20 transition-colors">
                  ↺ Hitung Lagi
                </button>
              ) : (
                <button
                  onClick={handleCompute}
                  disabled={!canCompute}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                    canCompute
                      ? "bg-gradient-to-r from-intblue to-intpink text-white hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                      : darkArena ? "bg-slate-800 text-slate-600 cursor-not-allowed" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  } ${phase === "charging" ? "animate-pulse" : ""}`}
                >
                  {phase === "charging" ? "⚡ Mengisi daya..."
                    : phase === "exploding" ? "💥 Menghitung!"
                    : phase === "settled" ? "✓ Selesai!"
                    : canCompute ? "⚡ Hitung Hasil"
                    : "Isi bilangan dulu"}
                </button>
              )}
              {history.length > 0 && phase === "idle" && resultValue === null && (
                <button
                  onClick={undoLast}
                  className={`w-full py-2 rounded-xl text-xs border transition-colors ${
                    darkArena
                      ? "text-slate-500 border-slate-700 hover:bg-white/5 hover:text-slate-400"
                      : "text-slate-400 border-border hover:bg-slate-50 hover:text-slate-600"
                  }`}
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
                <p className="font-heading font-bold text-intpink text-sm leading-tight">Kolam Kuman</p>
                <p className="text-[10px] text-slate-400">negatif (−)</p>
              </div>
            </div>
            <div className="flex justify-end mb-1">
              <TargetToggle target={kuTarget} setTarget={setKuTarget} color="intpink" />
            </div>
            <div className="flex-1 space-y-2">
              {([1000, 100, 10, 1] as Tier[]).map((tier) => (
                <PoolButton key={tier} type="ku" tier={tier} />
              ))}
            </div>
          </div>
        </div>

        {/* Result equation */}
        {resultValue !== null && phase === "idle" && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-5 mb-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3 text-center">Persamaan Lengkap</p>
            <div className="text-center font-mono flex items-baseline justify-center gap-2 flex-wrap">
              <span className={`font-bold text-xl ${bil1Value >= 0 ? "text-intblue" : "text-intpink"}`}>{signed(bil1Value)}</span>
              <span className="text-slate-400 text-xl">+</span>
              <span className={`font-bold text-xl ${bil2Value >= 0 ? "text-intblue" : "text-intpink"}`}>
                {bil2Value < 0 ? `(${signed(bil2Value)})` : signed(bil2Value)}
              </span>
              <span className="text-slate-400 text-xl">=</span>
              <span className={`font-bold text-2xl ${resultValue > 0 ? "text-intblue" : resultValue < 0 ? "text-intpink" : "text-success"}`}>
                {resultValue === 0 ? "0 ✓" : signed(resultValue)}
              </span>
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="flex items-center justify-between">
          <button onClick={reset} className="flex items-center gap-2 border border-border text-slate-600 font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7A5 5 0 1 0 7 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M7 2L4.5 0v4z" fill="currentColor" />
            </svg>
            Reset Ulang
          </button>
          <div className="flex gap-3">
            <Link href="/materi" className="text-sm text-slate-400 hover:text-slate-600 transition-colors px-3 py-2.5">← Materi</Link>
            <Link href="/leaderboard" className="bg-intblue text-white font-bold px-5 py-2.5 rounded-full hover:bg-intblue-dark transition-colors flex items-center gap-2">
              🏆 Leaderboard
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
