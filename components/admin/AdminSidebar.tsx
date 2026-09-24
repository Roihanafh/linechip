"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "dashboard" },
  { href: "/admin/users", label: "Pengguna", icon: "group" },
  { href: "/admin/leaderboard-reset", label: "Reset Leaderboard", icon: "leaderboard" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // Escape key handler — closes any open submenu (none currently, but wired for future use)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      // No submenus in this version; focus the active nav item on Escape
      const activeLink = navRef.current?.querySelector<HTMLAnchorElement>(
        '[aria-current="page"]'
      );
      activeLink?.focus();
    }
  }, []);

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-surface flex flex-col min-h-screen">
      {/* Logo / brand */}
      <div className="h-16 flex items-center px-5 border-b border-border">
        <Link
          href="/admin"
          className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-intblue rounded-lg"
          tabIndex={0}
        >
          <div className="w-8 h-8 bg-intblue rounded-lg flex items-center justify-center shadow-sm">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <line x1="2" y1="10" x2="18" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <circle cx="7" cy="10" r="2.5" fill="#EC4899" />
              <circle cx="13" cy="10" r="2.5" fill="white" />
              <path d="M14 7l4 3-4 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
            </svg>
          </div>
          <span
            className="font-bold text-base text-slate-900 group-hover:text-intblue transition-colors"
            style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
          >
            Admin
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav
        ref={navRef}
        aria-label="Navigasi Admin"
        className="flex-1 py-4 px-3 space-y-1"
        onKeyDown={handleKeyDown}
      >
        {NAV_ITEMS.map((item) => {
          // Exact match for /admin, prefix match for sub-routes
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-intblue",
                isActive
                  ? "bg-intblue-light text-intblue font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              <span
                className={[
                  "material-symbols-outlined text-[20px] leading-none select-none",
                  isActive ? "text-intblue" : "text-slate-400",
                ].join(" ")}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer — back to main site */}
      <div className="px-3 pb-4">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-intblue"
        >
          <span
            className="material-symbols-outlined text-[20px] leading-none select-none text-slate-400"
            aria-hidden="true"
          >
            arrow_back
          </span>
          <span>Kembali ke Situs</span>
        </Link>
      </div>
    </aside>
  );
}
