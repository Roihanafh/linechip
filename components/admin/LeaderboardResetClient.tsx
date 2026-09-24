'use client';
// components/admin/LeaderboardResetClient.tsx
// Client Component: handles selected and full leaderboard reset with confirmation dialog.

import { useState, useCallback } from 'react';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';
import type { AdminUserRow } from '@/lib/admin/utils';

type ResetMode = 'selected' | 'all';
type ResetState = 'idle' | 'loading' | 'success' | 'error';

interface LeaderboardResetClientProps {
  users: AdminUserRow[];
  initialError: string | null;
}

export default function LeaderboardResetClient({
  users: initialUsers,
  initialError,
}: LeaderboardResetClientProps) {
  const [mode, setMode] = useState<ResetMode>('selected');
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [resetState, setResetState] = useState<ResetState>('idle');
  const [resetError, setResetError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number>(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Local copy of users for updating scores after reset
  const [users, setUsers] = useState<AdminUserRow[]>(initialUsers);

  const isLoading = resetState === 'loading';

  // ── Selection helpers ──────────────────────────────────────────────────────

  const toggleUser = useCallback((uid: string) => {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }, []);

  // Only users with totalScore > 0 are meaningful to select-all
  const selectableUsers = users.filter((u) => u.totalScore > 0);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedUids(new Set(selectableUsers.map((u) => u.uid)));
      } else {
        setSelectedUids(new Set());
      }
    },
    [selectableUsers]
  );

  // ── Dialog handlers ────────────────────────────────────────────────────────

  const handleResetClick = useCallback(() => {
    setResetError(null);
    setDialogOpen(true);
  }, []);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    setDialogOpen(false);
    setResetState('loading');
    setResetError(null);

    try {
      const body =
        mode === 'all'
          ? { mode: 'all' }
          : { mode: 'selected', uids: [...selectedUids] };

      const res = await fetch('/api/admin/leaderboard/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? 'Gagal melakukan reset leaderboard.'
        );
      }

      const data = await res.json() as { ok: boolean; updatedCount: number };
      setSuccessCount(data.updatedCount);
      setResetState('success');

      // Update local scores to 0 for reset users
      setUsers((prev) =>
        prev.map((u) =>
          mode === 'all' || selectedUids.has(u.uid)
            ? { ...u, totalScore: 0 }
            : u
        )
      );

      // Clear selection after reset
      setSelectedUids(new Set());
    } catch (err) {
      setResetError(
        err instanceof Error ? err.message : 'Gagal melakukan reset leaderboard.'
      );
      setResetState('error');
    }
  }, [mode, selectedUids]);

  // ── Dialog config ──────────────────────────────────────────────────────────

  const dialogDescription =
    mode === 'selected'
      ? `${selectedUids.size} pengguna yang dipilih akan memiliki totalScore direset ke 0. Tindakan ini tidak dapat dibatalkan.`
      : 'totalScore SEMUA pengguna akan diatur ke 0 dan leaderboard akan sepenuhnya kosong. Tindakan ini TIDAK DAPAT DIBATALKAN.';

  const allSelected =
    selectableUsers.length > 0 &&
    selectableUsers.every((u) => selectedUids.has(u.uid));
  const someSelected =
    selectedUids.size > 0 &&
    !selectableUsers.every((u) => selectedUids.has(u.uid));

  return (
    <div className="p-6 space-y-6">
      {/* Heading */}
      <div>
        <h1
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: 'var(--font-baloo2), system-ui, sans-serif' }}
        >
          Reset Leaderboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Reset skor pengguna tertentu atau seluruh leaderboard.
        </p>
      </div>

      {/* Initial load error */}
      {initialError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {initialError}
        </div>
      )}

      {/* Success banner */}
      {resetState === 'success' && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 flex items-center gap-3 text-sm text-green-700"
        >
          <span className="material-symbols-outlined text-[18px] text-green-600" aria-hidden="true">check_circle</span>
          <span>
            <strong>{successCount.toLocaleString('id-ID')}</strong> pengguna berhasil direset ke skor 0.
          </span>
        </div>
      )}

      {/* Error banner */}
      {resetState === 'error' && resetError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {resetError}
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-surface p-1 w-fit">
        {(
          [
            { key: 'selected', label: 'Reset Pengguna Tertentu' },
            { key: 'all', label: 'Reset Semua Leaderboard' },
          ] as { key: ResetMode; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setMode(key); setSelectedUids(new Set()); setResetState('idle'); }}
            disabled={isLoading}
            className={[
              'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-intblue',
              'disabled:cursor-not-allowed disabled:opacity-60',
              mode === key
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-500 hover:text-slate-800',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Selected mode ─────────────────────────────────────────────────── */}
      {mode === 'selected' && (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr>
                    <th scope="col" className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        disabled={isLoading || selectableUsers.length === 0}
                        aria-label="Pilih semua pengguna"
                        className="h-4 w-4 rounded border-slate-300 accent-intblue"
                      />
                    </th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Nama</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Sekolah</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold text-slate-600">Skor Saat Ini</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                        Belum ada pengguna terdaftar.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr
                        key={user.uid}
                        className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedUids.has(user.uid)}
                            onChange={() => toggleUser(user.uid)}
                            disabled={isLoading}
                            aria-label={`Pilih ${user.name}`}
                            className="h-4 w-4 rounded border-slate-300 accent-intblue"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{user.name || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{user.email || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{user.school || '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {user.totalScore.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {selectedUids.size} pengguna dipilih
            </p>
            <button
              onClick={handleResetClick}
              disabled={selectedUids.size === 0 || isLoading}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {isLoading && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              )}
              Reset Skor Terpilih
            </button>
          </div>
        </>
      )}

      {/* ── All mode ──────────────────────────────────────────────────────── */}
      {mode === 'all' && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-2xl text-red-500 mt-0.5 shrink-0" aria-hidden="true">
              warning
            </span>
            <div>
              <h2 className="font-semibold text-red-800 text-base">Peringatan: Tindakan Tidak Dapat Dibatalkan</h2>
              <p className="mt-1 text-sm text-red-700">
                Semua pengguna ({users.length.toLocaleString('id-ID')} akun) akan memiliki <code className="font-mono text-xs bg-red-100 px-1 py-0.5 rounded">totalScore</code> diatur ke 0. Leaderboard akan sepenuhnya kosong setelah tindakan ini. Tidak ada cara untuk memulihkan data yang direset.
              </p>
            </div>
          </div>
          <button
            onClick={handleResetClick}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {isLoading && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            )}
            Reset Semua Leaderboard
          </button>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 backdrop-blur-[1px]"
          aria-busy="true"
          aria-label="Sedang memproses reset…"
        >
          <div className="rounded-2xl bg-white shadow-xl px-8 py-6 flex items-center gap-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin text-intblue" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            <span className="text-sm font-medium text-slate-700">Sedang mereset leaderboard…</span>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={dialogOpen}
        title={mode === 'selected' ? 'Konfirmasi Reset Skor Terpilih' : 'Konfirmasi Reset Semua Leaderboard'}
        description={dialogDescription}
        confirmLabel={mode === 'selected' ? 'Ya, Reset Skor' : 'Ya, Reset Semua'}
        confirmVariant={mode === 'all' ? 'danger' : 'warning'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  );
}
