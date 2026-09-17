// components/game/PairReactionStage.tsx
// Single-pair battle animation for model-chip/page.tsx.
// Runs approach → impact → recoil → dissolve and calls onDone when finished.
"use client";

import { useEffect, useRef, useState } from "react";
import { AntibodyCharacter, VirusCharacter, CHAR_NAMES, type PlaceValue } from "./CharacterSVGs";
import { Burst, Shockwave, Popup, useParticles } from "./AnimationEffects";

type Phase = "approach" | "impact" | "recoil" | "dissolve" | "done";

const SZ = 88;
const D_BASE = { APPROACH: 700, IMPACT: 480, RECOIL: 260, DISSOLVE: 680 };
const EASE = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

// Speed control buttons
const SPEEDS: { mul: number; label: string }[] = [
  { mul: 0.5, label: "0.5×" },
  { mul: 1,   label: "1×"   },
  { mul: 2,   label: "2×"   },
];

// ─── Pure helper: idle animation for approach phase ──────────────────────────

function idleInner(
  isApproach: boolean,
  hovered: boolean,
  delayMs: number
): React.CSSProperties {
  if (hovered) {
    return { animation: "idle-hover-pop 220ms ease-out forwards" };
  }
  if (isApproach) {
    return { animation: `idle-float 2800ms ease-in-out ${delayMs}ms infinite` };
  }
  return {};
}

// ─── SparkTrail: 6 ✦ particles trailing each character during approach ────────

function SparkTrail({ side, faction }: { side: "left" | "right"; faction: "ab" | "ku" }) {
  const accentColor = faction === "ab" ? "#93c5fd" : "#f87171";
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => {
        const offset = side === "left" ? i * 12 : side === "right" ? -(i * 12) : 0;
        const sz = 8 + (i % 3);
        return (
          <span
            key={i}
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate(${offset}px, -50%)`,
              fontSize: `${sz}px`,
              lineHeight: `${sz}px`,
              color: accentColor,
              textShadow: `0 0 6px ${accentColor}`,
              background: "transparent",
              animation: `particle-fly 600ms ease-out ${i * 80}ms forwards, popup-rise 600ms ease-out ${i * 80}ms forwards`,
              pointerEvents: "none",
              userSelect: "none",
            }}
          >✦</span>
        );
      })}
    </>
  );
}

// ─── Speed control buttons ────────────────────────────────────────────────────

function SpeedButtons({ speed, onSpeed }: { speed: number; onSpeed: (v: number) => void }) {
  return (
    <div style={{
      display: "flex", gap: 2, padding: 3,
      borderRadius: 10, background: "rgba(0,0,0,0.045)",
    }}>
      {SPEEDS.map((s) => (
        <button key={s.mul} onClick={() => onSpeed(s.mul)} style={{
          fontWeight: 800, fontSize: 11,
          padding: "5px 10px", borderRadius: 7, border: "none",
          background: speed === s.mul ? "#ef4444" : "transparent",
          color: speed === s.mul ? "white" : "rgba(80,80,100,0.5)",
          cursor: "pointer", transition: "all 150ms",
        }}>
          {s.label}
        </button>
      ))}
    </div>
  );
}

function outerStyle(phase: Phase, dir: "left" | "right", scale: number): React.CSSProperties {
  const ty = -(SZ / 2);
  const idleTx     = dir === "left" ? -(SZ / 2) - 195 : 195 - SZ / 2;
  const approachTx = dir === "left" ? -(SZ / 2) - 40  : 40 - SZ / 2;
  const recoilTx   = dir === "left" ? -(SZ / 2) - 58  : 58 - SZ / 2;
  const base: React.CSSProperties = {
    position: "absolute", top: "50%", left: "50%", width: SZ, height: SZ,
  };

  if (phase === "done") {
    return { ...base, transform: `translateX(${idleTx}px) translateY(${ty}px)`, animation: "none" };
  }
  if (phase === "approach") {
    return {
      ...base,
      transform: `translateX(${idleTx}px) translateY(${ty}px)`,
      animation: `battle-approach-${dir} ${Math.round(D_BASE.APPROACH * scale)}ms ${EASE} forwards`,
    };
  }
  if (phase === "impact") {
    return { ...base, transform: `translateX(${approachTx}px) translateY(${ty}px)`, animation: "none" };
  }
  if (phase === "recoil") {
    return {
      ...base,
      transform: `translateX(${approachTx}px) translateY(${ty}px)`,
      animation: `battle-recoil-${dir} ${Math.round(D_BASE.RECOIL * scale)}ms ${EASE} forwards`,
    };
  }
  return { ...base, transform: `translateX(${recoilTx}px) translateY(${ty}px)`, animation: "none" };
}

function innerAnim(phase: Phase, dir: "left" | "right", scale: number): string {
  if (phase === "impact")
    return `battle-shake ${Math.round(D_BASE.IMPACT * scale)}ms ease-in-out`;
  if (phase === "dissolve" || phase === "done")
    return dir === "left"
      ? `dissolve-ccw ${Math.round(D_BASE.DISSOLVE * scale)}ms cubic-bezier(0.4,0,0.6,1) forwards`
      : `dissolve-cw  ${Math.round(D_BASE.DISSOLVE * scale)}ms cubic-bezier(0.4,0,0.6,1) forwards`;
  return "none";
}

export interface PairReactionStageProps {
  leftType: PlaceValue;
  rightType: PlaceValue;
  leftFaction?: "ab" | "ku";
  onDone: () => void;
  runKey: number;
  isPerfect?: boolean;
  /** Pixel width (default 500) */
  width?: number;
  /** Pixel height (default 200) */
  height?: number;
  /**
   * External speed override. When provided the internal speed control is hidden.
   * Default undefined = show control and use internal state.
   */
  speed?: number;
  /** Total cycle duration in ms at speed=1 (exposed so caller can sync timers) */
  cycleDuration?: never; // computed from D_BASE
}

/** Total animation cycle ms at the given speed */
export function pairCycleDuration(speed: number): number {
  const { APPROACH, IMPACT, RECOIL, DISSOLVE } = D_BASE;
  return Math.round((APPROACH + IMPACT + RECOIL + DISSOLVE) / speed) + 160;
}

export function PairReactionStage({
  leftType,
  rightType,
  leftFaction = "ab",
  onDone,
  runKey,
  isPerfect = false,
  width = 500,
  height = 200,
  speed: speedProp,
}: PairReactionStageProps) {
  const [phase, setPhase] = useState<Phase>("approach");
  const [showFlash, setShowFlash] = useState(false);
  const [internalSpeed, setInternalSpeed] = useState(1);
  const [hover, setHover] = useState<null | "l" | "r">(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const effectiveSpeed = speedProp ?? internalSpeed;
  const scale = 1 / effectiveSpeed;
  const showSpeedControl = speedProp === undefined;

  const particles = useParticles(runKey, {
    count: 22,
    colors: ["#93c5fd", "#f87171", "#60a5fa", "#fca5a5", "#bfdbfe", "#fecaca"],
    spread: 110,
    star: true,
  });

  // Initialize audio eagerly — avoids race where playWush fires before useEffect runs
  if (typeof Audio !== "undefined" && audioRef.current === null) {
    audioRef.current = new Audio("/wush.mp3");
    audioRef.current.preload = "auto";
  }
  const effectiveSpeedRef = useRef(speedProp ?? 1);
  effectiveSpeedRef.current = speedProp ?? internalSpeed;
  function playWush() {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.playbackRate = Math.min(effectiveSpeedRef.current, 4);
        audioRef.current.play().catch(() => {});
      }
    } catch {}
  }

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setHover(null);
    setPhase("approach");
    setShowFlash(false);

    const { APPROACH, IMPACT, RECOIL, DISSOLVE } = D_BASE;
    const s = scale;

    const t1 = setTimeout(() => { setPhase("impact"); setShowFlash(true); }, APPROACH * s);
    const t2 = setTimeout(() => { setPhase("recoil"); setShowFlash(false); }, (APPROACH + IMPACT) * s);
    const t3 = setTimeout(() => { setPhase("dissolve"); playWush(); }, (APPROACH + IMPACT + RECOIL) * s);
    const t4 = setTimeout(() => { setPhase("done"); onDone(); }, (APPROACH + IMPACT + RECOIL + DISSOLVE) * s);
    timers.current.push(t1, t2, t3, t4);

    return () => { timers.current.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey, effectiveSpeed]);

  const inCombat     = phase === "impact" || phase === "recoil" || phase === "dissolve";
  const barActive    = phase === "impact" || phase === "recoil";
  const rightFaction = leftFaction === "ab" ? "ku" : "ab";

  const leftAccent  = leftFaction  === "ab" ? "rgba(96,165,250,0.8)" : "rgba(248,113,113,0.8)";
  const rightAccent = rightFaction === "ab" ? "rgba(96,165,250,0.8)" : "rgba(248,113,113,0.8)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {/* Stage */}
      <div
        aria-hidden="true"
        role="presentation"
        data-phase={phase}
        style={{
          position: "relative",
          width,
          height,
          borderRadius: 16,
          overflow: "hidden",
          background: "radial-gradient(ellipse 85% 80% at 50% 55%, #fff5f5 0%, #fef2f2 100%)",
          border: "1.5px solid rgba(220,38,38,0.2)",
          boxShadow: "0 4px 24px rgba(220,38,38,0.1), 0 1px 6px rgba(0,0,0,0.08)",
          animation: phase === "impact"
            ? `stage-shake ${Math.round(D_BASE.IMPACT * 0.84 * scale)}ms ease-in-out`
            : "none",
        }}
      >
        {/* Grid */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: `
              repeating-linear-gradient(0deg,  transparent, transparent 29px, rgba(220,38,38,0.05) 29px, rgba(220,38,38,0.05) 30px),
              repeating-linear-gradient(90deg, transparent, transparent 29px, rgba(220,38,38,0.05) 29px, rgba(220,38,38,0.05) 30px)`,
          }}
        />

        {/* Phase label */}
        <div
          data-testid="pair-reaction-phase"
          style={{
            position: "absolute", top: 10, left: 0, right: 0, textAlign: "center",
            fontSize: 11, fontWeight: 900, letterSpacing: "0.13em", textTransform: "uppercase",
            pointerEvents: "none",
            color: phase === "done" ? "rgba(21,128,61,0.95)"
              : (phase === "impact" || phase === "recoil") ? "rgba(180,83,9,0.95)"
              : "rgba(220,38,38,0.7)",
          }}
        >
          {{ approach: "MENDEKAT...", impact: "BENTURAN!", recoil: "PERLAWANAN!", dissolve: "LURUH...", done: "TERNETRALISASI ✓" }[phase]}
        </div>

        {/* VS divider (approach only) */}
        {phase === "approach" && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute", left: "50%", top: 0, bottom: 0,
              transform: "translateX(-50%)",
              display: "flex", flexDirection: "column", alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{ width: 1, flex: 1, background: "linear-gradient(to bottom, transparent, rgba(239,68,68,0.4), transparent)" }} />
            <span style={{ fontSize: 10, fontWeight: 900, color: "rgba(239,68,68,0.6)", padding: "3px 0" }}>VS</span>
            <div style={{ width: 1, flex: 1, background: "linear-gradient(to bottom, transparent, rgba(239,68,68,0.4), transparent)" }} />
          </div>
        )}

        {/* Energy bars */}
        {phase !== "approach" && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute", top: 30, left: 14, right: 14,
              display: "flex", gap: 24, pointerEvents: "none",
            }}
          >
            {[{ c: "#3b82f6", flip: false }, { c: "#ef4444", flip: true }].map(({ c, flip }, i) => (
              <div key={i} style={{
                flex: 1, height: 6, borderRadius: 3, background: "rgba(0,0,0,0.08)",
                overflow: "hidden", display: "flex", justifyContent: flip ? "flex-end" : "flex-start",
              }}>
                <div key={`${runKey}-bar-${i}`} style={{
                  height: "100%", borderRadius: 3,
                  background: `linear-gradient(90deg, ${c}, ${c}88)`,
                  boxShadow: `0 0 10px ${c}`,
                  width: barActive ? "0%" : "100%",
                  animation: barActive ? `bar-drain ${Math.round(D_BASE.IMPACT * 1.1 * scale)}ms ease-in forwards` : "none",
                }} />
              </div>
            ))}
          </div>
        )}

        {/* SparkTrail during approach */}
        {phase === "approach" && (
          <>
            <SparkTrail side="left" faction={leftFaction} />
            <SparkTrail side="right" faction={rightFaction} />
          </>
        )}

        {/* Flash + shockwave + burst */}
        {showFlash && (
          <>
            <div
              aria-hidden="true"
              key={`f-${runKey}`}
              style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "radial-gradient(ellipse 60% 65% at 50% 50%, rgba(255,230,60,0.75) 0%, rgba(255,100,60,0.35) 40%, transparent 68%)",
                borderRadius: "inherit", zIndex: 10,
                animation: `flash-impact ${Math.round(D_BASE.IMPACT * scale)}ms ease-out forwards`,
              }}
            />
            <Shockwave runKey={runKey} color="#f97316" scale={scale} size={160} />
            <Burst particles={particles} scale={1} left="50%" />
          </>
        )}

        {isPerfect && phase === "done" && (
          <Popup text="NETRAL ✓" color="#16a34a" scale={1} />
        )}

        {/* Left character */}
        <div style={outerStyle(phase, "left", scale)}>
          <div
            onMouseEnter={() => { if (phase === "approach") setHover("l"); }}
            onMouseLeave={() => setHover(null)}
            style={{
              width: "100%", height: "100%",
              filter: leftFaction === "ab"
                ? "drop-shadow(0 0 12px rgba(59,130,246,0.8)) drop-shadow(0 2px 4px rgba(0,0,0,0.15))"
                : "drop-shadow(0 0 12px rgba(239,68,68,0.8)) drop-shadow(0 2px 4px rgba(0,0,0,0.15))",
              ...(inCombat
                ? { animation: innerAnim(phase, "left", scale) }
                : idleInner(phase === "approach", hover === "l", 0)),
            }}
          >
            {leftFaction === "ab"
              ? <AntibodyCharacter type={leftType} uid={`prs-l-${runKey}`} />
              : <VirusCharacter    type={leftType} uid={`prs-l-${runKey}`} />}
          </div>
        </div>

        {/* Right character */}
        <div style={outerStyle(phase, "right", scale)}>
          <div
            onMouseEnter={() => { if (phase === "approach") setHover("r"); }}
            onMouseLeave={() => setHover(null)}
            style={{
              width: "100%", height: "100%",
              filter: rightFaction === "ab"
                ? "drop-shadow(0 0 12px rgba(59,130,246,0.8)) drop-shadow(0 2px 4px rgba(0,0,0,0.15))"
                : "drop-shadow(0 0 12px rgba(239,68,68,0.8)) drop-shadow(0 2px 4px rgba(0,0,0,0.15))",
              ...(inCombat
                ? { animation: innerAnim(phase, "right", scale) }
                : idleInner(phase === "approach", hover === "r", 700)),
            }}
          >
            {rightFaction === "ab"
              ? <AntibodyCharacter type={rightType} uid={`prs-r-${runKey}`} />
              : <VirusCharacter    type={rightType} uid={`prs-r-${runKey}`} />}
          </div>
        </div>

        {/* Char name bar — visible during approach only */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: 8, left: 16, right: 16,
            display: "flex",
            justifyContent: "space-between",
            opacity: phase === "approach" ? 1 : 0,
            transition: "opacity 300ms",
            pointerEvents: "none",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: leftAccent }}>
            {CHAR_NAMES[leftFaction]?.[leftType] ?? ""}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: rightAccent }}>
            {CHAR_NAMES[rightFaction]?.[rightType] ?? ""}
          </span>
        </div>
      </div>

      {/* Speed control — only when not externally controlled */}
      {showSpeedControl && (
        <SpeedButtons speed={internalSpeed} onSpeed={setInternalSpeed} />
      )}
    </div>
  );
}
