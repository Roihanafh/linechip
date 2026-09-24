'use client';
// components/admin/UsersClient.tsx
// Client Component: search, pagination, and table for admin user management.

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import AdminTableSkeleton from '@/components/admin/AdminTableSkeleton';
import { filterUsers } from '@/lib/admin/utils';
import type { AdminUserRow } from '@/lib/admin/utils';
import type { PaginatedUsersResponse } from '@/app/admin/users/page';

interface UsersClientProps {
  initialData: PaginatedUsersResponse;
  initialError: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function UsersClient({ initialData, initialError }: UsersClientProps) {
  const [allUsers, setAllUsers] = useState<AdminUserRow[]>(initialData.users);
  const [nextCursor, setNextCursor] = useState<string | null>(initialData.nextCursor);
  // Stack of previous page cursors for "back" navigation
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const fetchPage = useCallback(async (cursor: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (cursor) params.set('cursor', cursor);
      const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Gagal memuat data pengguna.');
      }
      const json = await res.json() as PaginatedUsersResponse;
      setAllUsers(json.users);
      setNextCursor(json.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data pengguna.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNext = useCallback(() => {
    if (!nextCursor) return;
    // Push current cursor onto stack so we can go back
    setCursorStack((prev) => [...prev, currentCursor ?? '']);
    setCurrentCursor(nextCursor);
    fetchPage(nextCursor);
  }, [nextCursor, currentCursor, fetchPage]);

  const handlePrev = useCallback(() => {
    if (cursorStack.length === 0) return;
    const prevStack = [...cursorStack];
    const prev = prevStack.pop() ?? null;
    setCursorStack(prevStack);
    setCurrentCursor(prev);
    fetchPage(prev);
  }, [cursorStack, fetchPage]);

  const handleRetry = useCallback(() => {
    fetchPage(currentCursor);
  }, [fetchPage, currentCursor]);

  // Apply search filter client-side
  const displayedUsers =
    debouncedQuery.length >= 2
      ? filterUsers(allUsers, debouncedQuery)
      : allUsers;

  const isFirstPage = cursorStack.length === 0;

  return (
    <div className="p-6 space-y-6">
      {/* Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-slate-900"
            style={{ fontFamily: 'var(--font-baloo2), system-ui, sans-serif' }}
          >
            Pengguna
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola semua akun pengguna terdaftar.
          </p>
        </div>

        {/* Create user button */}
        <Link
          href="/admin/users/new"
          className="inline-flex items-center gap-2 rounded-xl bg-intblue px-4 py-2 text-sm font-semibold text-white hover:bg-intblue/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-intblue"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">person_add</span>
          Buat Pengguna Baru
        </Link>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none"
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            placeholder="Cari nama atau email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-4 text-sm text-slate-700 placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-intblue"
            aria-label="Cari pengguna berdasarkan nama atau email"
          />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4"
        >
          <p className="flex-1 text-sm text-red-700">{error}</p>
          <button
            onClick={handleRetry}
            disabled={loading}
            className="shrink-0 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Memuat…' : 'Coba Lagi'}
          </button>
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600 w-12">#</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Nama</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Sekolah</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-slate-600">Skor</th>
                  <th scope="col" className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Tanggal</th>
                </tr>
              </thead>
              {loading ? (
                <AdminTableSkeleton rows={20} columns={7} />
              ) : displayedUsers.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                      {debouncedQuery.length >= 2
                        ? `Tidak ada pengguna yang cocok dengan "${debouncedQuery}".`
                        : 'Belum ada pengguna terdaftar.'}
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody>
                  {displayedUsers.map((user, idx) => {
                    // Compute row number relative to current page
                    const pageOffset = cursorStack.length * 20;
                    return (
                      <tr
                        key={user.uid}
                        className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-500">{pageOffset + idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-intblue hover:underline">
                          <Link href={`/admin/users/${user.uid}`}>
                            {user.name || '—'}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{user.email || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{user.school || '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {user.totalScore.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              user.disabled
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {user.disabled ? 'Nonaktif' : 'Aktif'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(user.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
          </div>

          {/* Pagination controls */}
          {!loading && displayedUsers.length > 0 && debouncedQuery.length < 2 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <button
                onClick={handlePrev}
                disabled={isFirstPage || loading}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                aria-label="Halaman sebelumnya"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">chevron_left</span>
                Sebelumnya
              </button>
              <button
                onClick={handleNext}
                disabled={!nextCursor || loading}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                aria-label="Halaman berikutnya"
              >
                Berikutnya
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
