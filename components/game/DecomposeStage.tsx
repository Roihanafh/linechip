// components/game/DecomposeStage.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  AntibodyCharacter,
  VirusCharacter,
  TIER_TO_PLACE,
  CHAR_NAMES,
  type PlaceValue,
} from "@/components/game/CharacterSVGs";

export interface DecomposeStageProps {
  chipTier: 1 | 10 | 100 | 1000;
  chipFaction: "ab" | "ku";
  speed: number;
  onDone: () => void;
  runKey: number;
}

export function decomposeDuration(speed: number): number {
  return Math.round(2000 / speed);
}

const PARENT_SIZE = 72;
const CHILD_SIZE  = 28;
const STAGE_H     = 190;

function lowerTier(tier: 1 | 10 | 100 | 1000): 1 | 10 | 100 {
  if (tier >= 10) return (tier / 10) as 1 | 10 | 100;
  return 1;
}

function ChipChar({ faction, place, uid, size }: {
  faction: "ab" | "ku"; place: PlaceValue; uid: string; size: number;
}) {
  return (
    <div style={{ width: size, height: size }}>
      {faction === "ab"
        ? <AntibodyCharacter type={place} uid={uid} />
        : <VirusCharacter    type={place} uid={uid} />}
    </div>
  );
}

type InternalPhase = "phase1" | "phase2" | "done";

export function DecomposeStage({ chipTier, chipFaction, speed, onDone, runKey }: DecomposeStageProps) {
  const [phase, setPhase]               = useState<InternalPhase>("phase1");
  const [shrinkStarted, setShrinkStarted] = useState(false);
  const [childVisible, setChildVisible] = useState<boolean[]>(Array(10).fill(false));
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const totalDuration  = decomposeDuration(speed);
  const holdDuration   = Math.round(totalDuration * 0.30);
  const shrinkDuration = Math.round(totalDuration * 0.25);
  const phase2Duration = totalDuration - holdDuration - shrinkDuration;
  const phase1Duration = holdDuration + shrinkDuration; // for transition timing
  
  const parentPlace    = TIER_TO_PLACE[chipTier];
  const childTier      = lowerTier(chipTier);
  const childPlace     = TIER_TO_PLACE[childTier];
  const parentName     = CHAR_NAMES[chipFaction][parentPlace];
  const childName      = CHAR_NAMES[chipFaction][childPlace];

  useEffect(() => {
    if (chipTier === 1) {
      const t = setTimeout(onDone, 0);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chipTier, runKey]);

  useEffect(() => {
    if (chipTier === 1) return;
    setPhase("phase1");
    setShrinkStarted(false);
    setChildVisible(Array(10).fill(false));
    timers.current.forEach(clearTimeout);
    timers.current = [];

    const t0 = setTimeout(() => setShrinkStarted(true), holdDuration);
    const t1 = setTimeout(() => setPhase("phase2"), holdDuration + shrinkDuration + 50);

    for (let i = 0; i < 10; i++) {
      const delay = holdDuration + shrinkDuration + 50 + i * (phase2Duration / 10);
      const idx = i;
      timers.current.push(setTimeout(() => {
        setChildVisible(prev => { const n = [...prev]; n[idx] = true; return n; });
      }, delay));
    }

    const tDone = setTimeout(() => { setPhase("done"); onDone(); }, totalDuration + 100);
    timers.current.push(t0, t1, tDone);

    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey, speed, chipTier]);

  if (chipTier === 1) return null;

  const accentBlue = "rgba(59,130,246,0.8)";
  const accentRed  = "rgba(239,68,68,0.8)";
  const glowColor  = chipFaction === "ab" ? accentBlue : accentRed;
  const childGlow  = chipFaction === "ab" ? "rgba(59,130,246,0.55)" : "rgba(239,68,68,0.55)";
  const nameColor  = chipFaction === "ab" ? "rgba(59,130,246,0.7)"  : "rgba(239,68,68,0.7)";
  const arrowColor = phase === "phase1" ? "rgba(109,40,217,0.4)" : "rgba(234,88,12,0.9)";

  const phaseLabelText  = phase === "phase1" ? "LURUH..." : phase === "phase2" ? "PECAH!" : "SELESAI";
  const phaseLabelColor = phase === "phase1" ? "rgba(124,58,237,0.8)"
                        : phase === "phase2" ? "rgba(234,88,12,0.9)"
                        : "rgba(21,128,61,0.95)";

  // Parent chip opacity:
  //   phase1, not yet shrinking: fully visible (1)
  //   phase1, shrinking: fades to 0
  //   phase2/done: show as ghost (0.12) so the left column is never empty
  const parentOpacity = phase === "phase1"
    ? (shrinkStarted ? 0 : 1)
    : 0.12;
  const parentScale   = phase === "phase1"
    ? (shrinkStarted ? 0.1 : 1)
    : 0.5;

  return (
    <div style={{ width: "100%" }}>
      <div style={{
        position: "relative",
        width: "100%",
        height: STAGE_H,
        borderRadius: 16,
        overflow: "hidden",
        background: "radial-gradient(ellipse 85% 80% at 50% 55%, #faf5ff 0%, #f5f3ff 100%)",
        border: "1.5px solid rgba(124,58,237,0.25)",
        boxShadow: "0 4px 24px rgba(124,58,237,0.1), 0 1px 6px rgba(0,0,0,0.06)",
      }}>

        {/* Grid background */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 29px, rgba(124,58,237,0.04) 29px, rgba(124,58,237,0.04) 30px)," +
            "repeating-linear-gradient(90deg, transparent, transparent 29px, rgba(124,58,237,0.04) 29px, rgba(124,58,237,0.04) 30px)",
        }} />

        {/* Phase label top-center */}
        <div style={{
          position: "absolute", top: 8, left: 0, right: 0,
          textAlign: "center", fontSize: 10, fontWeight: 900,
          letterSpacing: "0.13em", textTransform: "uppercase",
          pointerEvents: "none", color: phaseLabelColor, transition: "color 300ms", zIndex: 2,
        }}>
          {phaseLabelText}
        </div>

        {/* Bottom subtitle */}
        <div style={{
          position: "absolute", bottom: 6, left: 0, right: 0,
          textAlign: "center", fontSize: 10, fontWeight: 600,
          color: "rgba(109,40,217,0.5)", pointerEvents: "none", zIndex: 2,
        }}>
          {parentName} luruh menjadi 10 {childName}
        </div>

        {/* 3-column flex body */}
        <div style={{
          position: "absolute", top: 28, bottom: 26, left: 8, right: 8,
          display: "flex", alignItems: "center",
        }}>

          {/* LEFT: parent chip -- always rendered, never zero opacity */}
          <div style={{
            flex: "1 1 0", minWidth: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 4,
          }}>
            <div style={{
              width: PARENT_SIZE,
              height: PARENT_SIZE,
              opacity: parentOpacity,
              transform: "scale(" + parentScale + ")",
              transition:
                "opacity " + shrinkDuration + "ms ease-out," +
                "transform " + shrinkDuration + "ms cubic-bezier(0.4,0,0.2,1)",
              filter: "drop-shadow(0 0 12px " + glowColor + ")",
            }}>
              <ChipChar
                faction={chipFaction}
                place={parentPlace}
                uid={"dcp-" + runKey}
                size={PARENT_SIZE}
              />
            </div>
            <div style={{
              fontSize: 9, fontWeight: 700, color: nameColor,
              opacity: phase === "phase1" && !shrinkStarted ? 1 : 0.25,
              transition: "opacity 300ms ease-out",
              whiteSpace: "nowrap",
            }}>
              {parentName}
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, alignSelf: "stretch", background: "rgba(124,58,237,0.1)", flexShrink: 0 }} />

          {/* CENTER: arrow + label */}
          <div style={{
            flex: "0 0 76px", width: 76,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 4, pointerEvents: "none",
          }}>
            <svg width="36" height="18" viewBox="0 0 48 24" fill="none" style={{
              opacity: phase === "phase1" ? 0.4 : 1,
              transition: "opacity 400ms",
              filter: phase !== "phase1" ? "drop-shadow(0 0 5px rgba(234,88,12,0.5))" : "none",
            }}>
              <path d="M4 12H44M34 4l10 8-10 8"
                stroke={arrowColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ textAlign: "center", lineHeight: 1.4 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(109,40,217,0.7)" }}>1 luruh</div>
              <div style={{ fontSize: 8, color: "rgba(109,40,217,0.35)" }}>menjadi</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(109,40,217,0.7)" }}>10 chip</div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, alignSelf: "stretch", background: "rgba(124,58,237,0.1)", flexShrink: 0 }} />

          {/* RIGHT: 5x2 child chip grid */}
          <div style={{
            flex: "1 1 0", minWidth: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 4,
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, " + CHILD_SIZE + "px)",
              gridTemplateRows: "repeat(2, " + CHILD_SIZE + "px)",
              gap: 3,
            }}>
              {Array.from({ length: 10 }, (_, i) => {
                const visible = phase !== "phase1" && childVisible[i];
                return (
                  <div key={i} style={{
                    width: CHILD_SIZE, height: CHILD_SIZE,
                    opacity: visible ? 1 : 0,
                    transform: "scale(" + (visible ? 1 : 0) + ")",
                    transition: "transform 220ms cubic-bezier(0.34,1.56,0.64,1), opacity 180ms ease-out",
                    filter: "drop-shadow(0 0 4px " + childGlow + ")",
                  }}>
                    <ChipChar faction={chipFaction} place={childPlace} uid={"dcc-" + runKey + "-" + i} size={CHILD_SIZE} />
                  </div>
                );
              })}
            </div>
            <div style={{
              fontSize: 9, fontWeight: 700, color: nameColor,
              opacity: phase !== "phase1" ? 1 : 0,
              transition: "opacity 300ms ease-out",
              whiteSpace: "nowrap",
            }}>
              {childName} x10
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}