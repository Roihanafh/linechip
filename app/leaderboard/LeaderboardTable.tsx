import Avatar from '@/components/profile/Avatar';
import type { LeaderboardEntry } from '@/features/leaderboard';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUid: string | null;
}

function RankBadge({ rank }: { rank: number }) {
  let colorClass: string;
  if (rank === 1) {
    colorClass = 'bg-amber-400 text-white';
  } else if (rank === 2) {
    colorClass = 'bg-slate-400 text-white';
  } else if (rank === 3) {
    colorClass = 'bg-amber-700 text-white';
  } else {
    colorClass = 'bg-slate-100 text-slate-500';
  }

  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${colorClass}`}
    >
      {rank}
    </span>
  );
}

export default function LeaderboardTable({
  entries,
  currentUid,
}: LeaderboardTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[#E2E8F0]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-600">
            <th className="px-4 py-3 text-left font-semibold w-14">
              #
            </th>
            <th className="px-4 py-3 text-left font-semibold">
              Pemain
            </th>
            <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">
              Sekolah
            </th>
            <th className="px-4 py-3 text-right font-semibold">
              Skor
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-10 text-center text-slate-500"
              >
                Belum ada pemain di papan peringkat. Jadilah yang pertama!
              </td>
            </tr>
          ) : (
            entries.map((entry) => {
              const isCurrentUser =
                currentUid !== null && entry.uid === currentUid;

              return (
                <tr
                  key={entry.uid}
                  aria-label={isCurrentUser ? 'Peringkatmu' : undefined}
                  className={
                    isCurrentUser
                      ? 'bg-intblue-light border-l-4 border-intblue'
                      : 'border-b border-[#E2E8F0] last:border-b-0 hover:bg-slate-50 transition-colors'
                  }
                >
                  <td className="px-4 py-3">
                    <RankBadge rank={entry.rank} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        photoURL={entry.photoURL}
                        name={entry.name}
                        size="sm"
                      />
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-slate-800 truncate">
                          {entry.name}
                        </span>
                        {isCurrentUser && (
                          <span className="shrink-0 text-xs font-semibold text-intblue bg-white border border-intblue rounded-full px-2 py-0.5">
                            Kamu
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell truncate max-w-[180px]">
                    {entry.school}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {entry.totalScore.toLocaleString('id-ID')}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
