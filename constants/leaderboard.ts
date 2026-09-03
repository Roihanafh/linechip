export interface Student {
  rank: number;
  name: string;
  avatar: string;
  school: string;
  score: number;
  stars: number;
  streak: number;
  level: string;
  accuracy: number;
  trend: "up" | "down" | "same";
  badge?: string;
}

export type Period = "weekly" | "monthly" | "alltime";
export type Filter = "all" | "garis" | "chip" | "game";

export const WEEKLY: Student[] = [
  { rank: 1, name: "Siti Rahayu", avatar: "👧", school: "7A", score: 1420, stars: 28, streak: 7, level: "Master", accuracy: 96, trend: "up", badge: "🔥" },
  { rank: 2, name: "Ahmad Fauzi", avatar: "👦", school: "7B", score: 1350, stars: 25, streak: 5, level: "Master", accuracy: 94, trend: "same", badge: "⚡" },
  { rank: 3, name: "Budi Santoso", avatar: "🧑", school: "7A", score: 1280, stars: 22, streak: 4, level: "Expert", accuracy: 91, trend: "up", badge: "🌟" },
  { rank: 4, name: "Dewi Kartika", avatar: "👧", school: "7C", score: 1150, stars: 20, streak: 3, level: "Expert", accuracy: 88, trend: "down" },
  { rank: 5, name: "Eko Prasetyo", avatar: "👨", school: "7B", score: 1080, stars: 18, streak: 3, level: "Advanced", accuracy: 85, trend: "up" },
  { rank: 6, name: "Fitri Handayani", avatar: "👩", school: "7D", score: 960, stars: 15, streak: 2, level: "Advanced", accuracy: 82, trend: "down" },
  { rank: 7, name: "Galih Nugroho", avatar: "👦", school: "7A", score: 890, stars: 14, streak: 2, level: "Intermediate", accuracy: 79, trend: "same" },
  { rank: 8, name: "Hani Puspita", avatar: "👧", school: "7C", score: 820, stars: 12, streak: 1, level: "Intermediate", accuracy: 76, trend: "up" },
  { rank: 9, name: "Irfan Maulana", avatar: "🧒", school: "7B", score: 750, stars: 11, streak: 1, level: "Beginner", accuracy: 73, trend: "same" },
  { rank: 10, name: "Joko Widodo", avatar: "👨", school: "7D", score: 680, stars: 10, streak: 0, level: "Beginner", accuracy: 70, trend: "down" },
];

export const MONTHLY: Student[] = [
  { rank: 1, name: "Ahmad Fauzi", avatar: "👦", school: "7B", score: 4850, stars: 95, streak: 18, level: "Master", accuracy: 93, trend: "up", badge: "🏆" },
  { rank: 2, name: "Siti Rahayu", avatar: "👧", school: "7A", score: 4720, stars: 91, streak: 15, level: "Master", accuracy: 96, trend: "same", badge: "🥇" },
  { rank: 3, name: "Dewi Kartika", avatar: "👧", school: "7C", score: 4380, stars: 82, streak: 12, level: "Expert", accuracy: 88, trend: "up", badge: "🌟" },
  { rank: 4, name: "Budi Santoso", avatar: "🧑", school: "7A", score: 4100, stars: 76, streak: 10, level: "Expert", accuracy: 91, trend: "down" },
  { rank: 5, name: "Eko Prasetyo", avatar: "👨", school: "7B", score: 3850, stars: 68, streak: 8, level: "Advanced", accuracy: 85, trend: "up" },
  { rank: 6, name: "Galih Nugroho", avatar: "👦", school: "7A", score: 3500, stars: 62, streak: 7, level: "Advanced", accuracy: 79, trend: "same" },
  { rank: 7, name: "Fitri Handayani", avatar: "👩", school: "7D", score: 3200, stars: 55, streak: 6, level: "Intermediate", accuracy: 82, trend: "up" },
  { rank: 8, name: "Hani Puspita", avatar: "👧", school: "7C", score: 2900, stars: 50, streak: 4, level: "Intermediate", accuracy: 76, trend: "down" },
  { rank: 9, name: "Kiki Amelia", avatar: "👩", school: "7B", score: 2600, stars: 44, streak: 3, level: "Intermediate", accuracy: 74, trend: "up" },
  { rank: 10, name: "Lukman Hakim", avatar: "👦", school: "7D", score: 2300, stars: 38, streak: 2, level: "Beginner", accuracy: 70, trend: "same" },
];

export const ALLTIME: Student[] = [
  { rank: 1, name: "Budi Santoso", avatar: "🧑", school: "7A", score: 24500, stars: 412, streak: 45, level: "Grandmaster", accuracy: 92, trend: "same", badge: "👑" },
  { rank: 2, name: "Ahmad Fauzi", avatar: "👦", school: "7B", score: 22800, stars: 385, streak: 38, level: "Grandmaster", accuracy: 93, trend: "up", badge: "🏆" },
  { rank: 3, name: "Siti Rahayu", avatar: "👧", school: "7A", score: 21200, stars: 360, streak: 30, level: "Master", accuracy: 96, trend: "up", badge: "🥇" },
  { rank: 4, name: "Dewi Kartika", avatar: "👧", school: "7C", score: 18900, stars: 310, streak: 25, level: "Master", accuracy: 88, trend: "same" },
  { rank: 5, name: "Eko Prasetyo", avatar: "👨", school: "7B", score: 17500, stars: 280, streak: 22, level: "Expert", accuracy: 85, trend: "down" },
  { rank: 6, name: "Fitri Handayani", avatar: "👩", school: "7D", score: 15800, stars: 248, streak: 18, level: "Expert", accuracy: 82, trend: "up" },
  { rank: 7, name: "Galih Nugroho", avatar: "👦", school: "7A", score: 14200, stars: 218, streak: 15, level: "Advanced", accuracy: 79, trend: "down" },
  { rank: 8, name: "Hani Puspita", avatar: "👧", school: "7C", score: 12600, stars: 195, streak: 12, level: "Advanced", accuracy: 76, trend: "same" },
  { rank: 9, name: "Irfan Maulana", avatar: "🧒", school: "7B", score: 11000, stars: 170, streak: 10, level: "Intermediate", accuracy: 73, trend: "up" },
  { rank: 10, name: "Joko Widodo", avatar: "👨", school: "7D", score: 9500, stars: 145, streak: 8, level: "Intermediate", accuracy: 70, trend: "down" },
];

export const LEADERBOARD_DATA: Record<Period, Student[]> = {
  weekly: WEEKLY,
  monthly: MONTHLY,
  alltime: ALLTIME,
};

export const LEVEL_STYLE: Record<string, string> = {
  Grandmaster: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  Master: "bg-purple-100 text-purple-700 border border-purple-200",
  Expert: "bg-intblue-light text-intblue border border-intblue/20",
  Advanced: "bg-green-100 text-green-700 border border-green-200",
  Intermediate: "bg-orange-100 text-orange-700 border border-orange-200",
  Beginner: "bg-slate-100 text-slate-600 border border-slate-200",
};

export const LEVELS = [
  { level: "Grandmaster", req: "20.000+ pts", icon: "👑" },
  { level: "Master", req: "10.000+ pts", icon: "🏆" },
  { level: "Expert", req: "5.000+ pts", icon: "🌟" },
  { level: "Advanced", req: "2.500+ pts", icon: "⚡" },
  { level: "Intermediate", req: "1.000+ pts", icon: "📈" },
  { level: "Beginner", req: "0+ pts", icon: "🌱" },
];
