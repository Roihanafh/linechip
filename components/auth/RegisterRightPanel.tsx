// components/auth/RegisterRightPanel.tsx
// Decorative right panel for the Register page.
// All visuals are inline — no external image imports.

export function RegisterRightPanel() {
  return (
    <div className="relative size-full flex flex-col gap-5 items-stretch justify-center p-8 overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute bg-[rgba(219,234,254,0.6)] blur-[32px] right-[-40px] rounded-[12px] size-[288px] top-[-40px] pointer-events-none" aria-hidden />
      <div className="absolute bg-[rgba(252,231,243,0.6)] blur-[32px] bottom-[-40px] left-[-40px] rounded-[12px] size-[288px] pointer-events-none" aria-hidden />

      {/* Journey progress card */}
      <div className="bg-white relative rounded-2xl shadow-[0_20px_25px_-5px_rgba(226,232,240,0.6),0_8px_10px_-6px_rgba(226,232,240,0.6)] border border-[rgba(226,232,240,0.8)] overflow-hidden">
        <div className="flex flex-col items-center gap-4 pb-0 pt-6 px-6">
          {/* Header */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <div className="bg-[#eff6ff] border border-[#dbeafe] rounded w-9 h-9 flex items-center justify-center shrink-0">
                <svg width="8" height="17" viewBox="0 0 8.33 16.67" fill="none" aria-hidden>
                  <path d="M4.17 0 L8.33 4.17 L8.33 12.5 A4.17 4.17 0 0 1 0 12.5 L0 4.17 Z" fill="#2563EB" />
                </svg>
              </div>
              <div>
                <p className="font-['JetBrains_Mono',monospace] font-medium text-[11px] tracking-[0.88px] text-[#64748b] uppercase">STATUS PERJALANAN</p>
                <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[18px] text-[#0f172a] tracking-[-0.27px]">Level 1: Pemula Garis Bilangan</p>
              </div>
            </div>
            <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl px-3 py-1 shrink-0">
              <span className="font-['JetBrains_Mono',monospace] font-bold text-[11px] tracking-[0.88px] text-[#1d4ed8]">0 / 250 XP</span>
            </div>
          </div>

          {/* XP progress bar */}
          <div className="h-2 w-full bg-[#f1f5f9] rounded-xl overflow-hidden">
            <div className="h-full w-[15%] bg-gradient-to-r from-[#2563eb] to-[#ec4899] rounded-xl" />
          </div>

          {/* Game list */}
          <div className="flex flex-col gap-3 w-full pt-2">
            {/* Game 01 */}
            <div className="bg-[#f8fafc] border border-[rgba(226,232,240,0.8)] rounded-xl flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="bg-[rgba(219,234,254,0.7)] rounded-lg w-10 h-10 flex items-center justify-center shrink-0">
                  <svg width="16" height="22" viewBox="0 0 16 21.5" fill="none" aria-hidden>
                    <path d="M8 0L0 3V10C0 14.97 3.4 19.59 8 21.5C12.6 19.59 16 14.97 16 10V3Z" fill="#2563EB" />
                  </svg>
                </div>
                <div>
                  <p className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[14px] text-[#0f172a]">Garis Bilangan Runner</p>
                  <p className="font-['JetBrains_Mono',monospace] font-medium text-[11px] tracking-[0.88px] text-[#64748b] uppercase">Navigasi angka bulat positif &amp; negatif</p>
                </div>
              </div>
              <div className="bg-white border border-[#e2e8f0] rounded px-3 py-1 shrink-0">
                <p className="font-['JetBrains_Mono',monospace] font-bold text-[13px] text-[#1d4ed8]">Game</p>
                <p className="font-['JetBrains_Mono',monospace] font-bold text-[13px] text-[#1d4ed8]">01</p>
              </div>
            </div>

            {/* Game 02 */}
            <div className="bg-[#f8fafc] border border-[rgba(226,232,240,0.8)] rounded-xl flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="bg-[rgba(252,231,243,0.7)] rounded-lg w-10 h-10 flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <circle cx="10" cy="10" r="10" fill="#DB2777" />
                    <path d="M6 10h8M10 6v8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <p className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[14px] text-[#0f172a]">Reaktor Netral (Zero-Pair)</p>
                  <p className="font-['JetBrains_Mono',monospace] font-medium text-[11px] tracking-[0.88px] text-[#64748b] uppercase">Antibodi biru vs Kuman merah jambu</p>
                </div>
              </div>
              <div className="bg-white border border-[#e2e8f0] rounded px-3 py-1 shrink-0">
                <p className="font-['JetBrains_Mono',monospace] font-bold text-[13px] text-[#db2777]">Game</p>
                <p className="font-['JetBrains_Mono',monospace] font-bold text-[13px] text-[#db2777]">02</p>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="border-t border-[#f1f5f9] w-full pt-6 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col items-center">
                <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[18px] text-[#2563eb] tracking-[-0.27px]">1.200+</p>
                <p className="font-['JetBrains_Mono',monospace] font-medium text-[11px] tracking-[0.88px] text-[#64748b] uppercase">Siswa Aktif</p>
              </div>
              <div className="flex flex-col items-center px-4 border-x border-[#e2e8f0]">
                <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[18px] text-[#0f172a] tracking-[-0.27px]">4.8★</p>
                <p className="font-['JetBrains_Mono',monospace] font-medium text-[11px] tracking-[0.88px] text-[#64748b] uppercase">Rating Guru</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[18px] text-[#db2777] tracking-[-0.27px]">4 Mode</p>
                <p className="font-['JetBrains_Mono',monospace] font-medium text-[11px] tracking-[0.88px] text-[#64748b] uppercase">Arena Game</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonial card */}
      <div className="bg-white border border-[rgba(226,232,240,0.8)] rounded-xl shadow-[0_4px_6px_-1px_#f1f5f9] flex items-start gap-4 p-5">
        <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-xl w-10 h-10 flex items-center justify-center shrink-0">
          <svg width="14" height="10" viewBox="0 0 14.17 10" fill="none" aria-hidden>
            <path d="M0 10 L2.83 0 L5.67 0 L2.83 10 Z M8.5 10 L11.33 0 L14.17 0 L11.33 10 Z" fill="#2563EB" />
          </svg>
        </div>
        <div>
          <p className="font-['Plus_Jakarta_Sans',sans-serif] italic text-[14px] text-[#334155] leading-relaxed">
            &ldquo;Belajar bilangan bulat jadi seru dan ga bikin pusing lagi! Konsep zero-pair chip ngebantu banget waktu ujian kelas 7.&rdquo;
          </p>
          <p className="font-['JetBrains_Mono',monospace] font-bold text-[11px] tracking-[0.88px] text-[#64748b] mt-1 uppercase">
            Farhan A. • Siswa Kelas 7, Bandung
          </p>
        </div>
      </div>
    </div>
  );
}
