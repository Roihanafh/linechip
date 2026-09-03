import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Lihat papan peringkat LineChip dan kejar posisi teratas!",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}