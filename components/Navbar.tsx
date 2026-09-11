"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth";
import { useAccountDropdown } from "@/features/profile";
import Avatar from "@/components/profile/Avatar";
import AccountDropdown from "@/components/profile/AccountDropdown";

const LINKS = [
  { label: "Beranda", href: "/" },
  { label: "Materi", href: "/materi" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Tentang", href: "/tentang" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const { user, profile, loading } = useAuth();
  const {
    isOpen,
    toggle,
    triggerRef,
    dropdownRef,
    isLoggingOut,
    handleLogout,
    close,
  } = useAccountDropdown();

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-intblue rounded-xl flex items-center justify-center shadow-sm">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <line x1="2" y1="10" x2="18" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="7" cy="10" r="2.5" fill="#EC4899"/>
                <circle cx="13" cy="10" r="2.5" fill="white"/>
                <path d="M14 7l4 3-4 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
              </svg>
            </div>
            <span
              className="font-bold text-xl text-[#0f172a] group-hover:text-intblue transition-colors"
              style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
            >
              LineChip
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  pathname === link.href
                    ? "bg-intblue-light text-intblue font-semibold"
                    : "text-slate-500 hover:text-intblue hover:bg-intblue-light"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop: auth-aware CTA */}
            {loading ? (
              // Skeleton while auth state resolves
              <div
                className="hidden md:block w-8 h-8 rounded-full bg-slate-200 animate-pulse"
                aria-hidden="true"
              />
            ) : user && profile ? (
              // Logged in: Avatar button + dropdown
              <div className="hidden md:block relative">
                <button
                  ref={triggerRef}
                  type="button"
                  onClick={toggle}
                  aria-label={`Menu akun ${profile.name}`}
                  aria-expanded={isOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-intblue"
                >
                  <Avatar photoURL={profile.photoURL} name={profile.name} size="sm" />
                </button>
                {isOpen && (
                  <div ref={dropdownRef} className="absolute right-0 top-full mt-2 z-50">
                    <AccountDropdown
                      user={profile}
                      onClose={close}
                      onLogout={handleLogout}
                      isLoggingOut={isLoggingOut}
                    />
                  </div>
                )}
              </div>
            ) : (
              // Not logged in: Masuk button
              <Link
                href="/login"
                className="hidden md:flex items-center gap-2 bg-intblue hover:bg-intblue-dark text-white text-sm font-bold px-5 py-2 rounded-full transition-all duration-200 shadow-sm"
              >
                Masuk
              </Link>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                {menuOpen ? (
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  />
                ) : (
                  <>
                    <rect x="3" y="5" width="14" height="2" rx="1" />
                    <rect x="3" y="9" width="14" height="2" rx="1" />
                    <rect x="3" y="13" width="14" height="2" rx="1" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-border pb-4 pt-3 space-y-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-intblue-light text-intblue font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile: account section */}
            {!loading && user && profile ? (
              <div className="mt-2 pt-2 border-t border-border space-y-1">
                <div className="flex items-center gap-3 px-4 py-2">
                  <Avatar photoURL={profile.photoURL} name={profile.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{profile.name}</p>
                    <p className="text-xs text-slate-500 truncate">{profile.email}</p>
                  </div>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Profil Saya
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="block w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-error hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {isLoggingOut ? "Keluar..." : "Keluar"}
                </button>
              </div>
            ) : !loading && !user ? (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="block w-full mt-2 bg-intblue text-white text-sm font-bold py-2.5 rounded-full text-center"
              >
                Masuk
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </nav>
  );
}
