// components/game/BattleStage.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { AntibodyCharacter, VirusCharacter, type PlaceValue } from "./CharacterSVGs";
import { Burst, Popup, Shockwave, useParticles } from "./AnimationEffects";

export type BattlePhase = "idle" | "approach" | "impact" | "recoil" | "dissolve" | "done";

interface BattleStageProps {
  antibodyType: PlaceValue;
  virusType: PlaceValue;
  isPerfectNeutralization?: boolean;
  onComplete: () => void;
  autoStart?: boolean;
  /** When true, speed/loop controls are hidden (game context). Default false. */
  hideControls?: boolean;
  speed?: number;
  bil1Value?: number;
  bil2Value?: number;
}

const DURATION_APPROACH = 750;
const DURATION_IMPACT   = 500;
const DURATION_RECOIL   = 280;
const DURATION_DISSOLVE = 750;
const SZ = 96;
const EASE_APPROACH = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

const BATTLE_LABELS: Record<BattlePhase, string> = {
  idle:     "SIAP",
  approach: "MENDEKAT...",
  impact:   "BENTURAN!",
  recoil:   "PERLAWANAN!",
  dissolve: "LURUH...",
  done:     "TERNETRALISASI ✓",
};

type Dir = "left" | "right";

function battleOuterStyle(phase: BattlePhase, dir: Dir, scale: number): React.CSSProperties {
  const ty = -(SZ / 2);
  const idleTx     = dir === "left" ? -(SZ / 2) - 190 : 190 - SZ / 2;
  const approachTx = dir === "left" ? -(SZ / 2) - 40  : 40 - SZ / 2;
  const recoilTx   = dir === "left" ? -(SZ / 2) - 58  : 58 - SZ / 2;

  const base: React.CSSProperties = {
    position: "absolute", top: "50%", left: "50%", width: SZ, height: SZ,
  };

  if (phase === "idle" || phase === "done") {
    return { ...base, transform: `translateX(${idleTx}px) translateY(${ty}px)`, animation: "none" };
  }
  if (phase === "approach") {
    return {
      ...base,
      transform: `translateX(${idleTx}px) translateY(${ty}px)`,
      animation: `battle-approach-${dir} ${Math.round(DURATION_APPROACH * scale)}ms ${EASE_APPROACH} forwards`,
    };
  }
  if (phase === "impact") {
    return { ...base, transform: `translateX(${approachTx}px) translateY(${ty}px)`, animation: "none" };
  }
  if (phase === "recoil") {
    return {
      ...base,
      transform: `translateX(${approachTx}px) translateY(${ty}px)`,
      animation: `battle-recoil-${dir} ${Math.round(DURATION_RECOIL * scale)}ms ${EASE_APPROACH} forwards`,
    };
  }
  return { ...base, transform: `translateX(${recoilTx}px) translateY(${ty}px)`, animation: "none" };
}

function battleInnerAnim(phase: BattlePhase, dir: Dir, scale: number): string {
  if (phase === "impact") {
    return `battle-shake ${Math.round(DURATION_IMPACT * scale)}ms ease-in-out`;
  }
  if (phase === "dissolve" || phase === "done") {
    return dir === "left"
      ? `dissolve-ccw ${Math.round(DURATION_DISSOLVE * scale)}ms cubic-bezier(0.4,0,0.6,1) forwards`
      : `dissolve-cw ${Math.round(DURATION_DISSOLVE * scale)}ms cubic-bezier(0.4,0,0.6,1) forwards`;
  }
  return "none";
}

// ─── Speed control UI (same style as reference) ───────────────────────────

const SPEEDS: { mul: number; label: string }[] = [
  { mul: 0.5, label: "0.5×" },
  { mul: 1,   label: "1×"   },
  { mul: 2,   label: "2×"   },
];

function SpeedButtons({
  speed,
  onSpeed,
  accent,
}: {
  speed: number;
  onSpeed: (v: number) => void;
  accent: string;
}) {
  return (
    <div style={{
      display: "flex", gap: 2, padding: 3,
      borderRadius: 10, background: "rgba(0,0,0,0.045)",
    }}>
      {SPEEDS.map((s) => (
        <button
          key={s.mul}
          onClick={() => onSpeed(s.mul)}
          style={{
            fontWeight: 800, fontSize: 11,
            padding: "5px 10px", borderRadius: 7, border: "none",
            background: speed === s.mul ? accent : "transparent",
            color: speed === s.mul ? "white" : "rgba(80,80,100,0.5)",
            cursor: "pointer", transition: "all 150ms",
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ─── BattleStage ──────────────────────────────────────────────────────────

export function BattleStage({
  antibodyType,
  virusType,
  isPerfectNeutralization = false,
  onComplete,
  autoStart = false,
  hideControls = false,
  speed: speedProp,
}: BattleStageProps) {
  const [phase, setPhase] = useState<BattlePhase>("idle");
  const [runKey, setRunKey] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [internalSpeed, setInternalSpeed] = useState(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // External prop overrides internal when provided
  const effectiveSpeed = speedProp ?? internalSpeed;
  const durScale = 1 / effectiveSpeed;

  // Pre-load audio
  useEffect(() => {
    audioRef.current = new Audio("/wush.mp3");
    audioRef.current.preload = "auto";
    return () => { audioRef.current = null; };
  }, []);

  useEffect(() => {
    return () => { timers.current.forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    if (autoStart) play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  function playWush() {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.playbackRate = effectiveSpeed;
        audioRef.current.play().catch(() => {});
      }
    } catch {}
  }

  function play() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setShowFlash(false);
    setRunKey((k) => k + 1);
    const scale = 1 / effectiveSpeed;
    setPhase("approach");

    const t1 = setTimeout(() => { setPhase("impact"); setShowFlash(true); }, DURATION_APPROACH * scale);
    timers.current.push(t1);

    const t2 = setTimeout(() => { setPhase("recoil"); setShowFlash(false); },
      (DURATION_APPROACH + DURATION_IMPACT) * scale);
    timers.current.push(t2);

    const t3 = setTimeout(() => {
      setPhase("dissolve");
      playWush();
    }, (DURATION_APPROACH + DURATION_IMPACT + DURATION_RECOIL) * scale);
    timers.current.push(t3);

    const t4 = setTimeout(() => { setPhase("done"); onComplete(); },
      (DURATION_APPROACH + DURATION_IMPACT + DURATION_RECOIL + DURATION_DISSOLVE) * scale);
    timers.current.push(t4);
  }

  const particles = useParticles(runKey, {
    count: 24,
    colors: ["#fbbf24", "#f87171", "#fb923c", "#facc15", "#fde68a", "#ffffff"],
    spread: 110,
  });

  const inCombat  = phase === "impact" || phase === "recoil" || phase === "dissolve";
  const barActive = phase === "impact" || phase === "recoil";
  const canPlay   = phase === "idle" || phase === "done";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      {/* Stage */}
      <div
        aria-hidden="true"
        role="presentation"
        data-testid="battle-stage-root"
        onClick={() => !hideControls && canPlay && play()}
        style={{
          position: "relative",
          width: 500,
          height: 200,
          borderRadius: 16,
          overflow: "hidden",
          cursor: !hideControls && canPlay ? "pointer" : "default",
          background: "radial-gradient(ellipse 85% 80% at 50% 55%, #fff5f5 0%, #fef2f2 100%)",
          border: "1.5px solid rgba(220,38,38,0.2)",
          boxShadow: "0 4px 24px rgba(220,38,38,0.1), 0 1px 6px rgba(0,0,0,0.08)",
          animation: phase === "impact"
            ? `stage-shake ${Math.round(420 * durScale)}ms ease-in-out`
            : "none",
        }}
      >
        <span data-testid="battle-stage-phase"
          style={{ position: "absolute", opacity: 0, pointerEvents: "none", fontSize: 0 }}>
          {phase}
        </span>

        {/* Background grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `
            repeating-linear-gradient(0deg,  transparent, transparent 29px, rgba(220,38,38,0.05) 29px, rgba(220,38,38,0.05) 30px),
            repeating-linear-gradient(90deg, transparent, transparent 29px, rgba(220,38,38,0.05) 29px, rgba(220,38,38,0.05) 30px)`,
        }} />

        {/* Energy bars */}
        <div style={{
          position: "absolute", top: 30, left: 14, right: 14,
          display: "flex", justifyContent: "space-between", gap: 24,
          opacity: phase === "idle" ? 0 : 1, transition: "opacity 250ms", pointerEvents: "none",
        }}>
          {[{ c: "#3b82f6", flip: false }, { c: "#ef4444", flip: true }].map(({ c, flip }, i) => (
            <div key={i} style={{
              flex: 1, height: 7, borderRadius: 4, background: "rgba(0,0,0,0.08)",
              overflow: "hidden", display: "flex", justifyContent: flip ? "flex-end" : "flex-start",
            }}>
              <div key={`${runKey}-bar-${i}`} style={{
                height: "100%", borderRadius: 4,
                background: `linear-gradient(90deg, ${c}, ${c}99)`,
                boxShadow: `0 0 12px ${c}`,
                width: barActive ? "0%" : "100%",
                animation: barActive ? `bar-drain ${Math.round(560 * durScale)}ms ease-in forwards` : "none",
              }} />
            </div>
          ))}
        </div>

        {/* VS divider (idle) */}
        <div style={{
          position: "absolute", left: "50%", top: 0, bottom: 0,
          transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center",
          opacity: phase === "idle" ? 1 : 0, transition: "opacity 220ms", pointerEvents: "none",
        }}>
          <div style={{ width: 1, flex: 1, background: "linear-gradient(to bottom, transparent, rgba(239,68,68,0.4), transparent)" }} />
          <span style={{ fontSize: 11, fontWeight: 900, color: "rgba(239,68,68,0.65)", letterSpacing: "0.1em", padding: "3px 0" }}>VS</span>
          <div style={{ width: 1, flex: 1, background: "linear-gradient(to bottom, transparent, rgba(239,68,68,0.4), transparent)" }} />
        </div>

        {/* Phase label */}
        <div style={{
          position: "absolute", top: 10, left: 0, right: 0, textAlign: "center",
          fontSize: 12, fontWeight: 900, letterSpacing: "0.13em", textTransform: "uppercase",
          pointerEvents: "none",
          color: phase === "done" ? "rgba(21,128,61,0.95)"
            : (phase === "impact" || phase === "recoil") ? "rgba(180,83,9,0.95)"
            : "rgba(220,38,38,0.75)",
        }}>
          {BATTLE_LABELS[phase]}
        </div>

        {/* Impact flash + shockwave + burst */}
        {showFlash && (
          <>
            <div key={`flash-${runKey}`} aria-hidden="true" style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "radial-gradient(ellipse 60% 65% at 50% 50%, rgba(255,230,60,0.75) 0%, rgba(255,100,60,0.35) 40%, transparent 68%)",
              borderRadius: "inherit", zIndex: 10,
              animation: `flash-impact ${Math.round(DURATION_IMPACT * durScale)}ms ease-out forwards`,
            }} />
            <Shockwave runKey={runKey} color="#f97316" scale={durScale} size={170} />
            <Burst particles={particles} scale={1} left="50%" />
          </>
        )}

        {isPerfectNeutralization && phase === "done" && (
          <Popup text="NETRAL ✓" color="#16a34a" scale={1} />
        )}

        {/* Left — Antibody */}
        <div style={battleOuterStyle(phase, "left", durScale)}>
          <div style={{
            width: "100%", height: "100%",
            filter: "drop-shadow(0 0 12px rgba(59,130,246,0.8)) drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
            animation: inCombat ? battleInnerAnim(phase, "left", durScale)
              : phase === "idle" ? "idle-float 3000ms ease-in-out 0ms infinite" : undefined,
          }}>
            <AntibodyCharacter type={antibodyType} uid="battle-ab" />
          </div>
        </div>

        {/* Right — Virus */}
        <div style={battleOuterStyle(phase, "right", durScale)}>
          <div style={{
            width: "100%", height: "100%",
            filter: "drop-shadow(0 0 12px rgba(239,68,68,0.8)) drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
            animation: inCombat ? battleInnerAnim(phase, "right", durScale)
              : phase === "idle" ? "idle-float 3000ms ease-in-out 700ms infinite" : undefined,
          }}>
            <VirusCharacter type={virusType} uid="battle-ku" />
          </div>
        </div>

        {/* Click hint when idle and controls visible */}
        {!hideControls && canPlay && (
          <div style={{
            position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center",
            fontSize: 10, fontWeight: 600, color: "rgba(220,38,38,0.35)",
            pointerEvents: "none", letterSpacing: "0.06em",
          }}>
            Klik untuk mulai
          </div>
        )}
      </div>

      {/* Controls — only in standalone / preview mode */}
      {!hideControls && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={play}
            disabled={!canPlay}
            style={{
              fontWeight: 800, fontSize: 13, padding: "9px 22px",
              borderRadius: 10, border: "none",
              background: canPlay ? "linear-gradient(135deg,#ef4444,#b91c1c)" : "rgba(60,20,20,0.12)",
              color: canPlay ? "white" : "rgba(180,100,100,0.4)",
              cursor: canPlay ? "pointer" : "default",
              boxShadow: canPlay ? "0 2px 14px rgba(239,68,68,0.42)" : "none",
              transition: "all 200ms",
            }}
          >
            ⚔️ Mulai Pertempuran
          </button>
          <SpeedButtons speed={internalSpeed} onSpeed={setInternalSpeed} accent="#ef4444" />
        </div>
      )}
    </div>
  );
}
