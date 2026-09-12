// components/game/AllianceStage.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  AntibodyCharacter,
  VirusCharacter,
  dominantPlace,
  type PlaceValue,
} from "./CharacterSVGs";
import { Burst, Popup, Shockwave, useParticles } from "./AnimationEffects";

export type AlliancePhase = "idle" | "approach" | "bounce" | "settled";

export interface AllianceStageProps {
  bil1Value: number;
  bil2Value: number;
  faction: "ab" | "ku";
  onComplete: () => void;
  autoStart?: boolean;
  /** When true, speed/loop controls are hidden (game context). Default false. */
  hideControls?: boolean;
  speed?: number;
}

const SZ = 96;
const EASE_APPROACH = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

const ALLIANCE_LABELS: Record<AlliancePhase, string> = {
  idle:     "SIAP",
  approach: "MENDEKAT...",
  bounce:   "BERGABUNG!",
  settled:  "BERSEKUTU ✓",
};

type Dir = "left" | "right";

function allianceOuterStyle(phase: AlliancePhase, dir: Dir, scale: number): React.CSSProperties {
  const ty = -(SZ / 2);
  const idleTx     = dir === "left" ? -(SZ / 2) - 190 : 190 - SZ / 2;
  const approachTx = dir === "left" ? -(SZ / 2) - 48  : 48 - SZ / 2;

  const base: React.CSSProperties = {
    position: "absolute", top: "50%", left: "50%", width: SZ, height: SZ,
  };

  if (phase === "idle") {
    return { ...base, transform: `translateX(${idleTx}px) translateY(${ty}px)`, animation: "none" };
  }
  if (phase === "approach") {
    return {
      ...base,
      transform: `translateX(${idleTx}px) translateY(${ty}px)`,
      animation: `alliance-approach-${dir} ${Math.round(750 * scale)}ms ${EASE_APPROACH} forwards`,
    };
  }
  return { ...base, transform: `translateX(${approachTx}px) translateY(${ty}px)`, animation: "none" };
}

function allianceInnerAnim(phase: AlliancePhase, faction: "ab" | "ku", scale: number): string {
  if (phase === "bounce") return `bounce-merge ${Math.round(600 * scale)}ms ease-out forwards`;
  if (phase === "settled") return `settled-glow-${faction === "ab" ? "blue" : "red"} 2s ease-in-out infinite`;
  return "none";
}

// ─── Spark trail emitted during approach ─────────────────────────────────────
// Renders 6 small sparks that drift upward from the approach position.
// They use idle-float + fade-out to give a "leaving a trail" feel.
function SparkTrail({ accentHex, side }: { accentHex: string; side: "left" | "right" }) {
  const sparks = [0, 1, 2, 3, 4, 5];
  return (
    <>
      {sparks.map((i) => {
        const ox = side === "left" ? -(i * 18 + 14) : (i * 18 + 14);
        const oy = -20 + (i % 3) * 10;
        return (
          <span key={i} aria-hidden="true" style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 6 - i * 0.5,
            height: 6 - i * 0.5,
            borderRadius: "50%",
            background: accentHex,
            opacity: Math.max(0, 0.7 - i * 0.12),
            transform: `translate(${ox}px, ${oy}px)`,
            boxShadow: `0 0 6px ${accentHex}`,
            animation: `idle-float ${1200 + i * 200}ms ease-in-out ${i * 80}ms infinite, popup-rise ${900 + i * 150}ms ease-out ${i * 60}ms forwards`,
            pointerEvents: "none",
          }} />
        );
      })}
    </>
  );
}

// ─── Speed control buttons (same style as reference) ─────────────────────────
const SPEEDS: { mul: number; label: string }[] = [
  { mul: 0.5, label: "0.5×" },
  { mul: 1,   label: "1×"   },
  { mul: 2,   label: "2×"   },
];

function SpeedButtons({ speed, onSpeed, accent }: { speed: number; onSpeed: (v: number) => void; accent: string }) {
  return (
    <div style={{
      display: "flex", gap: 2, padding: 3,
      borderRadius: 10, background: "rgba(0,0,0,0.045)",
    }}>
      {SPEEDS.map((s) => (
        <button key={s.mul} onClick={() => onSpeed(s.mul)} style={{
          fontWeight: 800, fontSize: 11,
          padding: "5px 10px", borderRadius: 7, border: "none",
          background: speed === s.mul ? accent : "transparent",
          color: speed === s.mul ? "white" : "rgba(80,80,100,0.5)",
          cursor: "pointer", transition: "all 150ms",
        }}>
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ─── AllianceStage ──────────────────────────────────────────��─────────────────
export function AllianceStage({
  bil1Value,
  bil2Value,
  faction,
  onComplete,
  autoStart = false,
  hideControls = false,
  speed: speedProp,
}: AllianceStageProps) {
  const [phase, setPhase] = useState<AlliancePhase>("idle");
  const [runKey, setRunKey] = useState(0);
  const [showBurst, setShowBurst] = useState(false);
  const [showTrail, setShowTrail] = useState(false);
  const [internalSpeed, setInternalSpeed] = useState(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const effectiveSpeed = speedProp ?? internalSpeed;
  const scale = 1 / effectiveSpeed;

  const tier1: PlaceValue = dominantPlace(Math.abs(bil1Value));
  const tier2: PlaceValue = dominantPlace(Math.abs(bil2Value));
  const accentHex   = faction === "ab" ? "#3b82f6" : "#ef4444";
  const accentLight = faction === "ab" ? "rgba(59,130,246,0.75)" : "rgba(239,68,68,0.75)";

  const particles = useParticles(runKey, {
    count: 20,
    colors: faction === "ab"
      ? ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#ffffff"]
      : ["#ef4444", "#f87171", "#fca5a5", "#fecaca", "#ffffff"],
    spread: 100,
    upward: true,
  });

  function clearAllTimers() { timers.current.forEach(clearTimeout); timers.current = []; }
  function schedule(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms / effectiveSpeed);
    timers.current.push(id);
  }

  function play() {
    clearAllTimers();
    setShowBurst(false);
    setShowTrail(false);
    setRunKey((k) => k + 1);
    setPhase("approach");
    setShowTrail(true);

    schedule(() => {
      setShowTrail(false);
      setPhase("bounce");
      setShowBurst(true);
    }, 750);

    schedule(() => {
      setShowBurst(false);
      setPhase("settled");
      onComplete();
    }, 750 + 600);
  }

  useEffect(() => {
    if (autoStart) play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    return () => clearAllTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canPlay = phase === "idle" || phase === "settled";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      {/* Stage */}
      <div
        data-testid="alliance-stage"
        data-phase={phase}
        data-faction={faction}
        aria-hidden="true"
        role="presentation"
        onClick={() => !hideControls && canPlay && play()}
        style={{
          position: "relative",
          width: 500,
          height: 200,
          borderRadius: 16,
          overflow: "hidden",
          cursor: !hideControls && canPlay ? "pointer" : "default",
          background: faction === "ab"
            ? "radial-gradient(ellipse 85% 80% at 50% 55%, #eff6ff 0%, #dbeafe 100%)"
            : "radial-gradient(ellipse 85% 80% at 50% 55%, #fff5f5 0%, #fee2e2 100%)",
          border: `1.5px solid ${faction === "ab" ? "rgba(59,130,246,0.22)" : "rgba(239,68,68,0.22)"}`,
          boxShadow: `0 4px 24px ${faction === "ab" ? "rgba(59,130,246,0.12)" : "rgba(239,68,68,0.12)"}, 0 1px 6px rgba(0,0,0,0.08)`,
        }}
      >
        {/* Background grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 29px, ${faction === "ab" ? "rgba(59,130,246,0.05)" : "rgba(239,68,68,0.05)"} 29px, ${faction === "ab" ? "rgba(59,130,246,0.05)" : "rgba(239,68,68,0.05)"} 30px),
            repeating-linear-gradient(90deg, transparent, transparent 29px, ${faction === "ab" ? "rgba(59,130,246,0.05)" : "rgba(239,68,68,0.05)"} 29px, ${faction === "ab" ? "rgba(59,130,246,0.05)" : "rgba(239,68,68,0.05)"} 30px)`,
        }} />

        {/* + divider (idle) */}
        <div style={{
          position: "absolute", left: "50%", top: 0, bottom: 0,
          transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center",
          opacity: phase === "idle" ? 1 : 0, transition: "opacity 220ms", pointerEvents: "none",
        }}>
          <div style={{ width: 1, flex: 1, background: `linear-gradient(to bottom, transparent, ${accentHex}55, transparent)` }} />
          <span style={{ fontSize: 16, fontWeight: 900, color: `${accentHex}99`, padding: "2px 0" }}>+</span>
          <div style={{ width: 1, flex: 1, background: `linear-gradient(to bottom, transparent, ${accentHex}55, transparent)` }} />
        </div>

        {/* Phase label */}
        <div style={{
          position: "absolute", top: 10, left: 0, right: 0, textAlign: "center",
          fontSize: 12, fontWeight: 900, letterSpacing: "0.13em", textTransform: "uppercase",
          pointerEvents: "none",
          color: phase === "settled" ? "rgba(21,128,61,0.95)"
            : phase === "bounce" ? "rgba(180,83,9,0.95)"
            : accentLight,
        }}>
          {ALLIANCE_LABELS[phase]}
        </div>

        {/* Spark trails during approach */}
        {showTrail && (
          <>
            <SparkTrail accentHex={accentHex} side="left" />
            <SparkTrail accentHex={accentHex} side="right" />
          </>
        )}

        {/* Settled aura */}
        {phase === "settled" && (
          <div aria-hidden="true" style={{
            position: "absolute", left: "50%", top: "50%",
            width: 260, height: 160,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: `radial-gradient(ellipse, ${accentHex}2a 0%, transparent 70%)`,
            animation: `${faction === "ab" ? "settled-glow-blue" : "settled-glow-red"} 2s ease-in-out infinite`,
            pointerEvents: "none",
          }} />
        )}

        {/* Burst effects */}
        {showBurst && (
          <>
            <Shockwave runKey={runKey} color={accentHex} scale={scale} size={150} />
            <Burst particles={particles} scale={scale} left="50%" />
          </>
        )}

        {/* + KUAT! popup */}
        {phase === "settled" && (
          <Popup text="+ KUAT!" color={accentHex} scale={1} />
        )}

        {/* Left character */}
        <div style={allianceOuterStyle(phase, "left", scale)}>
          <div style={{
            width: SZ, height: SZ,
            filter: `drop-shadow(0 0 12px ${accentHex}cc) drop-shadow(0 2px 4px rgba(0,0,0,0.2))`,
            animation: (phase === "bounce" || phase === "settled")
              ? allianceInnerAnim(phase, faction, scale)
              : phase === "idle" ? "idle-float 3000ms ease-in-out 0ms infinite" : undefined,
          }}>
            {faction === "ab"
              ? <AntibodyCharacter type={tier1} uid="alliance-left" />
              : <VirusCharacter    type={tier1} uid="alliance-left" />}
          </div>
        </div>

        {/* Right character */}
        <div style={allianceOuterStyle(phase, "right", scale)}>
          <div style={{
            width: SZ, height: SZ,
            filter: `drop-shadow(0 0 12px ${accentHex}cc) drop-shadow(0 2px 4px rgba(0,0,0,0.2))`,
            animation: (phase === "bounce" || phase === "settled")
              ? allianceInnerAnim(phase, faction, scale)
              : phase === "idle" ? "idle-float 3000ms ease-in-out 700ms infinite" : undefined,
          }}>
            {faction === "ab"
              ? <AntibodyCharacter type={tier2} uid="alliance-right" />
              : <VirusCharacter    type={tier2} uid="alliance-right" />}
          </div>
        </div>

        {/* Click hint */}
        {!hideControls && canPlay && (
          <div style={{
            position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center",
            fontSize: 10, fontWeight: 600, color: `${accentHex}55`,
            pointerEvents: "none", letterSpacing: "0.06em",
          }}>
            Klik untuk mulai
          </div>
        )}

        <span data-testid="alliance-phase-label" style={{ display: "none" }}>{phase}</span>
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
              background: canPlay
                ? faction === "ab"
                  ? "linear-gradient(135deg,#3b82f6,#1d4ed8)"
                  : "linear-gradient(135deg,#ef4444,#b91c1c)"
                : "rgba(20,30,50,0.1)",
              color: canPlay ? "white" : "rgba(100,100,130,0.4)",
              cursor: canPlay ? "pointer" : "default",
              boxShadow: canPlay ? `0 2px 14px ${faction === "ab" ? "rgba(59,130,246,0.42)" : "rgba(239,68,68,0.42)"}` : "none",
              transition: "all 200ms",
            }}
          >
            🤝 Mulai Persekutuan
          </button>
          <SpeedButtons speed={internalSpeed} onSpeed={setInternalSpeed} accent={accentHex} />
        </div>
      )}
    </div>
  );
}

export default AllianceStage;
