import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Materi",
  description: "Pilih materi bilangan bulat yang ingin kamu pelajari hari ini.",
};

export default function MateriPage() {
  return (
    <div className="min-h-screen bg-surface py-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block text-sm font-semibold text-intblue bg-intblue-light px-4 py-1.5 rounded-full border border-intblue/20 mb-4">
            Pilih Materi
          </span>
          <h1
            className="font-bold text-4xl text-[#0f172a] mb-3"
            style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
          >
            Mau Belajar Apa Hari Ini?
          </h1>
          <p className="text-slate-500">Pilih topik dan metode belajar yang sesuai untukmu</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Penjumlahan */}
          <div className="bg-white rounded-3xl border-2 border-border hover:border-intblue shadow-sm hover:shadow-xl transition-all duration-300 p-8 group">
            <div className="w-14 h-14 bg-intblue rounded-2xl flex items-center justify-center mb-5 text-3xl font-black text-white shadow-md" style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>+</div>
            <div className="flex items-start justify-between mb-2">
              <h2 className="font-bold text-2xl text-[#0f172a]" style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>Penjumlahan</h2>
              <span className="text-xs font-bold text-intblue bg-intblue-light px-2.5 py-1 rounded-full">2 Mode</span>
            </div>
            <p className="text-slate-500 text-sm mb-6">Pelajari penjumlahan bilangan bulat positif dan negatif melalui dua metode visualisasi yang berbeda.</p>
            <div className="space-y-3">
              {[
                { label: "Garis Bilangan", desc: "Visualisasi pergerakan di garis bilangan", href: "/garis-bilangan", num: "1" },
                { label: "Model Chip", desc: "Chip biru & pink untuk memahami zero-pair", href: "/model-chip", num: "2" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="w-full flex items-center gap-3 p-4 bg-intblue-light hover:bg-intblue text-intblue hover:text-white rounded-2xl transition-all duration-200 group/btn"
                >
                  <span className="w-7 h-7 bg-intblue group-hover/btn:bg-white/20 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0">{item.num}</span>
                  <div className="text-left">
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-xs opacity-70">{item.desc}</p>
                  </div>
                  <svg className="ml-auto shrink-0 opacity-60" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* Pengurangan */}
          <div className="bg-white rounded-3xl border-2 border-border hover:border-intpink shadow-sm hover:shadow-xl transition-all duration-300 p-8 group">
            <div className="w-14 h-14 bg-intpink rounded-2xl flex items-center justify-center mb-5 text-3xl font-black text-white shadow-md" style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>&#8722;</div>
            <div className="flex items-start justify-between mb-2">
              <h2 className="font-bold text-2xl text-[#0f172a]" style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>Pengurangan</h2>
              <span className="text-xs font-bold text-intpink bg-intpink-light px-2.5 py-1 rounded-full">2 Mode</span>
            </div>
            <p className="text-slate-500 text-sm mb-6">Pelajari pengurangan bilangan bulat positif dan negatif melalui dua metode visualisasi yang berbeda.</p>
            <div className="space-y-3">
              {[
                { label: "Garis Bilangan", desc: "Visualisasi arah pengurangan", href: "/garis-bilangan", num: "1" },
                { label: "Model Chip", desc: "Hilangkan chip untuk kurangkan bilangan", href: "/model-chip", num: "2" },
              ].map((item, i) => (
                <Link
                  key={item.href + i}
                  href={item.href}
                  className="w-full flex items-center gap-3 p-4 bg-intpink-light hover:bg-intpink text-intpink hover:text-white rounded-2xl transition-all duration-200 group/btn"
                >
                  <span className="w-7 h-7 bg-intpink group-hover/btn:bg-white/20 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0">{item.num}</span>
                  <div className="text-left">
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-xs opacity-70">{item.desc}</p>
                  </div>
                  <svg className="ml-auto shrink-0 opacity-60" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Game promo */}
        <div className="bg-white rounded-2xl border border-border p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="text-3xl">🎮</div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-[#0f172a]" style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>Ingin belajar sambil bermain?</h3>
            <p className="text-slate-500 text-sm">Coba dua game seru yang menguji pemahamanmu tentang bilangan bulat!</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/game-virus" className="bg-intblue text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-intblue-dark transition-colors">
              Game Virus
            </Link>
            <Link href="/intline-run" className="border border-border text-slate-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors">
              LineChip Run
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}