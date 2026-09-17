// components/game/AnimationEffects.tsx
"use client";

import { useMemo } from "react";

export interface Particle {
  tx: number; ty: number; size: number; dur: number;
  delay: number; color: string; rot: number; star: boolean;
}

export interface ParticleOptions {
  count: number;
  colors: string[];
  spread?: number;
  /** When true, bias particle direction upward (for alliance sparks) */
  upward?: boolean;
  /** When true, all particles are rendered as star (✦) shape */
  star?: boolean;
}

export function useParticles(runKey: number, opts: ParticleOptions): Particle[] {
  return useMemo(() => {
    const { colors, spread = 90, upward, star } = opts;
    const count = Math.min(opts.count, 28);
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const ang = upward
        ? -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.95
        : (i / count) * 2 * Math.PI + (Math.random() - 0.5) * 0.6;
      const dist = spread * (0.45 + Math.random() * 0.75);
      particles.push({
        tx: Math.cos(ang) * dist,
        ty: Math.sin(ang) * dist - (upward ? 18 : 0),
        size: 7 + Math.random() * 9,
        dur: 550 + Math.random() * 380,
        delay: Math.random() * 90,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 320 - 160,
        star: star !== undefined ? !!star : Math.random() < 0.4,
      });
    }
    return particles;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);
}

interface BurstProps { particles: Particle[]; scale: number; left?: string; }

export function Burst({ particles, scale, left = "50%" }: BurstProps) {
  return (
    <div aria-hidden="true" role="presentation"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 20 }}
    >
      {particles.map((p, idx) => {
        const sz = p.size * scale;
        return (
          <span key={idx} style={{
            position: "absolute",
            left,
            top: "50%",
            width: sz,
            height: sz,
            lineHeight: `${sz}px`,
            fontSize: sz,
            textAlign: "center",
            color: p.color,
            borderRadius: p.star ? 0 : "50%",
            background: p.star ? "transparent" : p.color,
            boxShadow: p.star ? "none" : `0 0 ${sz * 1.5}px ${p.color}`,
            ["--tx" as string]: `${p.tx * scale}px`,
            ["--ty" as string]: `${p.ty * scale}px`,
            ["--r" as string]: `${p.rot}deg`,
            animation: `particle-fly ${p.dur * scale}ms cubic-bezier(0.2,0.6,0.3,1) ${p.delay * scale}ms forwards`,
          }}>
            {p.star ? "✦" : null}
          </span>
        );
      })}
    </div>
  );
}

interface ShockwaveProps { runKey: number; color: string; scale: number; size?: number; }

export function Shockwave({ runKey, color, scale, size = 160 }: ShockwaveProps) {
  const dur = Math.round(600 * scale);
  return (
    <div key={runKey} aria-hidden="true" role="presentation" style={{
      position: "absolute", left: "50%", top: "50%",
      width: size, height: size,
      borderRadius: "50%",
      border: `4px solid ${color}`,
      boxShadow: `0 0 32px ${color}, 0 0 64px ${color}55, inset 0 0 32px ${color}66`,
      pointerEvents: "none", zIndex: 15,
      animation: `shockwave ${dur}ms ease-out forwards`,
    }} />
  );
}

interface PopupProps { text: string; color: string; scale: number; }

export function Popup({ text, color, scale }: PopupProps) {
  return (
    <div aria-hidden="true" role="presentation" style={{
      position: "absolute", left: "50%", top: "32%",
      transform: "translate(-50%, 0)",
      fontWeight: 900, fontSize: 26, color,
      textShadow: `0 0 20px ${color}, 0 0 40px ${color}88, 0 2px 8px rgba(0,0,0,0.5)`,
      pointerEvents: "none", whiteSpace: "nowrap", zIndex: 30,
      animation: `popup-rise ${1400 * scale}ms ease-out forwards`,
      letterSpacing: "0.04em",
    }}>
      {text}
    </div>
  );
}
