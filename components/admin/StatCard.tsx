interface StatCardProps {
  label: string;
  value: number | null;
  icon: string; // Material Symbols Outlined icon name, e.g. "group", "leaderboard"
  colorScheme: "blue" | "green" | "orange" | "red";
}

const colorMap: Record<
  StatCardProps["colorScheme"],
  { bg: string; iconBg: string; iconText: string; valueText: string }
> = {
  blue: {
    bg: "bg-blue-50 border-blue-200",
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
    valueText: "text-blue-700",
  },
  green: {
    bg: "bg-green-50 border-green-200",
    iconBg: "bg-green-100",
    iconText: "text-green-600",
    valueText: "text-green-700",
  },
  orange: {
    bg: "bg-orange-50 border-orange-200",
    iconBg: "bg-orange-100",
    iconText: "text-orange-600",
    valueText: "text-orange-700",
  },
  red: {
    bg: "bg-red-50 border-red-200",
    iconBg: "bg-red-100",
    iconText: "text-red-600",
    valueText: "text-red-700",
  },
};

export default function StatCard({ label, value, icon, colorScheme }: StatCardProps) {
  const colors = colorMap[colorScheme];

  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border p-5 ${colors.bg}`}
      aria-label={`${label}: ${value !== null ? value.toLocaleString("id-ID") : "memuat"}`}
    >
      {/* Icon badge */}
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors.iconBg}`}
        aria-hidden="true"
      >
        <span className={`material-symbols-outlined text-2xl ${colors.iconText}`}>
          {icon}
        </span>
      </div>

      {/* Label + value */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {value === null ? (
          /* Skeleton pulse while loading */
          <div
            className="mt-1 h-8 w-20 animate-pulse rounded bg-slate-200"
            aria-hidden="true"
          />
        ) : (
          <p className={`text-2xl font-bold ${colors.valueText}`}>
            {value.toLocaleString("id-ID")}
          </p>
        )}
      </div>
    </div>
  );
}
