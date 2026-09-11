"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/features/auth";

// Daftar route yang menampilkan Navbar dan Footer
const MAIN_ROUTES = new Set([
  "/",
  "/game-virus",
  "/garis-bilangan",
  "/intline-run",
  "/leaderboard",
  "/materi",
  "/model-chip",
  "/tentang",
]);

interface ShellContextType {
  isNotFound: boolean;
  setIsNotFound: (val: boolean) => void;
}

const ShellContext = createContext<ShellContextType>({
  isNotFound: false,
  setIsNotFound: () => {},
});

export function useShell() {
  return useContext(ShellContext);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isNotFound, setIsNotFound] = useState(false);

  // Reset status 404 ketika navigasi ke URL lain
  useEffect(() => {
    setIsNotFound(false);
  }, [pathname]);

  const cleanPath = pathname ? (pathname.replace(/\/$/, "") || "/") : "/";
  const isMainRoute = MAIN_ROUTES.has(cleanPath);
  const showNavAndFooter = isMainRoute && !isNotFound;

  return (
    <AuthProvider>
      <ShellContext.Provider value={{ isNotFound, setIsNotFound }}>
        {showNavAndFooter && <Navbar />}
        <main className="flex-1 flex flex-col">{children}</main>
        {showNavAndFooter && <Footer />}
      </ShellContext.Provider>
    </AuthProvider>
  );
}
