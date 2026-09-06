// components/auth/LoginRightPanel.tsx
// Decorative right panel for the Login page.
// Renders inline SVG — no external image imports required.

export function LoginRightPanel() {
  return (
    <div className="relative size-full flex flex-col gap-6 items-stretch justify-center p-8 overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute bg-[rgba(219,234,254,0.6)] blur-[32px] right-[-40px] rounded-[12px] size-[288px] top-[-40px] pointer-events-none" aria-hidden />
      <div className="absolute bg-[rgba(252,231,243,0.6)] blur-[32px] bottom-[-40px] left-[-40px] rounded-[12px] size-[288px] pointer-events-none" aria-hidden />

      {/* Main visual card */}
      <div className="bg-white relative rounded-2xl shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] border border-[rgba(226,232,240,0.8)] overflow-hidden">
        <div className="flex flex-col gap-8 items-start p-8">
          {/* Top bar */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="bg-[#2563eb] rounded-xl w-2.5 h-2.5 shrink-0" />
              <span className="font-['JetBrains_Mono',monospace] font-bold text-[11px] tracking-[0.55px] text-[#334155] uppercase">
                SIMULASI GARIS BILANGAN &amp; CHIP
              </span>
            </div>
            <div className="bg-[#fffbeb] border border-[rgba(253,230,138,0.8)] rounded-xl px-3 py-1 flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 10.5 10.5" fill="none" aria-hidden>
                <path d="M5.25 0L6.56 3.29L10.5 3.63L7.69 5.99L8.59 9.88L5.25 7.88L1.91 9.88L2.81 5.99L0 3.63L3.94 3.29Z" fill="#D97706" />
              </svg>
              <span className="font-['JetBrains_Mono',monospace] font-bold text-[13px] text-[#92400e] tracking-[0.13px]">#1 Leaderboard</span>
            </div>
          </div>

          {/* Battle header */}
          <div className="flex items-center justify-between w-full">
            <div className="bg-[rgba(219,234,254,0.8)] border border-[#bfdbfe] rounded-xl px-3 py-1 flex items-center gap-2">
              <svg width="9" height="12" viewBox="0 0 9.33 11.67" fill="none" aria-hidden>
                <path d="M4.67 11.67C3.31 11.33 2.2 10.55 1.32 9.34C0.44 8.13 0 6.79 0 5.31V1.75L4.67 0L9.33 1.75V5.31C9.33 6.79 8.89 8.13 8.01 9.34C7.13 10.55 6.02 11.33 4.67 11.67Z" fill="#1D4ED8" />
              </svg>
              <span className="font-['JetBrains_Mono',monospace] font-bold text-[11px] tracking-[0.88px] text-[#1d4ed8] uppercase">ANTIBODI (+1)</span>
            </div>
            <span className="font-['JetBrains_Mono',monospace] font-bold text-[13px] text-[#94a3b8]">VS</span>
            <div className="bg-[rgba(252,231,243,0.8)] border border-[#fbcfe8] rounded-xl px-3 py-1 flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 11.67 11.67" fill="none" aria-hidden>
                <circle cx="5.83" cy="5.83" r="5.83" fill="#BE185D" />
              </svg>
              <span className="font-['JetBrains_Mono',monospace] font-bold text-[11px] tracking-[0.88px] text-[#be185d] uppercase">KUMAN (-1)</span>
            </div>
          </div>

          {/* Garis bilangan illustration */}
          <div className="bg-[rgba(248,250,252,0.8)] border border-[rgba(226,232,240,0.6)] rounded-xl w-full p-6 flex flex-col items-center gap-6">
            {/* Chip mascot illustration */}
            <div className="drop-shadow-[0_2px_1px_rgba(0,0,0,0.06)] flex items-center justify-center">
              <svg width="120" height="120" viewBox="0 0 144 160" fill="none" aria-hidden>
                {/* Body */}
                <rect x="22" y="50" width="100" height="80" rx="14" fill="white" stroke="#2563eb" strokeWidth="2.7" />
                {/* Head circle */}
                <circle cx="72" cy="45" r="20" fill="white" stroke="#2563eb" strokeWidth="2.7" />
                {/* Eyes */}
                <circle cx="65" cy="42" r="5" fill="#2563eb" opacity="0.35" />
                <circle cx="79" cy="42" r="5" fill="#ec4899" opacity="0.35" />
                <circle cx="65" cy="42" r="7" fill="#2563eb" />
                <circle cx="79" cy="42" r="7" fill="#ec4899" />
                <circle cx="65" cy="42" r="3" fill="white" />
                <circle cx="79" cy="42" r="3" fill="white" />
                {/* Smile */}
                <path d="M63 52 C67 57 77 57 81 52" stroke="#0F172A" strokeLinecap="round" strokeWidth="2.25" fill="none" />
                {/* Arms */}
                <rect x="8" y="68" width="22" height="32" rx="11" fill="white" stroke="#2563eb" strokeWidth="2.25" />
                <rect x="114" y="68" width="22" height="32" rx="11" fill="white" stroke="#ec4899" strokeWidth="2.25" />
                {/* +1 / -1 chips */}
                <rect x="18" y="105" width="22" height="18" rx="4" fill="#2563eb" />
                <text x="29" y="118" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">+1</text>
                <rect x="104" y="105" width="22" height="18" rx="4" fill="#db2777" />
                <text x="115" y="118" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">-1</text>
                {/* LC badge */}
                <rect x="57" y="72" width="30" height="18" rx="4" fill="#2563eb" />
                <text x="72" y="85" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="JetBrains Mono">LC</text>
              </svg>
            </div>

            {/* Zero pair chips row */}
            <div className="bg-white border border-[#e2e8f0] rounded-xl w-full shadow-sm px-4 py-3 flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                {/* Pair 1 */}
                <div className="bg-[#f1f5f9] border border-[#e2e8f0] rounded p-1.5 flex items-center gap-1.5">
                  <div className="bg-[#2563eb] rounded-xl w-8 h-8 flex items-center justify-center text-white font-['JetBrains_Mono',monospace] font-bold text-[13px]">+1</div>
                  <div className="bg-[#94a3b8] h-0.5 w-3" />
                  <div className="bg-[#db2777] rounded-xl w-8 h-8 flex items-center justify-center text-white font-['JetBrains_Mono',monospace] font-bold text-[13px]">-1</div>
                </div>
                <span className="font-['JetBrains_Mono',monospace] font-bold text-[#94a3b8]">+</span>
                {/* Pair 2 */}
                <div className="bg-[#f1f5f9] border border-[#e2e8f0] rounded p-1.5 flex items-center gap-1.5">
                  <div className="bg-[#2563eb] rounded-xl w-8 h-8 flex items-center justify-center text-white font-['JetBrains_Mono',monospace] font-bold text-[13px]">+1</div>
                  <div className="bg-[#94a3b8] h-0.5 w-3" />
                  <div className="bg-[#db2777] rounded-xl w-8 h-8 flex items-center justify-center text-white font-['JetBrains_Mono',monospace] font-bold text-[13px]">-1</div>
                </div>
                <span className="font-['JetBrains_Mono',monospace] font-bold text-[#94a3b8]">+</span>
                {/* Remaining */}
                <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded p-1.5">
                  <div className="bg-[#2563eb] rounded-xl w-8 h-8 flex items-center justify-center text-white font-['JetBrains_Mono',monospace] font-bold text-[13px]">+1</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-['JetBrains_Mono',monospace] text-[13px] text-[#475569]">Zero-Pair Netral: (0) + (0) + (+1) =</span>
                <div className="bg-[rgba(219,234,254,0.7)] border border-[#bfdbfe] rounded px-2 py-0.5">
                  <span className="font-['JetBrains_Mono',monospace] font-bold text-[18px] text-[#1d4ed8] tracking-[-0.27px]">+1</span>
                </div>
              </div>
            </div>

            {/* Number line */}
            <div className="w-full">
              <div className="relative h-8 w-full flex items-center">
                <div className="absolute inset-x-0 h-1 bg-[#e2e8f0] rounded-xl" />
                <div className="absolute left-1/3 right-1/3 h-1 bg-[#2563eb] rounded-xl" />
                {/* Markers */}
                {[
                  { label: "-2", color: "#db2777", weight: "bold", left: "0%" },
                  { label: "-1", color: "#64748b", weight: "medium", left: "25%" },
                  { label: "0", color: "#1e293b", weight: "bold", left: "50%", tall: true },
                  { label: "+1", color: "#2563eb", weight: "bold", left: "75%", active: true },
                  { label: "+2", color: "#64748b", weight: "medium", left: "100%" },
                ].map((m) => (
                  <div key={m.label} className="absolute flex flex-col items-center" style={{ left: m.left, transform: "translateX(-50%)" }}>
                    <div className={`${m.tall ? "h-4 w-1.5" : "h-3 w-1"} rounded-xl mb-1`}
                      style={{ background: m.color, marginBottom: 4 }} />
                    {m.active && (
                      <div className="absolute -top-0.5 w-3.5 h-3.5 rounded-full bg-[#2563eb] ring-2 ring-[#bfdbfe] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>
                    )}
                    <span className="font-['JetBrains_Mono',monospace] font-bold text-[11px]" style={{ color: m.color }}>{m.label}</span>
                  </div>
                ))}
              </div>
              <div className="text-center mt-2">
                <span className="font-['JetBrains_Mono',monospace] text-[14px] text-[#1e293b]">Persamaan: <strong className="text-[#db2777]">-2</strong> + <strong className="text-[#2563eb]">3</strong> = <strong className="text-[#2563eb]">+1</strong></span>
              </div>
            </div>
          </div>

          {/* Concept hint */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl w-full px-4 py-4 flex gap-3.5">
            <span className="material-symbols-outlined text-[#f59e0b] text-[18px] shrink-0">lightbulb</span>
            <div>
              <p className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[14px] text-[#0f172a]">Konsep Zero-Pair</p>
              <p className="font-['Plus_Jakarta_Sans',sans-serif] text-[14px] text-[#475569] leading-relaxed mt-0.5">
                Satu chip positif (Antibodi) dan satu chip negatif (Kuman) saling menetralkan menjadi nol.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat badges */}
      <div className="flex gap-4">
        <div className="bg-white border border-[rgba(226,232,240,0.9)] rounded-xl flex-1 flex items-center gap-3.5 p-4 shadow-sm">
          <div className="bg-[#eff6ff] border border-[#dbeafe] rounded w-11 h-11 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#2563eb] text-[18px]">groups</span>
          </div>
          <div>
            <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[18px] text-[#0f172a]">1.200+</p>
            <p className="font-['Plus_Jakarta_Sans',sans-serif] text-[14px] text-[#64748b]">Siswa Aktif Belajar</p>
          </div>
        </div>
        <div className="bg-white border border-[rgba(226,232,240,0.9)] rounded-xl flex-1 flex items-center gap-3.5 p-4 shadow-sm">
          <div className="bg-[#fffbeb] border border-[#fef3c7] rounded w-11 h-11 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#f59e0b] text-[18px]">star</span>
          </div>
          <div>
            <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[18px] text-[#0f172a]">4.8 / 5.0</p>
            <p className="font-['Plus_Jakarta_Sans',sans-serif] text-[14px] text-[#64748b]">Rating Guru &amp; Siswa</p>
          </div>
        </div>
      </div>
    </div>
  );
}
