// app/leaderboard/page.tsx
import type { Metadata } from "next";
import LeaderboardClient from "./LeaderboardClient";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Lihat papan peringkat LineChip — 10 pemain teratas berdasarkan skor tertinggi. Kejar posisimu dan jadilah yang terdepan!",
};

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
