import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Beranda",
  description: "LineChip — Platform edukasi matematika interaktif dengan visualisasi garis bilangan dan model chip zero-pair untuk siswa SMP kelas VII.",
};

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-intblue-light text-intblue text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-intblue/20">
                <span>✨</span>
                <span>Platform Edukasi Matematika Interaktif</span>
              </div>
              <h1
                className="font-bold text-5xl lg:text-6xl text-[#0f172a] leading-tight mb-5"
                style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
              >
                Belajar <span className="text-intblue">Bilangan</span> Bulat Jadi{" "}
                <span className="text-intpink">Lebih Seru</span>
              </h1>
              <p className="text-slate-500 text-lg leading-relaxed mb-8 max-w-lg">
                LineChip hadir dengan visualisasi garis bilangan interaktif dan model chip zero-pair. Pilih materi, kuasai lewat simulasi, lalu taklukkan game-nya!
              </p>
              <div className="flex flex-wrap gap-4 mb-10">
                <Link
                  href="/materi"
                  className="flex items-center gap-2 bg-intblue hover:bg-intblue-dark text-white font-bold text-base px-8 py-3.5 rounded-full shadow-lg transition-all duration-200 hover:scale-[1.02]"
                >
                  Mulai Belajar
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
                <Link
                  href="/leaderboard"
                  className="border-2 border-border hover:border-intpink text-slate-600 hover:text-intpink font-semibold text-base px-8 py-3.5 rounded-full transition-all duration-200 flex items-center gap-2"
                >
                  🏆 Leaderboard
                </Link>
              </div>
              <div className="flex items-center gap-6 pt-8 border-t border-border">
                {[
                  { val: "1.200+", label: "Siswa Aktif" },
                  { val: "4.8★", label: "Rating Pengguna" },
                  { val: "4 Game", label: "Mode Interaktif" },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-4">
                    {i > 0 && <div className="w-px h-10 bg-border" />}
                    <div>
                      <p
                        className="font-bold text-xl text-intblue"
                        style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
                      >
                        {stat.val}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero illustration */}
            <div className="relative flex justify-center items-center">
              <div className="absolute w-80 h-80 bg-intblue-light rounded-full opacity-40 blur-3xl" />
              <div className="relative bg-white rounded-3xl shadow-2xl border border-border p-8 w-full max-w-md">
                <div className="flex justify-center mb-6 relative">
                  <svg width="120" height="144" viewBox="0 0 120 144" fill="none">
                    <line x1="60" y1="14" x2="60" y2="4" stroke="#2F6FED" strokeWidth="2.5" strokeLinecap="round"/>
                    <circle cx="60" cy="3" r="4" fill="#EC4899"/>
                    <rect x="28" y="15" width="64" height="52" rx="18" fill="#EAF1FF"/>
                    <rect x="28" y="15" width="64" height="52" rx="18" stroke="#2F6FED" strokeWidth="2"/>
                    <circle cx="45" cy="35" r="8" fill="#2F6FED"/>
                    <circle cx="75" cy="35" r="8" fill="#EC4899"/>
                    <circle cx="47" cy="33" r="3" fill="white"/>
                    <circle cx="77" cy="33" r="3" fill="white"/>
                    <path d="M44 51 Q60 60 76 51" stroke="#2F6FED" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                    <rect x="33" y="69" width="54" height="46" rx="14" fill="#EAF1FF"/>
                    <rect x="33" y="69" width="54" height="46" rx="14" stroke="#2F6FED" strokeWidth="2"/>
                    <rect x="42" y="77" width="36" height="22" rx="7" fill="#2F6FED"/>
                    <text x="60" y="93" textAnchor="middle" fill="white" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="700">LC</text>
                    <rect x="12" y="71" width="21" height="11" rx="5.5" fill="#EAF1FF" stroke="#EC4899" strokeWidth="2"/>
                    <rect x="87" y="71" width="21" height="11" rx="5.5" fill="#EAF1FF" stroke="#2F6FED" strokeWidth="2"/>
                    <rect x="40" y="115" width="15" height="22" rx="7.5" fill="#EAF1FF" stroke="#2F6FED" strokeWidth="2"/>
                    <rect x="65" y="115" width="15" height="22" rx="7.5" fill="#EAF1FF" stroke="#EC4899" strokeWidth="2"/>
                  </svg>
                  <div className="absolute -top-1 -right-2 bg-intpink text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">Kuman</div>
                  <div className="absolute top-10 -left-6 bg-intblue text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">Antibodi</div>
                </div>
                <div className="bg-surface rounded-xl p-3">
                  <div className="flex items-end justify-between px-1 mb-1">
                    {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className="flex flex-col items-center">
                        <span className={`text-[9px] font-mono font-semibold ${n > 0 ? "text-intblue" : n < 0 ? "text-intpink" : "text-[#0f172a] font-bold"}`}>
                          {n}
                        </span>
                        <div className={`w-px mt-0.5 ${n === 0 ? "h-3 bg-[#0f172a]" : "h-2 bg-slate-300"}`} />
                      </div>
                    ))}
                  </div>
                  <div className="h-0.5 bg-slate-200 rounded-full mx-1 relative">
                    <div className="absolute left-[45%] right-[18%] h-0.5 bg-intblue/30" />
                    <div className="absolute left-[64%] w-3.5 h-3.5 bg-intblue rounded-full -top-[6px] border-2 border-white shadow-md" />
                  </div>
                  <p className="text-center text-xs text-slate-500 mt-2 font-mono">
                    −2 + 5 = <span className="text-intblue font-bold">3</span>
                  </p>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white border border-border rounded-2xl p-3 shadow-lg">
                <div className="flex gap-1.5 mb-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-6 h-6 bg-intblue rounded-full flex items-center justify-center text-white text-[9px] font-bold">A</div>
                  ))}
                  {[1, 2].map((i) => (
                    <div key={i} className="w-6 h-6 bg-intpink rounded-full flex items-center justify-center text-white text-[9px] font-bold">K</div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 font-medium text-center">Zero-Pair Chip</p>
              </div>
              <div className="absolute -top-3 right-2 bg-white border border-border rounded-2xl p-3 shadow-lg">
                <p
                  className="font-bold text-2xl text-intblue"
                  style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
                >
                  #1
                </p>
                <p className="text-[10px] text-slate-400">Leaderboard</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 32" fill="none">
            <path d="M0 32L1440 32L1440 8Q1080 32 720 8Q360 -16 0 8Z" fill="#F8FAFC"/>
          </svg>
        </div>
      </section>

      {/* Feature cards */}
      <section className="bg-surface py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="font-bold text-3xl lg:text-4xl text-[#0f172a] mb-3"
              style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
            >
              Cara Belajar yang <span className="text-intblue">Menyenangkan</span>
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto">
              Simulasi visual dan game interaktif yang terintegrasi untuk memahami bilangan bulat dari berbagai sudut pandang.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURE_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className={`bg-white rounded-2xl border border-border p-5 ${card.borderHover} hover:shadow-xl transition-all duration-300 group flex flex-col`}
              >
                <div className={`w-11 h-11 ${card.accentClass} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shrink-0`}>
                  {card.icon}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{card.tag}</span>
                <h3
                  className="font-bold text-lg text-[#0f172a] mb-2"
                  style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
                >
                  {card.title}
                </h3>
                <p className="text-slate-500 text-sm flex-1">{card.desc}</p>
                <p className={`${card.ctaColor} text-sm font-semibold mt-4 flex items-center gap-1.5 group-hover:gap-2.5 transition-all`}>
                  {card.cta}
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4-step flow */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="font-bold text-3xl lg:text-4xl text-[#0f172a] mb-3"
              style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
            >
              Alur Belajar <span className="text-intpink">LineChip</span>
            </h2>
            <p className="text-slate-500">Empat langkah sederhana menuju pemahaman bilangan bulat yang kuat.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {LEARN_STEPS.map((item, idx) => (
              <Link
                key={idx}
                href={item.href}
                className="text-center relative group cursor-pointer"
              >
                {idx < 3 && (
                  <div className="absolute top-8 left-[55%] right-0 h-px bg-border hidden md:block" />
                )}
                <div
                  className={`w-16 h-16 ${
                    item.blue ? "bg-intblue-light group-hover:bg-intblue" : "bg-intpink-light group-hover:bg-intpink"
                  } rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 relative z-10 transition-all duration-200`}
                >
                  <span className="group-hover:scale-110 transition-transform inline-block">{item.emoji}</span>
                </div>
                <span className={`text-xs font-mono font-bold ${item.blue ? "text-intblue" : "text-intpink"}`}>
                  {item.step}
                </span>
                <h3
                  className="font-semibold text-lg text-[#0f172a] mt-1 mb-2 transition-colors"
                  style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
                >
                  {item.title}
                </h3>
                <p className="text-slate-500 text-sm">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="py-20 bg-intblue relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-16 -left-16 w-64 h-64 bg-white/5 rounded-full" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-intpink/20 rounded-full" />
        </div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2
            className="font-bold text-4xl lg:text-5xl text-white mb-4"
            style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
          >
            Siap Jadi Juara Matematika?
          </h2>
          <p className="text-white/75 text-lg mb-8">
            Mulai dari memilih materi, kuasai lewat simulasi, lalu taklukkan game dan raih #1 di leaderboard!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/materi"
              className="bg-white text-intblue font-bold text-lg px-8 py-4 rounded-full shadow-xl hover:scale-[1.03] transition-all duration-200"
            >
              Mulai Belajar
            </Link>
            <Link
              href="/leaderboard"
              className="border-2 border-white/30 text-white font-semibold text-lg px-8 py-4 rounded-full hover:bg-white/10 transition-all duration-200 flex items-center justify-center gap-2"
            >
              🏆 Lihat Leaderboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

const FEATURE_CARDS = [
  {
    href: "/garis-bilangan",
    accentClass: "bg-intblue-light",
    borderHover: "hover:border-intblue/40",
    ctaColor: "text-intblue",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <line x1="2" y1="12" x2="22" y2="12" stroke="#2F6FED" strokeWidth="2" strokeLinecap="round"/>
        <path d="M18 8l4 4-4 4" stroke="#2F6FED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="2.5" fill="#2F6FED"/>
      </svg>
    ),
    tag: "Simulasi",
    title: "Garis Bilangan",
    desc: "Lihat pergerakan positif ke kanan dan negatif ke kiri secara animasi.",
    cta: "Coba Simulasi",
  },
  {
    href: "/model-chip",
    accentClass: "bg-intpink-light",
    borderHover: "hover:border-intpink/40",
    ctaColor: "text-intpink",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="8" cy="8" r="4" fill="#2F6FED" opacity="0.9"/>
        <circle cx="16" cy="8" r="4" fill="#EC4899" opacity="0.9"/>
        <circle cx="8" cy="16" r="4" fill="#2F6FED" opacity="0.45"/>
        <circle cx="16" cy="16" r="4" fill="#EC4899" opacity="0.45"/>
      </svg>
    ),
    tag: "Simulasi",
    title: "Model Chip",
    desc: "Chip biru (antibodi) vs chip pink (kuman) untuk memahami zero-pair.",
    cta: "Coba Model Chip",
  },
  {
    href: "/game-virus",
    accentClass: "bg-gradient-to-br from-intblue-light to-intpink-light",
    borderHover: "hover:border-intblue/40",
    ctaColor: "text-intblue",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="8" cy="12" r="5" fill="#EC4899" opacity="0.85"/>
        <circle cx="16" cy="12" r="5" fill="#2F6FED" opacity="0.85"/>
        <path d="M10 12h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    tag: "Game",
    title: "Antibodi vs Kuman",
    desc: "Drag antibodi & kuman ke Reaktor Netral. Lihat penetralan langsung!",
    cta: "Main Sekarang",
  },
  {
    href: "/intline-run",
    accentClass: "bg-intblue-light",
    borderHover: "hover:border-intblue/40",
    ctaColor: "text-intblue",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" fill="#EAF1FF" stroke="#2F6FED" strokeWidth="1.5"/>
        <polygon points="9.5 8 9.5 16 17 12" fill="#2F6FED"/>
      </svg>
    ),
    tag: "Game",
    title: "Game Garis Bilangan",
    desc: "Atur dua panah pada garis bilangan dan jawab soal operasi bilangan bulat.",
    cta: "Main Sekarang",
  },
];

const LEARN_STEPS = [
  { step: "01", emoji: "📚", title: "Pilih Materi", desc: "Pilih penjumlahan atau pengurangan bilangan bulat", blue: true, href: "/materi" },
  { step: "02", emoji: "🎯", title: "Pelajari Visualisasi", desc: "Kuasai konsep lewat simulasi garis bilangan dan model chip", blue: false, href: "/garis-bilangan" },
  { step: "03", emoji: "🎮", title: "Mainkan Game", desc: "Terapkan pemahamanmu di game Antibodi vs Kuman atau Garis Bilangan", blue: true, href: "/game-virus" },
  { step: "04", emoji: "🏆", title: "Raih Peringkat", desc: "Lihat posisimu di leaderboard dan kalahkan teman-teman!", blue: false, href: "/leaderboard" },
];

