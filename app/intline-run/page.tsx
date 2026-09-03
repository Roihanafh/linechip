import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "LineChip Run",
  description: "Game LineChip Run — kendalikan karakter di atas garis bilangan dan jawab soal bilangan bulat.",
};

export default function IntLineRunPage() {
  return (
    <div className="min-h-screen bg-surface py-10">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/materi" className="p-2 rounded-xl bg-white border border-border hover:bg-slate-50 transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div>
            <p className="text-xs text-slate-400">Game</p>
            <h1 className="font-bold text-2xl text-[#0f172a]" style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>LineChip Run 🏃</h1>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl border border-border p-4 mb-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Kendalikan karakter IntLine yang berlari di atas garis bilangan! Jawab soal bilangan bulat dengan benar untuk melompat ke angka yang tepat dan kumpulkan poin sebanyak-banyaknya. Hindari bilangan salah!
              </p>
            </div>
            {/* Placeholder game area */}
            <div className="border-2 border-dashed border-[#CBD5E1] rounded-2xl bg-[#F1F5F9] aspect-video flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 bg-intblue/10 border-2 border-intblue/20 rounded-full flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="14" fill="#EAF1FF" stroke="#2F6FED" strokeWidth="1.5"/>
                  <polygon points="12 9 12 23 24 16" fill="#2F6FED"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-sm font-semibold">Area Game LineChip Run</p>
                <p className="text-slate-300 text-xs mt-0.5">akan dimuat di sini</p>
              </div>
            </div>
          </div>

          {/* Score panel */}
          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-2xl border border-border p-4">
              <p className="text-xs text-slate-400 mb-1">Skor Sesi</p>
              <p className="font-bold text-3xl text-slate-300" style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>—</p>
            </div>
            <div className="bg-white rounded-2xl border border-border p-4">
              <p className="text-xs text-slate-400 mb-1">🏆 Rekor Terbaik</p>
              <p className="font-bold text-3xl text-intblue" style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>347</p>
            </div>
            <div className="bg-intblue-light rounded-2xl p-4">
              <p className="text-xs text-intblue font-bold mb-1">💡 Tips</p>
              <p className="text-xs text-slate-600">Kuasai simulasi garis bilangan dulu agar mudah mengarahkan karakter!</p>
              <Link href="/garis-bilangan" className="mt-2 text-xs text-intblue font-bold hover:underline block">
                Buka simulasi →
              </Link>
            </div>
          </div>
        </div>

        <button className="w-full bg-intblue hover:bg-intblue-dark text-white font-bold text-lg py-4 rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-[1.01]">
          ▶ Mulai Bermain
        </button>
        <Link href="/materi" className="block w-full mt-3 text-slate-400 text-sm hover:text-slate-600 transition-colors py-2 text-center">
          ← Kembali ke Materi
        </Link>
      </div>
    </div>
  );
}