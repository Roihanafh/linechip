import Link from "next/link";

const MENU_LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/materi", label: "Materi" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/tentang", label: "Tentang" },
];

const SIM_LINKS = [
  { href: "/garis-bilangan", label: "Garis Bilangan", color: "hover:text-intblue" },
  { href: "/model-chip", label: "Model Chip", color: "hover:text-intblue" },
  { href: "/game-virus", label: "Game Antibodi vs Kuman", color: "hover:text-intpink" },
  { href: "/intline-run", label: "Game Garis Bilangan", color: "hover:text-intblue" },
];

const MATERI_LINKS = [
  { href: "/model-chip",              label: "Chip · Penjumlahan",   color: "hover:text-intblue" },
  { href: "/model-chip/pengurangan",  label: "Chip · Pengurangan",   color: "hover:text-intpink" },
  { href: "/garis-bilangan/penjumlahan", label: "Mobil · Penjumlahan", color: "hover:text-intblue" },
  { href: "/garis-bilangan/pengurangan", label: "Mobil · Pengurangan", color: "hover:text-intpink" },
];

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-border py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-intblue rounded-lg flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <line x1="2" y1="10" x2="18" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="7" cy="10" r="2.5" fill="#EC4899"/>
                  <circle cx="13" cy="10" r="2.5" fill="white"/>
                </svg>
              </div>
              <span
                className="font-bold text-lg text-[#0f172a]"
                style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
              >
                LineChip
              </span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed">
              Media pembelajaran interaktif bilangan bulat untuk siswa SMP kelas VII. Visualisasi garis bilangan dan model chip zero-pair.
            </p>
          </div>

          <div className="flex gap-12 text-sm">
            <div className="space-y-2">
              <p className="font-semibold text-[#0f172a] mb-3">Menu</p>
              {MENU_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-slate-500 hover:text-intblue transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-[#0f172a] mb-3">Materi</p>
              {MATERI_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block text-slate-500 transition-colors ${link.color}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-[#0f172a] mb-3">Simulasi & Game</p>
              {SIM_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block text-slate-500 transition-colors ${link.color}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-400">
            &copy; 2024 LineChip — Dikembangkan untuk pembelajaran matematika SMP kelas VII
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-intblue rounded-full"></span>
            <span className="w-2 h-2 bg-intpink rounded-full"></span>
          </div>
        </div>
      </div>
    </footer>
  );
}

