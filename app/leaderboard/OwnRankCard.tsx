import Avatar from '@/components/profile/Avatar';
import type { LeaderboardEntry } from '@/features/leaderboard';

interface OwnRankCardProps {
  /** Entri milik pengguna yang sedang login — dijamin rank > 10 */
  entry: LeaderboardEntry;
}

export default function OwnRankCard({ entry }: OwnRankCardProps) {
  return (
    <section
      aria-label={`Peringkatmu saat ini: ke-${entry.rank}`}
      className="mt-6 rounded-2xl border-2 border-intblue bg-intblue-light px-5 py-4"
    >
      <p className="mb-3 text-sm font-semibold text-intblue">Posisimu Saat Ini</p>

      <div className="flex items-center gap-4">
        {/* Rank badge */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-intblue text-base font-bold text-white">
          {entry.rank}
        </div>

        {/* Avatar */}
        <Avatar
          photoURL={entry.photoURL}
          name={entry.name}
          size="md"
        />

        {/* Name + school */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-800">{entry.name}</p>
          <p className="truncate text-sm text-slate-500">{entry.school}</p>
        </div>

        {/* Score */}
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-intblue">
            {entry.totalScore.toLocaleString('id-ID')}
          </p>
          <p className="text-xs text-slate-500">poin</p>
        </div>
      </div>
    </section>
  );
}
