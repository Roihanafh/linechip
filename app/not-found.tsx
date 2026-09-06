// app/not-found.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useShell } from "@/components/AppShell";

function FloatingGlyph({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`absolute select-none pointer-events-none ${className ?? ""}`}
      style={style}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

export default function NotFound() {
  const { setIsNotFound } = useShell();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const frame = useRef<number>(0);

  useEffect(() => {
    setIsNotFound(true);
    return () => setIsNotFound(false);
  }, [setIsNotFound]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setTilt({ x: px, y: py }));
  };

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <div
      onMouseMove={handleMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative flex-1 min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#f8fafc] px-5 py-14 sm:py-20"
    >
      {/* Ambient background */}
      <div className="absolute inset-0 grid-drift opacity-70" aria-hidden="true" />
      <div
        className="absolute -top-24 -left-24 w-[26rem] h-[26rem] rounded-full bg-blue-300/25 blur-3xl float-drift"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-28 -right-20 w-[24rem] h-[24rem] rounded-full bg-rose-300/20 blur-3xl float-drift-slow"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-blue-200/20 blur-3xl float-drift"
        aria-hidden="true"
      />

      {/* Floating glyphs */}
      <FloatingGlyph
        className="soft-bob font-mono font-bold text-[#2563eb]/25 text-[42px]"
        style={{ top: "16%", left: "12%", animationDelay: "0s" }}
      >
        ∑
      </FloatingGlyph>
      <FloatingGlyph
        className="soft-bob font-mono font-bold text-[#f43f5e]/25 text-[34px]"
        style={{ top: "22%", right: "14%", animationDelay: "0.8s" }}
      >
        ÷
      </FloatingGlyph>
      <FloatingGlyph
        className="soft-bob font-mono font-bold text-[#2563eb]/20 text-[30px]"
        style={{ bottom: "20%", left: "18%", animationDelay: "1.4s" }}
      >
        √
      </FloatingGlyph>
      <FloatingGlyph
        className="soft-bob text-[28px]"
        style={{ bottom: "26%", right: "20%", animationDelay: "0.4s" }}
      >
        <span className="material-symbols-outlined text-[#f43f5e]/30 text-[30px]">biotech</span>
      </FloatingGlyph>
      <FloatingGlyph
        className="soft-bob font-mono font-bold text-[#94a3b8]/30 text-[26px]"
        style={{ top: "40%", left: "8%", animationDelay: "1.1s" }}
      >
        π
      </FloatingGlyph>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full">
        {/* Brand badge */}
        <div
          className="rise-in inline-flex items-center gap-2.5 mb-8"
          style={{ "--d": "0s" } as React.CSSProperties}
        >
          <div className="bg-[#2563eb] rounded-lg w-9 h-9 flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.35)]">
            <span className="material-symbols-outlined text-white text-[18px]" aria-hidden="true">calculate</span>
          </div>
          <span className="font-mono font-bold text-[11px] tracking-[1.1px] text-[#2563eb] uppercase">
            LineChip · Halaman Hilang
          </span>
        </div>

        {/* 404 numeral with parallax */}
        <div
          className="rise-in relative mb-6"
          style={{
            "--d": "0.08s",
            transform: `perspective(900px) rotateY(${tilt.x * 10}deg) rotateX(${-tilt.y * 10}deg)`,
            transition: "transform 0.15s ease-out",
          } as React.CSSProperties}
        >
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden="true"
          >
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border-2 border-dashed border-[#bfdbfe] spin-slow" />
            <div className="absolute w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-[#fecdd3] spin-slow-rev" />
          </div>

          <h1
            className="glitch-hover glow-pulse relative font-bold text-[110px] sm:text-[150px] leading-none tracking-[-4px] gradient-text cursor-default"
            style={{ transform: `translate(${tilt.x * 16}px, ${tilt.y * 16}px)` }}
          >
            404
          </h1>
        </div>

        <h2
          className="rise-in font-semibold text-[24px] sm:text-[28px] tracking-[-0.6px] text-[#0f172a] mb-2"
          style={{ "--d": "0.16s" } as React.CSSProperties}
        >
          Rumus ini tidak ditemukan
        </h2>
        <p
          className="rise-in text-[15px] text-[#64748b] leading-relaxed mb-8 max-w-md"
          style={{ "--d": "0.24s" } as React.CSSProperties}
        >
          Halaman yang kamu cari mungkin sudah dipindah, dihapus, atau tak pernah ada dalam garis
          bilangan kami. Mari kembali ke titik nol.
        </p>

        {/* Actions */}
        <div
          className="rise-in flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto"
          style={{ "--d": "0.32s" } as React.CSSProperties}
        >
          <Link
            href="/"
            className="lift group w-full sm:w-auto flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-[15px] px-6 py-3.5 rounded-xl shadow-[0_8px_20px_-4px_rgba(37,99,235,0.45)] active:scale-[0.98] transition-all duration-200"
          >
            <span
              className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-0.5"
              aria-hidden="true"
            >
              home
            </span>
            Kembali ke Beranda
          </Link>
          <Link
            href="/game-virus"
            className="lift group w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-[#e2e8f0] hover:border-[#2563eb] hover:bg-[#eff6ff] text-[#334155] hover:text-[#1d4ed8] font-medium text-[15px] px-6 py-3.5 rounded-xl shadow-sm active:scale-[0.98] transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">sports_mma</span>
            Coba Battle Lab
            <span
              className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              arrow_forward
            </span>
          </Link>
        </div>

        {/* Error code chip */}
        <div
          className="rise-in mt-9 inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white/70 backdrop-blur px-3.5 py-1.5"
          style={{ "--d": "0.4s" } as React.CSSProperties}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] animate-pulse" aria-hidden="true" />
          <span className="font-mono text-[10px] tracking-[0.8px] text-[#94a3b8] uppercase">
            Error 404 · Resource Not Found
          </span>
        </div>
      </div>
    </div>
  );
}
