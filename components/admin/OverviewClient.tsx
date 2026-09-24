'use client';
// components/admin/OverviewClient.tsx
// Client Component: renders overview stats with retry capability.

import { useState, useCallback } from 'react';
import StatCard from '@/components/admin/StatCard';
import type { AdminStatsData } from '@/app/admin/page';

interface OverviewClientProps {
  initialData: AdminStatsData | null;
  initialError: string | null;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export default function OverviewClient({
  initialData,
  initialError,
}: OverviewClientProps) {
  const [data, setData] = useState<AdminStatsData | null>(initialData);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Gagal memuat data statistik.');
      }
      const json = await res.json() as AdminStatsData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data statistik.');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="p-6 space-y-8">
      {/* Page heading */}
      <div>
        <h1
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: 'var(--font-baloo2), system-ui, sans-serif' }}
        >
          Overview
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Ringkasan statistik platform LineChip.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4"
        >
          <p className="flex-1 text-sm text-red-700">{error}</p>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="shrink-0 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
          >
            {loading ? 'Memuat…' : 'Coba Lagi'}
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Pengguna"
          value={loading ? null : (data?.totalUsers ?? null)}
          icon="group"
          colorScheme="blue"
        />
        <StatCard
          label="Pengguna Aktif"
          value={loading ? null : (data?.activeUsers ?? null)}
          icon="trending_up"
          colorScheme="green"
        />
        <StatCard
          label="Skor Tertinggi"
          value={loading ? null : (data?.topScore ?? null)}
          icon="leaderboard"
          colorScheme="orange"
        />
        <StatCard
          label="Akun Dinonaktifkan"
          value={loading ? null : (data?.disabledAccounts ?? null)}
          icon="block"
          colorScheme="red"
        />
      </div>

      {/* Top-10 table */}
      {!error && (
        <section aria-labelledby="top10-heading">
          <h2
            id="top10-heading"
            className="mb-3 text-lg font-semibold text-slate-700"
            style={{ fontFamily: 'var(--font-baloo2), system-ui, sans-serif' }}
          >
            Top 10 Pengguna
          </h2>

          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-surface">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600 w-12">#</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Nama</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Sekolah</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-slate-600">Skor</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }, (_, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      {[12, 40, 40, 16].map((w, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className={`h-4 w-${w} animate-pulse rounded bg-slate-200`} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data?.top10 && data.top10.length > 0 ? (
                  data.top10.map((entry, idx) => (
                    <tr key={entry.uid} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {truncate(entry.name, 50)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {truncate(entry.school, 50)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-intblue">
                        {entry.totalScore.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                      Belum ada pengguna dengan skor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
