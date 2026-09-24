'use client';
// components/admin/UserDetailClient.tsx
// Client Component: displays user profile and handles disable/enable/delete actions.

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';
import type { AdminUserDetail } from '@/app/admin/users/[uid]/page';

interface UserDetailClientProps {
  profile: AdminUserDetail;
  isDisabled: boolean;
}

type ActionType = 'disable' | 'enable' | 'delete';
type ActionState = 'idle' | 'loading' | 'error';

function formatDate(iso: string | null, includeTime = false): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  if (!includeTime) return `${day}/${month}/${year}`;
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

const TIMEOUT_MS = 5000;

export default function UserDetailClient({
  profile,
  isDisabled: initialDisabled,
}: UserDetailClientProps) {
  const router = useRouter();

  const [disabled, setDisabled] = useState(initialDisabled);
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null);
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [actionError, setActionError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isAdmin = profile.role === 'admin';
  const isLoading = actionState === 'loading';

  const openDialog = useCallback((action: ActionType) => {
    setPendingAction(action);
    setActionError(null);
    setDialogOpen(true);
  }, []);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    setPendingAction(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!pendingAction) return;

    setDialogOpen(false);
    setActionState('loading');
    setActionError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      if (pendingAction === 'disable' || pendingAction === 'enable') {
        const res = await fetch(`/api/admin/users/${profile.uid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: pendingAction }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ?? 'Gagal memperbarui status akun.'
          );
        }

        const data = await res.json() as { ok: boolean; disabled: boolean };
        setDisabled(data.disabled);
        setActionState('idle');
      } else if (pendingAction === 'delete') {
        const res = await fetch(`/api/admin/users/${profile.uid}`, {
          method: 'DELETE',
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const partial = (body as { partial?: boolean }).partial;
          const msg =
            partial
              ? 'Akun telah dihapus dari autentikasi namun data profil gagal dihapus. Hubungi dukungan teknis.'
              : ((body as { error?: string }).error ?? 'Gagal menghapus akun.');
          throw new Error(msg);
        }

        setActionState('idle');
        router.push('/admin/users');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setActionError('Permintaan melebihi batas waktu. Coba lagi.');
      } else {
        setActionError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
      }
      setActionState('error');
    } finally {
      clearTimeout(timeoutId);
    }
  }, [pendingAction, profile.uid, router]);

  // Dialog config per action
  const dialogConfig: Record<
    ActionType,
    { title: string; description: string; confirmLabel: string; confirmVariant: 'danger' | 'warning' }
  > = {
    disable: {
      title: 'Nonaktifkan Akun',
      description: `Apakah Anda yakin ingin menonaktifkan akun "${profile.name}"? Pengguna tidak akan dapat login hingga akun diaktifkan kembali.`,
      confirmLabel: 'Nonaktifkan',
      confirmVariant: 'warning',
    },
    enable: {
      title: 'Aktifkan Akun',
      description: `Apakah Anda yakin ingin mengaktifkan kembali akun "${profile.name}"? Pengguna akan dapat login kembali.`,
      confirmLabel: 'Aktifkan',
      confirmVariant: 'warning',
    },
    delete: {
      title: 'Hapus Pengguna',
      description: `Tindakan ini TIDAK DAPAT DIBATALKAN. Seluruh data pengguna "${profile.name}" akan dihapus permanen dari Firebase Auth dan Firestore.`,
      confirmLabel: 'Hapus Permanen',
      confirmVariant: 'danger',
    },
  };

  const activeConfig = pendingAction ? dialogConfig[pendingAction] : null;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Back link */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
        Kembali ke Daftar Pengguna
      </Link>

      {/* Profile card */}
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-border">
          {/* Avatar */}
          <div className="shrink-0 h-16 w-16 rounded-full overflow-hidden bg-slate-100 border border-border">
            {profile.photoURL ? (
              <Image
                src={profile.photoURL}
                alt={`Foto profil ${profile.name}`}
                width={64}
                height={64}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-slate-400" aria-hidden="true">
                  person
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="text-xl font-bold text-slate-900 truncate"
              style={{ fontFamily: 'var(--font-baloo2), system-ui, sans-serif' }}
            >
              {profile.name || '—'}
            </h1>
            <p className="text-sm text-slate-500 truncate">{profile.email || '—'}</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  disabled
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {disabled ? 'Nonaktif' : 'Aktif'}
              </span>
              {isAdmin && (
                <span className="inline-flex items-center rounded-full bg-intblue-light text-intblue px-2.5 py-0.5 text-xs font-medium">
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <dl className="divide-y divide-slate-100">
          {(
            [
              ['Sekolah', profile.school || '—'],
              ['Peran', profile.role === 'admin' ? 'Admin' : 'Pengguna'],
              ['Total Skor', profile.totalScore.toLocaleString('id-ID')],
              ['Tanggal Dibuat', formatDate(profile.createdAt, true)],
              ['Terakhir Diperbarui', formatDate(profile.updatedAt, true)],
              ['UID', profile.uid],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-4 px-6 py-3">
              <dt className="w-36 shrink-0 text-sm font-medium text-slate-500">{label}</dt>
              <dd className="flex-1 text-sm text-slate-800 break-all">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Error banner */}
      {actionState === 'error' && actionError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      {/* Action buttons */}
      {!isAdmin && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Disable / Enable */}
          {!disabled ? (
            <button
              onClick={() => openDialog('disable')}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {isLoading && pendingAction === 'disable' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              )}
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">block</span>
              Nonaktifkan Akun
            </button>
          ) : (
            <button
              onClick={() => openDialog('enable')}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-xl border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
            >
              {isLoading && pendingAction === 'enable' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              )}
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">check_circle</span>
              Aktifkan Akun
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => openDialog('delete')}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            {isLoading && pendingAction === 'delete' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            )}
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>
            Hapus Pengguna
          </button>
        </div>
      )}

      {isAdmin && (
        <p className="text-sm text-slate-400 italic">
          Akun admin tidak dapat dimodifikasi melalui panel ini.
        </p>
      )}

      {/* Confirmation Dialog */}
      {activeConfig && (
        <ConfirmationDialog
          isOpen={dialogOpen}
          title={activeConfig.title}
          description={activeConfig.description}
          confirmLabel={activeConfig.confirmLabel}
          confirmVariant={activeConfig.confirmVariant}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
