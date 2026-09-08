// app/model-chip/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { TIERS } from "@/components/TieredChips";
import {
  AntibodyCharacter,
  VirusCharacter,
  CharacterChips,
  TIER_TO_PLACE,
  CHAR_NAMES,
  dominantPlace,
} from "@/components/game/CharacterSVGs";

type VizPhase = "idle" | "shake" | "dissolve" | "done";

export default function ModelChipPage() {
  const [bil1, setBil1] = useState(0);
  const [bil2, setBil2] = useState(0);
  const [vizPhase, setVizPhase] = useState<VizPhase>("idle");
  const [snapshot, setSnapshot] = useState<{ bil1: number; bil2: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // Live derived values
  const liveTotalPos = Math.max(0, bil1) + Math.max(0, bil2);
  const liveTotalNeg = Math.max(0, -bil1) + Math.max(0, -bil2);

  // Snapshot-locked derived values (for animation and equation)
  const snapTotalPos = snapshot
    ? Math.max(0, snapshot.bil1) + Math.max(0, snapshot.bil2)
    : liveTotalPos;
  const snapTotalNeg = snapshot
    ? Math.max(0, -snapshot.bil1) + Math.max(0, -snapshot.bil2)
    : liveTotalNeg;

  const pairs = Math.min(snapTotalPos, snapTotalNeg);
  const remaining = snapTotalPos - snapTotalNeg;

  const eqBil1 = snapshot?.bil1 ?? bil1;
  const eqBil2 = snapshot?.bil2 ?? bil2;

  const isDone = vizPhase === "done";
  const isAnimating = vizPhase === "shake" || vizPhase === "dissolve";
  const showArena = snapshot !== null;

  const handleBil1Change = (val: string) => {
    if (vizPhase !== "idle") return;
    const raw = parseInt(val);
    const n = isNaN(raw) ? 0 : Math.max(-9999, Math.min(9999, raw));
    setBil1(n);
    setSnapshot(null);
  };

  const handleBil2Change = (val: string) => {
    if (vizPhase !== "idle") return;
    const raw = parseInt(val);
    const n = isNaN(raw) ? 0 : Math.max(-9999, Math.min(9999, raw));
    setBil2(n);
    setSnapshot(null);
  };

  const handlePair = () => {
    if (bil1 === 0 && bil2 === 0) return;
    clearTimers();
    const snap = { bil1, bil2 };
    setSnapshot(snap);

    const tp = Math.max(0, bil1) + Math.max(0, bil2);
    const tn = Math.max(0, -bil1) + Math.max(0, -bil2);
    const hasBattle = tp > 0 && tn > 0;

    if (!hasBattle) {
      setVizPhase("done");
      return;
    }

    // Dissolve duration: 120ms per paired char (staggered) + 800ms for last char's transition
    // Decompose pairs into digit count to estimate char count
    const pairCount = Math.min(tp, tn);
    const digitGroups =
      Math.floor(pairCount / 1000) +
      Math.floor((pairCount % 1000) / 100) +
      Math.floor((pairCount % 100) / 10) +
      (pairCount % 10);
    const dissolveDuration = Math.min(digitGroups * 120 + 800, 6000); // cap at 6s

    setVizPhase("shake");
    const t1 = setTimeout(() => setVizPhase("dissolve"), 1200);
    const t2 = setTimeout(() => setVizPhase("done"), 1200 + dissolveDuration + 200);
    timers.current = [t1, t2];
  };

  const reset = () => {
    clearTimers();
    setBil1(0);
    setBil2(0);
    setVizPhase("idle");
    setSnapshot(null);
  };

  useEffect(() => () => clearTimers(), []);

  const pairedChipsPhase = (): "idle" | "charging" | "exploding" | "settled" => {
    if (vizPhase === "dissolve" || vizPhase === "done") return "exploding";
    return "idle";
  };

  const shakeStyle =
    vizPhase === "shake"
      ? { animation: "battle-shake-kf 0.4s ease-in-out infinite" }
      : undefined;

  // â”€â”€ Input panel helpers â”€â”€

  function inputPanelProps(val: number) {
    const isPos = val > 0;
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    const type: "ab" | "ku" = val >= 0 ? "ab" : "ku";

    const cardBorder = isPos
      ? "border-intblue/25"
      : isNeg
      ? "border-intpink/25"
      : "border-border";

    const iconBg = isPos ? "bg-intblue" : isNeg ? "bg-intpink" : "bg-slate-300";
    const iconLabel = isPos ? "+" : isNeg ? "−" : "?";
    const titleColor = isPos ? "text-intblue" : isNeg ? "text-intpink" : "text-slate-400";

    const troopName =
      absVal > 0
        ? isPos
          ? CHAR_NAMES.ab[dominantPlace(absVal)]
          : CHAR_NAMES.ku[dominantPlace(absVal)]
        : null;

    const subtitle =
      absVal > 0
        ? isPos
          ? `Antibodi +${absVal.toLocaleString("id-ID")}`
          : `Kuman −${absVal.toLocaleString("id-ID")}`
        : "−9.999 sampai +9.999";

    const inputColor = isPos ? "text-intblue" : isNeg ? "text-intpink" : "text-slate-400";

    const inputBorder = isPos
      ? "border-intblue/30 focus:border-intblue bg-intblue-light/30"
      : isNeg
      ? "border-intpink/30 focus:border-intpink bg-intpink-light/30"
      : "border-border bg-surface";

    const svgBg = isPos
      ? "bg-intblue-light/40 border-intblue/10"
      : "bg-intpink-light/40 border-intpink/10";

    return { isPos, isNeg, absVal, type, cardBorder, iconBg, iconLabel, titleColor, troopName, subtitle, inputColor, inputBorder, svgBg };
  }

  const p1 = inputPanelProps(bil1);
  const p2 = inputPanelProps(bil2);

  return (
    <div className="min-h-screen bg-surface py-10">
      <div className="max-w-5xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/materi"
            className="p-2 rounded-xl bg-white border border-border hover:bg-slate-50 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div>
            <p className="text-xs text-slate-400 font-medium">Materi / Simulasi</p>
            <h1 className="font-bold text-2xl text-[#0f172a]" style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>
              Model Zero-Pair
            </h1>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-intblue-light border border-intblue/20 rounded-2xl p-4 mb-6">
          <p className="text-sm text-intblue">
            <strong>Cara kerja:</strong> Masukkan nilai pada <strong>Bilangan 1</strong> dan <strong>Bilangan 2</strong>.
            Positif = Antibodi 🔵, Negatif = Kuman 🔴. Warna kontainer mengikuti tanda bilangan.
            Klik <strong>Pasangkan</strong> untuk melihat animasi netralisasi!
          </p>
        </div>

        {/* Tier legend */}
        <div className="bg-white rounded-2xl border border-border p-4 mb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">Tingkatan Karakter:</p>
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
                    <div className="w-12 h-12"><AntibodyCharacter type={place} uid={`mc-leg-ab-${t}`} /></div>
                    <span className="text-[10px] font-bold text-intblue">+{t.toLocaleString("id-ID")}</span>
                    <span className="text-[8px] text-slate-500 text-center leading-tight">{CHAR_NAMES.ab[place]}</span>
                  </div>
                );
              })}
            </div>
          </div>
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
                    <div className="w-12 h-12"><VirusCharacter type={place} uid={`mc-leg-ku-${t}`} /></div>
                    <span className="text-[10px] font-bold text-intpink">−{t.toLocaleString("id-ID")}</span>
                    <span className="text-[8px] text-slate-500 text-center leading-tight">{CHAR_NAMES.ku[place]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Input panels */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 transition-opacity duration-300 ${isAnimating ? "opacity-50 pointer-events-none" : ""}`}>

          {/* Bilangan 1 */}
          <div className={`bg-white rounded-2xl border-2 ${p1.cardBorder} p-4 transition-colors duration-300`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 ${p1.iconBg} rounded-xl flex items-center justify-center text-white font-bold text-lg transition-colors duration-300`}>
                {p1.iconLabel}
              </div>
              <div>
                <p className={`font-bold text-lg ${p1.titleColor} transition-colors duration-300`} style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>
                  {p1.troopName ?? "Bilangan 1"}
                </p>
                <p className="text-xs text-slate-400">{p1.subtitle}</p>
              </div>
            </div>

            <input
              type="number"
              min={-9999}
              max={9999}
              value={bil1 === 0 ? "" : bil1}
              placeholder="0"
              onChange={(e) => handleBil1Change(e.target.value)}
              readOnly={vizPhase !== "idle"}
              className={`w-full border-2 ${p1.inputBorder} focus:bg-white rounded-xl px-4 py-4 text-4xl font-mono font-bold ${p1.inputColor} outline-none transition-colors duration-300 text-center`}
            />

            {bil1 !== 0 && (
              <div className={`mt-3 p-2 rounded-xl border w-full ${p1.svgBg} transition-colors duration-300`}>
                <CharacterChips value={p1.absVal} type={p1.type} size="sm" maxPerTier={9} uidPrefix="input-b1" />
              </div>
            )}
          </div>

          {/* Bilangan 2 */}
          <div className={`bg-white rounded-2xl border-2 ${p2.cardBorder} p-4 transition-colors duration-300`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 ${p2.iconBg} rounded-xl flex items-center justify-center text-white font-bold text-lg transition-colors duration-300`}>
                {p2.iconLabel}
              </div>
              <div>
                <p className={`font-bold text-lg ${p2.titleColor} transition-colors duration-300`} style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>
                  {p2.troopName ?? "Bilangan 2"}
                </p>
                <p className="text-xs text-slate-400">{p2.subtitle}</p>
              </div>
            </div>

            <input
              type="number"
              min={-9999}
              max={9999}
              value={bil2 === 0 ? "" : bil2}
              placeholder="0"
              onChange={(e) => handleBil2Change(e.target.value)}
              readOnly={vizPhase !== "idle"}
              className={`w-full border-2 ${p2.inputBorder} focus:bg-white rounded-xl px-4 py-4 text-4xl font-mono font-bold ${p2.inputColor} outline-none transition-colors duration-300 text-center`}
            />

            {bil2 !== 0 && (
              <div className={`mt-3 p-2 rounded-xl border w-full ${p2.svgBg} transition-colors duration-300`}>
                <CharacterChips value={p2.absVal} type={p2.type} size="sm" maxPerTier={9} uidPrefix="input-b2" />
              </div>
            )}
          </div>
        </div>

        {/* Battle Arena */}
        {showArena && snapshot !== null && (() => {
          const s1 = snapshot.bil1;
          const s2 = snapshot.bil2;
          const s1Type: "ab" | "ku" = s1 >= 0 ? "ab" : "ku";
          const s2Type: "ab" | "ku" = s2 >= 0 ? "ab" : "ku";
          const s1Abs = Math.abs(s1);
          const s2Abs = Math.abs(s2);
          const s1IsPos = s1 > 0;
          const s2IsPos = s2 > 0;

          // Neutralization: only happens between opposite-sign contributions
          const hasBattle = snapTotalPos > 0 && snapTotalNeg > 0;
          // How much of each bilangan participates in pairing
          const s1Paired = hasBattle ? Math.min(s1Abs, pairs) : 0;
          const s2Paired = hasBattle ? Math.min(s2Abs, pairs) : 0;
          const s1Remaining = s1Abs - s1Paired;
          const s2Remaining = s2Abs - s2Paired;

          const s1Color = s1 > 0 ? "text-blue-400" : s1 < 0 ? "text-rose-400" : "text-slate-500";
          const s2Color = s2 > 0 ? "text-blue-400" : s2 < 0 ? "text-rose-400" : "text-slate-500";
          const s1Dot = s1 > 0 ? "bg-intblue" : s1 < 0 ? "bg-intpink" : "bg-slate-600";
          const s2Dot = s2 > 0 ? "bg-intblue" : s2 < 0 ? "bg-intpink" : "bg-slate-600";

          const s1LabelKind = s1 > 0 ? "Antibodi" : s1 < 0 ? "Kuman" : "—";
          const s2LabelKind = s2 > 0 ? "Antibodi" : s2 < 0 ? "Kuman" : "—";
          const s1Sign = s1 > 0 ? "+" : "";
          const s2Sign = s2 > 0 ? "+" : "";

          return (
            <div className="bg-[#0f172a] rounded-2xl border border-[#1e293b] p-5 mb-4 arena-enter">
              {/* Arena header */}
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[11px] tracking-[0.8px] text-[#64748b] uppercase font-bold">
                  {vizPhase === "shake" ? "⚔️ Pertarungan!" : vizPhase === "dissolve" ? "💨 Meluruh..." : isDone ? "✓ Selesai" : "Arena"}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${vizPhase === "done" ? "bg-[#10b981]" : vizPhase === "idle" ? "bg-[#64748b]" : "bg-yellow-400 animate-pulse"}`} />
                  <span className="font-mono text-[10px] text-[#475569]">
                    {vizPhase === "shake" ? "Bergetar" : vizPhase === "dissolve" ? "Meluruh" : isDone ? "Selesai" : "Standby"}
                  </span>
                </div>
              </div>

              {/* Two columns: Bilangan 1 | Bilangan 2 */}
              <div className="grid grid-cols-2 gap-4">

                {/* Bilangan 1 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-2 h-2 rounded-full ${s1Dot}`} />
                    <span className={`font-mono text-[10px] ${s1Color} uppercase tracking-wide font-bold`}>
                      Bil.1 {s1LabelKind}{s1 !== 0 ? ` ${s1Sign}${s1.toLocaleString("id-ID")}` : ""}
                    </span>
                  </div>

                  {s1 === 0 ? (
                    <p className="text-[10px] text-slate-600 font-mono italic">tidak ada karakter</p>
                  ) : (
                    <>
                      {/* Paired portion — shake → dissolve */}
                      {s1Paired > 0 && (
                        <div className="space-y-1">
                          <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wide mb-1">
                            {isDone ? "Dinetralkan" : "Pasangan"}
                          </p>
                          <div style={shakeStyle}>
                            <CharacterChips
                              value={s1Paired}
                              type={s1Type}
                              phase={pairedChipsPhase()}
                              size="xs"
                              maxPerTier={99}
                              uidPrefix="arena-b1-paired"
                            />
                          </div>
                        </div>
                      )}

                      {/* Remaining portion — stays */}
                      {s1Remaining > 0 && (
                        <div className={`transition-opacity duration-300 ${isAnimating ? "opacity-50" : "opacity-100"}`}>
                          <p className={`text-[9px] ${s1Color} font-mono font-bold uppercase tracking-wide mb-1`}>
                            {s1Paired > 0 ? `Sisa ${s1Sign}${s1Remaining.toLocaleString("id-ID")}` : `${s1Sign}${s1Remaining.toLocaleString("id-ID")}`}
                          </p>
                          <CharacterChips
                            value={s1Remaining}
                            type={s1Type}
                            size="xs"
                            maxPerTier={99}
                            uidPrefix="arena-b1-rem"
                          />
                        </div>
                      )}

                      {s1Paired > 0 && s1Remaining === 0 && isDone && (
                        <p className="text-[10px] text-slate-600 font-mono italic">semua dinetralkan</p>
                      )}
                    </>
                  )}
                </div>

                {/* Bilangan 2 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-2 h-2 rounded-full ${s2Dot}`} />
                    <span className={`font-mono text-[10px] ${s2Color} uppercase tracking-wide font-bold`}>
                      Bil.2 {s2LabelKind}{s2 !== 0 ? ` ${s2Sign}${s2.toLocaleString("id-ID")}` : ""}
                    </span>
                  </div>

                  {s2 === 0 ? (
                    <p className="text-[10px] text-slate-600 font-mono italic">tidak ada karakter</p>
                  ) : (
                    <>
                      {/* Paired portion — shake → dissolve */}
                      {s2Paired > 0 && (
                        <div className="space-y-1">
                          <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wide mb-1">
                            {isDone ? "Dinetralkan" : "Pasangan"}
                          </p>
                          <div style={shakeStyle}>
                            <CharacterChips
                              value={s2Paired}
                              type={s2Type}
                              phase={pairedChipsPhase()}
                              size="xs"
                              maxPerTier={99}
                              uidPrefix="arena-b2-paired"
                            />
                          </div>
                        </div>
                      )}

                      {/* Remaining portion — stays */}
                      {s2Remaining > 0 && (
                        <div className={`transition-opacity duration-300 ${isAnimating ? "opacity-50" : "opacity-100"}`}>
                          <p className={`text-[9px] ${s2Color} font-mono font-bold uppercase tracking-wide mb-1`}>
                            {s2Paired > 0 ? `Sisa ${s2Sign}${s2Remaining.toLocaleString("id-ID")}` : `${s2Sign}${s2Remaining.toLocaleString("id-ID")}`}
                          </p>
                          <CharacterChips
                            value={s2Remaining}
                            type={s2Type}
                            size="xs"
                            maxPerTier={99}
                            uidPrefix="arena-b2-rem"
                          />
                        </div>
                      )}

                      {s2Paired > 0 && s2Remaining === 0 && isDone && (
                        <p className="text-[10px] text-slate-600 font-mono italic">semua dinetralkan</p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Result row */}
              {isDone && (
                <div className="mt-4 pt-4 border-t border-[#1e293b] flex items-center justify-center gap-4 animate-fade-slide-in">
                  {remaining !== 0 ? (
                    <>
                      <div className="w-12 h-12 victory-pop">
                        {remaining > 0
                          ? <AntibodyCharacter type={dominantPlace(remaining)} uid="arena-result" />
                          : <VirusCharacter type={dominantPlace(Math.abs(remaining))} uid="arena-result" />
                        }
                      </div>
                      <div className="text-center">
                        <p className="font-mono text-[10px] text-slate-500 uppercase tracking-wide">Sisa</p>
                        <p className={`font-mono font-black text-2xl ${remaining > 0 ? "text-intblue" : "text-intpink"}`}>
                          {remaining > 0 ? `+${remaining.toLocaleString("id-ID")}` : remaining.toLocaleString("id-ID")}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <p className="text-3xl mb-1">🎉</p>
                      <p className="font-mono font-black text-success text-2xl">0</p>
                      <p className="font-mono text-[10px] text-slate-500 uppercase tracking-wide">Tepat nol!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
        {/* Result panel */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">
                <span className={`font-mono font-bold ${eqBil1 >= 0 ? "text-intblue" : "text-intpink"}`}>
                  {eqBil1 >= 0 ? `+${eqBil1.toLocaleString("id-ID")}` : eqBil1.toLocaleString("id-ID")}
                </span>
                <span className="text-slate-400 mx-2">+</span>
                <span className={`font-mono font-bold ${eqBil2 >= 0 ? "text-intblue" : "text-intpink"}`}>
                  {eqBil2 >= 0 ? `+${eqBil2.toLocaleString("id-ID")}` : `(${eqBil2.toLocaleString("id-ID")})`}
                </span>
              </p>
              {isDone && pairs > 0 && (
                <p className="text-xs text-slate-400">
                  {pairs.toLocaleString("id-ID")} zero-pair dinetralkan → sisa{" "}
                  <span className={remaining > 0 ? "text-intblue font-semibold" : remaining < 0 ? "text-intpink font-semibold" : "text-success font-semibold"}>
                    {remaining > 0 ? `+${remaining.toLocaleString("id-ID")} antibodi` : remaining < 0 ? `${remaining.toLocaleString("id-ID")} kuman` : "0 (netral)"}
                  </span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isDone && remaining !== 0 && (
                <div className="w-12 h-12 victory-pop">
                  {remaining > 0
                    ? <AntibodyCharacter type={dominantPlace(remaining)} uid="mc-result-char" />
                    : <VirusCharacter type={dominantPlace(Math.abs(remaining))} uid="mc-result-char" />
                  }
                </div>
              )}
              <div className={`min-w-[80px] text-center px-6 py-3 rounded-2xl border-2 transition-all ${
                isDone
                  ? remaining > 0 ? "border-intblue bg-intblue-light"
                    : remaining < 0 ? "border-intpink bg-intpink-light"
                    : "border-success bg-success/10"
                  : "border-border bg-surface"
              }`}>
                <p className="text-xs text-slate-400 mb-0.5">Hasil</p>
                <p className={`font-bold text-3xl ${isDone ? remaining > 0 ? "text-intblue" : remaining < 0 ? "text-intpink" : "text-success" : "text-slate-200"}`}
                  style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>
                  {isDone ? remaining > 0 ? `+${remaining}` : remaining === 0 ? "0" : remaining : "?"}
                </p>
              </div>
            </div>
          </div>

          {/* Persamaan Lengkap */}
          {(eqBil1 !== 0 || eqBil2 !== 0) && (
            <div className="bg-surface rounded-xl p-3 text-center font-mono text-sm mb-4">
              <span className={`font-bold ${eqBil1 >= 0 ? "text-intblue" : "text-intpink"}`}>
                {eqBil1 >= 0 ? `+${eqBil1.toLocaleString("id-ID")}` : eqBil1.toLocaleString("id-ID")}
              </span>
              <span className="text-slate-400 mx-2">+</span>
              <span className={`font-bold ${eqBil2 >= 0 ? "text-intblue" : "text-intpink"}`}>
                {eqBil2 >= 0 ? `+${eqBil2.toLocaleString("id-ID")}` : `(${eqBil2.toLocaleString("id-ID")})`}
              </span>
              <span className="text-slate-400 mx-2">=</span>
              <span className={`font-bold text-lg ${isDone ? remaining > 0 ? "text-intblue" : remaining < 0 ? "text-intpink" : "text-success" : "text-slate-300"}`}>
                {isDone
                  ? remaining > 0 ? `+${remaining.toLocaleString("id-ID")}`
                    : remaining === 0 ? "0 ✓"
                    : remaining.toLocaleString("id-ID")
                  : "?"}
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handlePair}
              disabled={(bil1 === 0 && bil2 === 0) || isAnimating || isDone}
              className="flex-1 border-2 border-intblue text-intblue font-bold py-3 rounded-xl hover:bg-intblue hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isAnimating ? "Berlangsung..." : isDone ? "✓ Selesai" : "Pasangkan Otomatis"}
            </button>
            <button onClick={reset} className="px-6 py-3 border border-border text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium">
              Reset
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <Link href="/materi" className="text-sm text-slate-400 hover:text-intblue transition-colors">← Kembali</Link>
          <Link href="/game-virus" className="bg-intblue text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-intblue-dark transition-colors flex items-center gap-2">
            Main Game 🎮
          </Link>
        </div>
      </div>
    </div>
  );
}
