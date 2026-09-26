import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tentang",
  description: "Pelajari lebih lanjut tentang platform LineChip dan tim pengembangnya.",
};

export default function TentangPage() {
  return (
    <div className="min-h-screen bg-surface py-16">
      <div className="max-w-2xl mx-auto px-4">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-intblue opacity-50" />
            <div className="w-12 h-12 bg-intblue rounded-2xl flex items-center justify-center shadow-md">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <line x1="2" y1="11" x2="20" y2="11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="11" cy="11" r="3" fill="white"/>
                <path d="M16 7l5 4-5 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75"/>
              </svg>
            </div>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-intpink opacity-50" />
          </div>
          <h1 className="font-bold text-4xl text-[#0f172a] mb-4" style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>Tentang LineChip</h1>
          <p className="text-slate-500 leading-relaxed">
            LineChip adalah platform pembelajaran interaktif yang dirancang khusus untuk membantu siswa SMP kelas VII memahami operasi penjumlahan dan pengurangan bilangan bulat melalui pendekatan visual yang inovatif.
          </p>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border border-border p-6 mb-6">
          <p className="text-slate-600 leading-relaxed text-sm">
            Dengan LineChip, siswa dapat memvisualisasikan konsep bilangan bulat menggunakan dua metode utama:{" "}
            <strong className="text-intblue">simulasi garis bilangan</strong> yang menunjukkan pergerakan kiri-kanan, dan{" "}
            <strong className="text-intpink">model chip zero-pair</strong> yang menggunakan chip biru (positif) dan pink (negatif) untuk mengilustrasikan penjumlahan dan pengurangan bilangan bulat secara konkret.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-8">
          <div className="flex-1 h-px bg-intblue/20" />
          <div className="w-2 h-2 bg-intblue rounded-full" />
          <div className="w-2 h-2 bg-intpink rounded-full" />
          <div className="flex-1 h-px bg-intpink/20" />
        </div>

        {/* Goals */}
        <h2 className="font-bold text-2xl text-[#0f172a] mb-4" style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>Tujuan Platform</h2>
        <div className="space-y-3 mb-8">
          {GOALS.map((item, i) => (
            <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-border">
              <span className="text-xl mt-0.5 shrink-0">{item.e}</span>
              <p className="text-slate-600 text-sm">{item.t}</p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-8">
          <div className="flex-1 h-px bg-border" />
          <div className="w-2 h-2 bg-intblue rounded-full" />
          <div className="w-2 h-2 bg-intpink rounded-full" />
          <div className="flex-1 h-px bg-border" />
        </div>


        {/* Institution */}
        <div className="bg-gradient-to-r from-intblue-light to-intpink-light rounded-2xl p-6 border border-border text-center mb-8">
          <p className="font-bold text-[#0f172a] mb-1">🏫 Dikembangkan untuk</p>
          <p className="text-slate-600 text-sm">SMP Negeri — Program Matematika Interaktif Kelas VII</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="w-1.5 h-1.5 bg-intblue rounded-full" />
            <p className="text-xs text-slate-400">&copy; 2024 LineChip — Semua hak cipta dilindungi</p>
            <div className="w-1.5 h-1.5 bg-intpink rounded-full" />
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="text-intblue hover:text-intblue-dark font-semibold text-sm transition-colors flex items-center gap-1 mx-auto justify-center">
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

const GOALS = [
  { e: "🎯", t: "Membantu siswa memahami konsep bilangan bulat secara visual dan interaktif" },
  { e: "🧠", t: "Memperkuat pemahaman lewat simulasi garis bilangan dan model chip zero-pair" },
  { e: "🎮", t: "Membuat matematika menyenangkan melalui gamifikasi dan kompetisi leaderboard" },
  { e: "📊", t: "Membantu guru memantau perkembangan belajar siswa secara terstruktur" },
];

const TEAM = [
  { name: "Rina Kusumawati", role: "Lead Developer & UI Designer", avatar: "👩‍💻", color: "intblue" },
  { name: "Budi Santoso", role: "Content & Curriculum Developer", avatar: "👨‍🏫", color: "intpink" },
  { name: "Dewi Lestari", role: "Mathematics Education Specialist", avatar: "👩‍🔬", color: "intblue" },
];