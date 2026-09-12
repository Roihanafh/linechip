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
  type PlaceValue,
} from "@/components/game/CharacterSVGs";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * idle   → user mengisi input
 * battle → arena: semua SVG ditampilkan; per tier, satu per satu pasangan bereaksi ke tengah
 * center → panel ringkasan reaksi
 * done   → tampilkan hasil akhir
 */
type VizPhase = "idle" | "battle" | "center" | "done";

/** Satu tier group: berisi tier value dan jumlah pasangan pada tier itu. */
interface TierGroup {
  tier: 1 | 10 | 100 | 1000;
  count: number;
}

type StepPhase = "approach" | "clash" | "clear";

// ── Helper ────────────────────────────────────────────────────────────────────

/** Dekomposisi totalPairs ke tier groups besar-ke-kecil. */
function buildTierGroups(totalPairs: number): TierGroup[] {
  if (totalPairs <= 0) return [];
  const allTiers: (1 | 10 | 100 | 1000)[] = [1000, 100, 10, 1];
  const groups: TierGroup[] = [];
  let rem = totalPairs;
  for (const t of allTiers) {
    const c = Math.floor(rem / t);
    if (c > 0) groups.push({ tier: t, count: c });
    rem %= t;
  }
  return groups;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ModelChipPage() {
  const [bil1, setBil1] = useState(0);
  const [bil2, setBil2] = useState(0);
  const [vizPhase, setVizPhase] = useState<VizPhase>("idle");
  const [snapshot, setSnapshot] = useState<{ bil1: number; bil2: number } | null>(null);
  const [centerExiting, setCenterExiting] = useState(false);

  // Battle state
  const [tierGroups, setTierGroups] = useState<TierGroup[]>([]);
  const [tierIdx, setTierIdx] = useState(0);       // which tier is active
  const [pairInTier, setPairInTier] = useState(0); // which pair within the tier (0-based)
  const [stepPhase, setStepPhase] = useState<StepPhase>("approach");
  // neutralised[tier] = how many pairs of this tier have already reacted
  const [neutralised, setNeutralised] = useState<Map<1 | 10 | 100 | 1000, number>>(new Map());

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  // ── Derived values ─────────────────────────────────────────────────────────

  const liveTotalPos = Math.max(0, bil1) + Math.max(0, bil2);
  const liveTotalNeg = Math.max(0, -bil1) + Math.max(0, -bil2);
  const snapTotalPos = snapshot
    ? Math.max(0, snapshot.bil1) + Math.max(0, snapshot.bil2) : liveTotalPos;
  const snapTotalNeg = snapshot
    ? Math.max(0, -snapshot.bil1) + Math.max(0, -snapshot.bil2) : liveTotalNeg;
  const pairs     = Math.min(snapTotalPos, snapTotalNeg);
  const remaining = snapTotalPos - snapTotalNeg;
  const eqBil1    = snapshot?.bil1 ?? bil1;
  const eqBil2    = snapshot?.bil2 ?? bil2;
  const isDone      = vizPhase === "done";
  const isAnimating = vizPhase === "battle" || vizPhase === "center";

  // ── Input handlers ─────────────────────────────────────────────────────────

  const handleBil1Change = (val: string) => {
    if (vizPhase !== "idle") return;
    const raw = parseInt(val);
    setBil1(isNaN(raw) ? 0 : Math.max(-9999, Math.min(9999, raw)));
    setSnapshot(null);
  };
  const handleBil2Change = (val: string) => {
    if (vizPhase !== "idle") return;
    const raw = parseInt(val);
    setBil2(isNaN(raw) ? 0 : Math.max(-9999, Math.min(9999, raw)));
    setSnapshot(null);
  };

  // ── Step machine ───────────────────────────────────────────────────────────

  /**
   * Run one pair within a tier.
   * approach (1100ms) → clash (600ms) → clear (220ms) → next pair / next tier
   */
  const runPair = (
    groups: TierGroup[],
    tIdx: number,
    pIdx: number,
    neu: Map<1 | 10 | 100 | 1000, number>
  ) => {
    if (tIdx >= groups.length) {
      // All tiers done → summary
      setVizPhase("center");
      const t1 = setTimeout(() => setCenterExiting(true), 2000);
      const t2 = setTimeout(() => setVizPhase("done"), 2500);
      timers.current.push(t1, t2);
      return;
    }

    const group = groups[tIdx];
    if (pIdx >= group.count) {
      // This tier is done, move to next tier
      runPair(groups, tIdx + 1, 0, neu);
      return;
    }

    setTierIdx(tIdx);
    setPairInTier(pIdx);
    setStepPhase("approach");

    // approach → clash
    const tApp = setTimeout(() => {
      setStepPhase("clash");

      // clash → clear
      const tClash = setTimeout(() => {
        setStepPhase("clear");

        // Mark this pair as neutralised
        const next = new Map(neu);
        next.set(group.tier, (next.get(group.tier) ?? 0) + 1);
        setNeutralised(next);

        // clear → next pair
        const tClear = setTimeout(() => {
          runPair(groups, tIdx, pIdx + 1, next);
        }, 220);
        timers.current.push(tClear);
      }, 600);
      timers.current.push(tClash);
    }, 1100);
    timers.current.push(tApp);
  };

  // ── handlePair ─────────────────────────────────────────────────────────────

  const handlePair = () => {
    if (bil1 === 0 && bil2 === 0) return;
    clearTimers();
    setCenterExiting(false);
    setTierIdx(0);
    setPairInTier(0);
    setStepPhase("approach");
    setNeutralised(new Map());

    const tp = Math.max(0, bil1) + Math.max(0, bil2);
    const tn = Math.max(0, -bil1) + Math.max(0, -bil2);
    const hasBattle = tp > 0 && tn > 0;
    setSnapshot({ bil1, bil2 });

    if (!hasBattle) { setVizPhase("done"); return; }

    const pairCount = Math.min(tp, tn);
    const groups = buildTierGroups(pairCount);
    setTierGroups(groups);
    setVizPhase("battle");
    runPair(groups, 0, 0, new Map());
  };

  const reset = () => {
    clearTimers();
    setBil1(0); setBil2(0);
    setVizPhase("idle"); setSnapshot(null); setCenterExiting(false);
    setTierGroups([]); setTierIdx(0); setPairInTier(0);
    setStepPhase("approach"); setNeutralised(new Map());
  };

  useEffect(() => () => clearTimers(), []);

  // ── Input panel helper ─────────────────────────────────────────────────────

  function inputPanelProps(val: number) {
    const isPos = val > 0, isNeg = val < 0;
    const absVal = Math.abs(val);
    const type: "ab" | "ku" = val >= 0 ? "ab" : "ku";
    return {
      isPos, isNeg, absVal, type,
      cardBorder:  isPos ? "border-intblue/25" : isNeg ? "border-intpink/25" : "border-border",
      iconBg:      isPos ? "bg-intblue" : isNeg ? "bg-intpink" : "bg-slate-300",
      iconLabel:   isPos ? "+" : isNeg ? "−" : "?",
      titleColor:  isPos ? "text-intblue" : isNeg ? "text-intpink" : "text-slate-400",
      troopName:   absVal > 0 ? (isPos ? CHAR_NAMES.ab[dominantPlace(absVal)] : CHAR_NAMES.ku[dominantPlace(absVal)]) : null,
      subtitle:    absVal > 0 ? (isPos ? `Antibodi +${absVal.toLocaleString("id-ID")}` : `Kuman −${absVal.toLocaleString("id-ID")}`) : "−9.999 sampai +9.999",
      inputColor:  isPos ? "text-intblue" : isNeg ? "text-intpink" : "text-slate-400",
      inputBorder: isPos ? "border-intblue/30 focus:border-intblue bg-intblue-light/30" : isNeg ? "border-intpink/30 focus:border-intpink bg-intpink-light/30" : "border-border bg-surface",
      svgBg:       isPos ? "bg-intblue-light/40 border-intblue/10" : "bg-intpink-light/40 border-intpink/10",
    };
  }

  const p1 = inputPanelProps(bil1);
  const p2 = inputPanelProps(bil2);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-surface py-10">
      <div className="max-w-5xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/materi" className="p-2 rounded-xl bg-white border border-border hover:bg-slate-50 transition-colors">
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
        <div className="bg-intblue-light border border-intblue/20 rounded-2xl p-4 mb-4">
          <p className="text-sm text-intblue">
            Masukkan nilai pada <strong>Bilangan 1</strong> dan <strong>Bilangan 2</strong>. 
            Bilangan positif mewakili <strong>Antibodi 🔵</strong>, sedangkan bilangan negatif mewakili{" "}
            <strong>Kuman 🔴</strong>. Klik <strong>Pasangkan</strong> untuk melihat animasi netralisasi.
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

        {/* ── Input row: bil1 + bil2 (mobile-style, satu baris) ─── */}
        <div className={`mb-4 transition-opacity duration-300 ${isAnimating ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="bg-white rounded-2xl border border-border shadow-sm p-4">

            {/* Baris nama/jenis — di atas input */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full shrink-0 ${p1.isPos ? "bg-intblue" : p1.isNeg ? "bg-intpink" : "bg-slate-300"}`} />
                <span className={`font-bold text-sm truncate ${p1.titleColor}`} style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>
                  {p1.troopName ?? "Bilangan 1"}
                </span>
              </div>
              <div />
              <div className="flex items-center gap-1.5 justify-end">
                <span className={`font-bold text-sm truncate ${p2.titleColor}`} style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>
                  {p2.troopName ?? "Bilangan 2"}
                </span>
                <div className={`w-2 h-2 rounded-full shrink-0 ${p2.isPos ? "bg-intblue" : p2.isNeg ? "bg-intpink" : "bg-slate-300"}`} />
              </div>
            </div>

            {/* Baris input + operator */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <input
                type="number" min={-9999} max={9999}
                value={bil1 === 0 ? "" : bil1} placeholder="0"
                onChange={(e) => handleBil1Change(e.target.value)}
                readOnly={vizPhase !== "idle"}
                className={`w-full border-2 ${p1.inputBorder} focus:bg-white rounded-xl px-3 py-3 text-3xl font-mono font-black ${p1.inputColor} outline-none transition-colors duration-300 text-center`}
              />
              <div className="flex items-center justify-center w-8 shrink-0">
                <span className="text-slate-300 font-bold text-2xl select-none">+</span>
              </div>
              <input
                type="number" min={-9999} max={9999}
                value={bil2 === 0 ? "" : bil2} placeholder="0"
                onChange={(e) => handleBil2Change(e.target.value)}
                readOnly={vizPhase !== "idle"}
                className={`w-full border-2 ${p2.inputBorder} focus:bg-white rounded-xl px-3 py-3 text-3xl font-mono font-black ${p2.inputColor} outline-none transition-colors duration-300 text-center`}
              />
            </div>

            {/* Baris subtitle */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mt-1.5">
              <p className={`text-[10px] ${p1.isPos ? "text-intblue/70" : p1.isNeg ? "text-intpink/70" : "text-slate-400"} text-center`}>
                {p1.absVal > 0 ? p1.subtitle : "−9.999 s/d +9.999"}
              </p>
              <div />
              <p className={`text-[10px] ${p2.isPos ? "text-intblue/70" : p2.isNeg ? "text-intpink/70" : "text-slate-400"} text-center`}>
                {p2.absVal > 0 ? p2.subtitle : "−9.999 s/d +9.999"}
              </p>
            </div>

            {/* Tombol Pasangkan */}
            <div className="mt-4 flex justify-center">
              {vizPhase === "idle" && (
                <button
                  onClick={handlePair}
                  disabled={bil1 === 0 && bil2 === 0}
                  className="px-8 py-2.5 bg-intblue text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Pasangkan ⚡
                </button>
              )}
              {isAnimating && (
                <div className="flex items-center gap-2 text-slate-400 font-mono text-sm">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  Animasi berjalan...
                </div>
              )}
              {(isDone || (snapshot !== null && !isAnimating && vizPhase !== "idle")) && (
                <button
                  onClick={reset}
                  className="px-8 py-2.5 bg-white border-2 border-border text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Ulangi 🔄
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Arena ─────────────────────────────────────────────────────────── */}
        {snapshot !== null && (() => {
          const s1 = snapshot.bil1;
          const s2 = snapshot.bil2;
          const s1Type: "ab" | "ku" = s1 >= 0 ? "ab" : "ku";
          const s2Type: "ab" | "ku" = s2 >= 0 ? "ab" : "ku";
          const s1Abs = Math.abs(s1);
          const s2Abs = Math.abs(s2);
          const hasBattle    = snapTotalPos > 0 && snapTotalNeg > 0;
          const s1Paired     = hasBattle ? Math.min(s1Abs, pairs) : 0;
          const s2Paired     = hasBattle ? Math.min(s2Abs, pairs) : 0;
          const s1Remaining  = s1Abs - s1Paired;
          const s2Remaining  = s2Abs - s2Paired;
          const s1Color = s1 > 0 ? "text-blue-400" : "text-rose-400";
          const s2Color = s2 > 0 ? "text-blue-400" : "text-rose-400";
          const s1Dot   = s1 > 0 ? "bg-intblue" : "bg-intpink";
          const s2Dot   = s2 > 0 ? "bg-intblue" : "bg-intpink";
          const s1Sign  = s1 > 0 ? "+" : "";
          const s2Sign  = s2 > 0 ? "+" : "";
          const s1Place = dominantPlace(s1Paired || s1Abs || 1);
          const s2Place = dominantPlace(s2Paired || s2Abs || 1);
          const pairsDisplay = Math.min(pairs, 6);

          // Active step data
          const curGroup   = tierGroups[tierIdx] ?? null;
          const isApproach = stepPhase === "approach";
          const isClash    = stepPhase === "clash";
          const place      = curGroup ? TIER_TO_PLACE[curGroup.tier] : "satuan";

          // How many of each tier have already reacted (fully neutralised)
          // A tier is "done" when neutralised[tier] >= group.count
          const isTierDone = (t: 1 | 10 | 100 | 1000) => {
            const grp = tierGroups.find((g) => g.tier === t);
            if (!grp) return false;
            return (neutralised.get(t) ?? 0) >= grp.count;
          };
          const isTierActive = (t: 1 | 10 | 100 | 1000) =>
            curGroup?.tier === t && vizPhase === "battle";

          // Total neutralised pairs
          const totalNeutralised = Array.from(neutralised.entries())
            .reduce((sum, [t, c]) => sum + t * c, 0);

          // ── Render one side column ─────────────────────────────────────────
          // Shows ALL characters (paired per tier + remaining),
          // with per-character state based on battle progress.
          function renderColumn(
            sAbs: number,
            sPaired: number,
            sRemaining: number,
            sType: "ab" | "ku",
            sColor: string,
            sSign: string,
            prefix: string
          ) {
            const allTiersOrder: (1 | 10 | 100 | 1000)[] = [1000, 100, 10, 1];
            const rows: React.ReactNode[] = [];

            // Decompose paired per tier
            const pairedByTier = new Map<1 | 10 | 100 | 1000, number>();
            let remP = sPaired;
            for (const t of allTiersOrder) {
              const c = Math.floor(remP / t);
              if (c > 0) pairedByTier.set(t, c);
              remP %= t;
            }
            // Decompose remaining per tier
            const remainByTier = new Map<1 | 10 | 100 | 1000, number>();
            let remR = sRemaining;
            for (const t of allTiersOrder) {
              const c = Math.floor(remR / t);
              if (c > 0) remainByTier.set(t, c);
              remR %= t;
            }

            for (const t of allTiersOrder) {
              const pCount = pairedByTier.get(t) ?? 0;
              const rCount = remainByTier.get(t) ?? 0;
              if (pCount === 0 && rCount === 0) continue;

              const tierPlace   = TIER_TO_PLACE[t];
              const tierDone    = isTierDone(t);
              const tierActive  = isTierActive(t);
              const doneInTier  = neutralised.get(t) ?? 0;
              const tierVal     = t.toLocaleString("id-ID");

              rows.push(
                <div key={t} className="mb-2">
                  {/* Tier label */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`font-mono text-[8px] font-bold uppercase tracking-wide ${
                      tierDone ? "text-slate-700" : tierActive ? "text-yellow-400" : "text-slate-500"
                    }`}>
                      ×{tierVal}
                    </span>
                    {tierDone && <span className="font-mono text-[7px] text-emerald-600">✓ luruh</span>}
                    {tierActive && !tierDone && (
                      <span className="font-mono text-[7px] text-yellow-500 animate-pulse">bereaksi</span>
                    )}
                  </div>

                  {/* Paired characters — shown with individual react state */}
                  {pCount > 0 && (
                    <div className="flex flex-wrap gap-1 mb-0.5">
                      {Array.from({ length: Math.min(pCount, 9) }, (_, i) => {
                        // i-th character state:
                        //   < doneInTier          → already reacted → hidden
                        //   === doneInTier (active tier, current pair) AND not approach → "gone" to arena
                        //   === doneInTier (active tier, current pair) AND approach → dimmed (walking)
                        //   > doneInTier           → waiting → full
                        const isGone    = i < doneInTier || (tierActive && i === doneInTier && !isApproach);
                        const isDimmed  = tierActive && i === doneInTier && isApproach;
                        const isWaiting = !tierDone && (!tierActive || i > doneInTier);

                        return (
                          <div
                            key={`${prefix}-p-${t}-${i}`}
                            className={`w-8 h-8 shrink-0 transition-all duration-500 ${
                              isGone   ? "opacity-0 scale-0" :
                              isDimmed ? "opacity-25 scale-90" :
                              isWaiting && tierActive && i > doneInTier ? "opacity-60" :
                              "opacity-100"
                            }`}
                          >
                            {sType === "ab"
                              ? <AntibodyCharacter type={tierPlace} uid={`${prefix}-p-${t}-${i}`} />
                              : <VirusCharacter    type={tierPlace} uid={`${prefix}-p-${t}-${i}`} />
                            }
                          </div>
                        );
                      })}
                      {pCount > 9 && (
                        <span className={`text-[8px] font-mono font-bold self-center ${sType === "ab" ? "text-blue-400" : "text-rose-400"}`}>
                          +{pCount - 9}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Remaining characters — always full opacity */}
                  {rCount > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: Math.min(rCount, 9) }, (_, i) => (
                        <div key={`${prefix}-r-${t}-${i}`} className="w-8 h-8 shrink-0">
                          {sType === "ab"
                            ? <AntibodyCharacter type={tierPlace} uid={`${prefix}-r-${t}-${i}`} />
                            : <VirusCharacter    type={tierPlace} uid={`${prefix}-r-${t}-${i}`} />
                          }
                        </div>
                      ))}
                      {rCount > 9 && (
                        <span className={`text-[8px] font-mono font-bold self-center ${sType === "ab" ? "text-blue-400" : "text-rose-400"}`}>
                          +{rCount - 9}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            }
            return rows;
          }

          return (
            <div className={`bg-[#0f172a] rounded-2xl border border-[#1e293b] p-4 mb-4 overflow-hidden relative ${
              isDone ? "arena-expand" : "arena-enter"
            }`}>

              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[11px] tracking-[0.8px] text-[#64748b] uppercase font-bold">
                  {vizPhase === "battle" ? "⚔️ Pertarungan!" :
                   vizPhase === "center" ? "⚡ Reaksi Netralisasi" :
                   isDone ? "✓ Selesai" : "Arena"}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isDone ? "bg-[#10b981]" : "bg-yellow-400 animate-pulse"}`} />
                  <span className="font-mono text-[10px] text-[#475569]">
                    {vizPhase === "battle" && curGroup
                      ? `${TIER_TO_PLACE[curGroup.tier]} ${pairInTier + 1}/${curGroup.count}`
                      : vizPhase === "center" ? "Bereaksi"
                      : isDone ? "Selesai" : "Standby"}
                  </span>
                </div>
              </div>

              {/* ── BATTLE ──────────────────────────────────────────────────── */}
              {vizPhase === "battle" && (
                <div className="flex gap-3 items-start">

                  {/* Kolom kiri — Bil.1 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className={`w-2 h-2 rounded-full ${s1Dot}`} />
                      <span className={`font-mono text-[9px] ${s1Color} uppercase tracking-wide font-bold`}>
                        Bil.1 {s1 !== 0 ? `${s1Sign}${s1.toLocaleString("id-ID")}` : ""}
                      </span>
                    </div>
                    {s1 === 0
                      ? <p className="text-[9px] text-slate-600 font-mono italic">tidak ada</p>
                      : renderColumn(s1Abs, s1Paired, s1Remaining, s1Type, s1Color, s1Sign, "b1")
                    }
                  </div>

                  {/* ── Arena tengah ── */}
                  <div className="shrink-0 flex flex-col items-center gap-2" style={{ width: 112 }}>

                    {/* Tier progress indicators */}
                    <div className="flex gap-1.5 flex-wrap justify-center">
                      {tierGroups.map((tg, i) => {
                        const done = isTierDone(tg.tier);
                        const active = i === tierIdx;
                        return (
                          <div key={i} title={`${TIER_TO_PLACE[tg.tier]} ×${tg.count}`}
                            className={`transition-all duration-300 rounded-full ${
                              done   ? "w-2 h-2 bg-emerald-500" :
                              active ? "w-2.5 h-2.5 bg-yellow-400 ring-2 ring-yellow-400/30" :
                                       "w-2 h-2 bg-slate-700"
                            }`}
                          />
                        );
                      })}
                    </div>

                    {/* Current tier + pair label */}
                    {curGroup && (
                      <div className="text-center">
                        <p className="font-mono text-[9px] text-slate-400 uppercase tracking-wide">
                          {TIER_TO_PLACE[curGroup.tier]}
                        </p>
                        <p className="font-mono text-[8px] text-yellow-400">
                          {pairInTier + 1} / {curGroup.count}
                        </p>
                      </div>
                    )}

                    {/* Walking characters */}
                    {curGroup && (
                      <div
                        className="relative flex items-center justify-center"
                        style={{ width: 112, height: 64 }}
                      >
                        {/* Left walker */}
                        <div
                          key={`wl-${tierIdx}-${pairInTier}-${stepPhase}`}
                          className={`absolute w-10 h-10 ${
                            isClash    ? "pair-clash-left"    :
                            isApproach ? "pair-approach-left" : "opacity-0"
                          }`}
                          style={{ left: 4 }}
                        >
                          {s1Type === "ab"
                            ? <AntibodyCharacter type={place} uid={`wl-${tierIdx}-${pairInTier}`} />
                            : <VirusCharacter    type={place} uid={`wl-${tierIdx}-${pairInTier}`} />
                          }
                        </div>

                        {/* Burst at centre — only during clash */}
                        {isClash && (
                          <div
                            key={`burst-${tierIdx}-${pairInTier}`}
                            className="absolute flex items-center justify-center"
                            style={{ left: "50%", transform: "translateX(-50%)", width: 42, height: 42 }}
                          >
                            <div className="absolute inset-0 rounded-full border-2 border-white/70 clash-burst" />
                            <div className="absolute inset-0 rounded-full border-2 border-intblue/50 clash-burst" style={{ animationDelay: "100ms" }} />
                            <div className="absolute inset-0 rounded-full border-2 border-intpink/40 clash-burst" style={{ animationDelay: "200ms" }} />
                            <div className="absolute inset-0 rounded-full bg-white clash-flash" />
                            <span className="relative z-10 font-black text-white text-base select-none drop-shadow-lg">✕</span>
                          </div>
                        )}

                        {/* Right walker */}
                        <div
                          key={`wr-${tierIdx}-${pairInTier}-${stepPhase}`}
                          className={`absolute w-10 h-10 ${
                            isClash    ? "pair-clash-right"    :
                            isApproach ? "pair-approach-right" : "opacity-0"
                          }`}
                          style={{ right: 4 }}
                        >
                          {s2Type === "ab"
                            ? <AntibodyCharacter type={place} uid={`wr-${tierIdx}-${pairInTier}`} />
                            : <VirusCharacter    type={place} uid={`wr-${tierIdx}-${pairInTier}`} />
                          }
                        </div>
                      </div>
                    )}

                    {/* Status */}
                    <p className="font-mono text-[8px] text-slate-600 text-center leading-tight">
                      {isClash ? "💥 luruh!" : "→ bertemu ←"}
                    </p>

                    {/* Running total */}
                    {totalNeutralised > 0 && (
                      <div className="bg-emerald-900/40 border border-emerald-700/40 rounded-full px-2 py-0.5">
                        <span className="font-mono text-[8px] text-emerald-400">
                          −{totalNeutralised.toLocaleString("id-ID")} luruh
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Kolom kanan — Bil.2 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-2 justify-end">
                      <span className={`font-mono text-[9px] ${s2Color} uppercase tracking-wide font-bold`}>
                        {s2 !== 0 ? `${s2Sign}${s2.toLocaleString("id-ID")}` : ""} Bil.2
                      </span>
                      <div className={`w-2 h-2 rounded-full ${s2Dot}`} />
                    </div>
                    {s2 === 0
                      ? <p className="text-[9px] text-slate-600 font-mono italic text-right">tidak ada</p>
                      : renderColumn(s2Abs, s2Paired, s2Remaining, s2Type, s2Color, s2Sign, "b2")
                    }
                  </div>
                </div>
              )}

              {/* ── CENTER ──────────────────────────────────────────────────── */}
              {vizPhase === "center" && (
                <div className={`${centerExiting ? "reaction-center-out" : "reaction-center-in"}`}>
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
                  </div>
                  <div className="flex items-center justify-center gap-6">
                    <div className={`flex flex-col items-center gap-2 ${centerExiting ? "chip-fly-left" : ""}`}>
                      <div className="flex gap-1 justify-center flex-wrap max-w-[140px]">
                        {Array.from({ length: pairsDisplay }, (_, i) => (
                          <div key={i} className="w-10 h-10 shrink-0">
                            {s1Type === "ab"
                              ? <AntibodyCharacter type={s1Place} uid={`cr-s1-${i}`} />
                              : <VirusCharacter    type={s1Place} uid={`cr-s1-${i}`} />
                            }
                          </div>
                        ))}
                      </div>
                      {pairs > pairsDisplay && (
                        <span className={`font-mono text-[10px] font-bold ${s1 >= 0 ? "text-blue-400" : "text-rose-400"}`}>
                          ×{pairs.toLocaleString("id-ID")}
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
                      <div className="absolute inset-0 rounded-full border-2 border-white/20 reaction-burst" style={{ animationDelay: "0ms" }} />
                      <div className="absolute inset-0 rounded-full border-2 border-white/15 reaction-burst" style={{ animationDelay: "400ms" }} />
                      <div className="absolute inset-0 rounded-full border-2 border-white/10 reaction-burst" style={{ animationDelay: "800ms" }} />
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-intblue via-white to-intpink opacity-80 blur-[2px]" />
                      <span className="absolute font-bold text-xl text-white drop-shadow-lg select-none">✕</span>
                    </div>
                    <div className={`flex flex-col items-center gap-2 ${centerExiting ? "chip-fly-right" : ""}`}>
                      <div className="flex gap-1 justify-center flex-wrap max-w-[140px]">
                        {Array.from({ length: pairsDisplay }, (_, i) => (
                          <div key={i} className="w-10 h-10 shrink-0">
                            {s2Type === "ab"
                              ? <AntibodyCharacter type={s2Place} uid={`cr-s2-${i}`} />
                              : <VirusCharacter    type={s2Place} uid={`cr-s2-${i}`} />
                            }
                          </div>
                        ))}
                      </div>
                      {pairs > pairsDisplay && (
                        <span className={`font-mono text-[10px] font-bold ${s2 >= 0 ? "text-blue-400" : "text-rose-400"}`}>
                          ×{pairs.toLocaleString("id-ID")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-center mt-5">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
                      <div className="w-2 h-2 rounded-full bg-intblue" />
                      <span className="font-mono text-[11px] text-slate-300">
                        {pairs.toLocaleString("id-ID")} zero-pair dinetralkan
                      </span>
                      <div className="w-2 h-2 rounded-full bg-intpink" />
                    </div>
                  </div>
                  {remaining !== 0
                    ? <div className="flex justify-center mt-3">
                        <span className={`font-mono text-sm font-bold ${remaining > 0 ? "text-blue-400" : "text-rose-400"}`}>
                          Sisa: {remaining > 0 ? `+${remaining.toLocaleString("id-ID")}` : remaining.toLocaleString("id-ID")}
                        </span>
                      </div>
                    : <p className="text-center font-mono text-sm font-bold text-emerald-400 mt-3">= 0 · Tepat Netral!</p>
                  }
                </div>
              )}

              {/* ── DONE ────────────────────────────────────────────────────── */}
              {isDone && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { sVal: s1, sPaired: s1Paired, sRem: s1Remaining, sType: s1Type, sColor: s1Color, sSign: s1Sign, sDot: s1Dot, prefix: "done-b1", label: "Bil.1" },
                      { sVal: s2, sPaired: s2Paired, sRem: s2Remaining, sType: s2Type, sColor: s2Color, sSign: s2Sign, sDot: s2Dot, prefix: "done-b2", label: "Bil.2" },
                    ].map(({ sVal, sPaired, sRem, sType, sColor, sSign, sDot, prefix, label }) => (
                      <div key={prefix} className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className={`w-2 h-2 rounded-full ${sDot}`} />
                          <span className={`font-mono text-[10px] ${sColor} uppercase tracking-wide font-bold`}>
                            {label} {sVal > 0 ? "Antibodi" : "Kuman"} {sSign}{sVal.toLocaleString("id-ID")}
                          </span>
                        </div>
                        {sPaired > 0 && (
                          <div>
                            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wide mb-1">Dinetralkan</p>
                            <CharacterChips value={sPaired} type={sType} phase="exploding" size="xs" maxPerTier={9} uidPrefix={`${prefix}-pair`} />
                          </div>
                        )}
                        {sRem > 0 && (
                          <div>
                            <p className={`text-[9px] ${sColor} font-mono font-bold uppercase tracking-wide mb-1`}>
                              Sisa {sSign}{sRem.toLocaleString("id-ID")}
                            </p>
                            <CharacterChips value={sRem} type={sType} size="xs" maxPerTier={9} uidPrefix={`${prefix}-rem`} />
                          </div>
                        )}
                        {sPaired > 0 && sRem === 0 && (
                          <p className="text-[10px] text-slate-600 font-mono italic">semua dinetralkan</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#1e293b] flex items-center justify-center gap-4 animate-fade-slide-in">
                    {remaining !== 0 ? (
                      <>
                        <div className="w-12 h-12 victory-pop">
                          {remaining > 0
                            ? <AntibodyCharacter type={dominantPlace(remaining)} uid="arena-result" />
                            : <VirusCharacter    type={dominantPlace(Math.abs(remaining))} uid="arena-result" />
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
                </>
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
                    : <VirusCharacter    type={dominantPlace(Math.abs(remaining))} uid="mc-result-char" />
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
                  {isDone ? (remaining > 0 ? `+${remaining}` : remaining === 0 ? "0" : remaining) : "?"}
                </p>
              </div>
            </div>
          </div>

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
              <span className={`font-bold ${isDone ? remaining > 0 ? "text-intblue" : remaining < 0 ? "text-intpink" : "text-success" : "text-slate-300"}`}>
                {isDone ? (remaining > 0 ? `+${remaining.toLocaleString("id-ID")}` : remaining.toLocaleString("id-ID")) : "?"}
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
