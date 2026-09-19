'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { useProfile } from '@/features/profile';
import { resolveDisplayScore } from '@/lib/game/chipHelpers';
import { formatDate } from '@/features/profile/utils/dateUtils';
import { getProviderLabel } from '@/features/profile/utils/providerUtils';
import Avatar from '@/components/profile/Avatar';
import AvatarUploadOverlay from '@/components/profile/AvatarUploadOverlay';
import ProfileSkeleton from '@/components/profile/ProfileSkeleton';
import { Toast, FloatingInput } from '@/components/auth/AuthShared';

export function ProfileClient() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const {
    profile,
    authProvider,
    isEditing,
    editValues,
    editErrors,
    saveStatus,
    uploadStatus,
    uploadProgress,
    resetPasswordStatus,
    startEdit,
    cancelEdit,
    setEditField,
    handleSave,
    handlePhotoSelect,
    handleResetPassword,
    toast,
    clearToast,
  } = useProfile();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Auth guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/profile');
    }
  }, [loading, user, router]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return <ProfileSkeleton />;
  }

  // ── Error state: user authenticated but profile missing ──────────────────
  if (!loading && user && !profile) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-8 flex flex-col items-center gap-5 text-center rise-in">
          <div className="w-14 h-14 rounded-full bg-[#fff1f2] border border-[#fecdd3] flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px] text-[#f43f5e]" aria-hidden="true">
              error_outline
            </span>
          </div>
          <div>
            <h2 className="font-semibold text-[18px] text-[#0f172a] mb-2">
              Profil Tidak Dapat Dimuat
            </h2>
            <p className="text-[14px] text-[#64748b] leading-relaxed">
              Terjadi kesalahan saat memuat data profil Anda. Silakan coba muat ulang halaman.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-[15px] py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] shadow-[0_4px_14px_rgba(37,99,235,0.3)]"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">refresh</span>
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  // ── Guard: shouldn't reach here without profile, but TS needs this ───────
  if (!profile) return null;

  const isSaving = saveStatus === 'loading';
  const isUploading = uploadStatus === 'loading';

  return (
    <div className="min-h-screen bg-[#f8fafc] py-10 px-4">
      {/* Toast notifications */}
      {toast && (
        <Toast type={toast.type} msg={toast.message} onDismiss={clearToast} />
      )}

      <div className="max-w-lg mx-auto space-y-4">

        {/* ── Page heading ─────────────────────────────────────────────── */}
        <div
          className="rise-in mb-2"
          style={{ '--d': '0s' } as React.CSSProperties}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-[#2563eb] rounded-lg w-8 h-8 flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(37,99,235,0.3)]">
              <span className="material-symbols-outlined text-white text-[16px]" aria-hidden="true">
                manage_accounts
              </span>
            </div>
            <span className="font-mono font-bold text-[11px] tracking-[1.1px] text-[#2563eb] uppercase">
              LINECHIP ID
            </span>
          </div>
          <h1 className="font-semibold text-[26px] tracking-[-0.6px] text-[#0f172a]">
            Profil Saya
          </h1>
        </div>

        {/* ── Profile Header Card ──────────────────────────────────────── */}
        <div
          className="rise-in bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-8 flex flex-col items-center gap-4"
          style={{ '--d': '0.06s' } as React.CSSProperties}
        >
          {/* Avatar with upload overlay */}
          <div className="relative">
            <div
              role="button"
              tabIndex={0}
              aria-label="Ubah foto profil"
              className="relative cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2"
              onClick={() => {
                if (!isUploading) fileInputRef.current?.click();
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !isUploading) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <Avatar
                photoURL={profile.photoURL}
                name={profile.name}
                size="lg"
              />
              <AvatarUploadOverlay
                progress={uploadProgress}
                isUploading={isUploading}
              />
              {/* Camera badge */}
              {!isUploading && (
                <div
                  className="absolute bottom-0 right-0 w-7 h-7 bg-[#2563eb] rounded-full border-2 border-white flex items-center justify-center shadow-sm"
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined text-white text-[14px]">
                    photo_camera
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            aria-label="Pilih foto profil"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handlePhotoSelect(file);
                // Reset so same file can be re-selected
                e.target.value = '';
              }
            }}
          />

          {/* Name */}
          <div className="text-center">
            <h2 className="font-bold text-[22px] tracking-[-0.4px] text-[#0f172a]">
              {profile.name}
            </h2>
            {/* Auth provider badge */}
            <span className="inline-flex items-center gap-1.5 mt-2 bg-[#eff6ff] border border-[#bfdbfe] text-[#2563eb] text-[12px] font-mono font-semibold tracking-[0.4px] rounded-full px-3 py-1">
              <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
                {authProvider === 'google.com' ? 'g_mobiledata' : 'mail'}
              </span>
              {getProviderLabel(authProvider)}
            </span>
          </div>
        </div>

        {/* ── Info Section ─────────────────────────────────────────────── */}
        <div
          className="rise-in bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-1"
          style={{ '--d': '0.12s' } as React.CSSProperties}
        >
          <h3 className="font-semibold text-[13px] tracking-[0.5px] text-[#94a3b8] uppercase font-mono mb-3">
            Informasi Akun
          </h3>

          {/* Email */}
          <div className="flex items-center gap-3 py-2.5 border-b border-[#f1f5f9]">
            <span
              className="material-symbols-outlined text-[18px] text-[#94a3b8] shrink-0"
              aria-hidden="true"
            >
              mail
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-[#94a3b8] font-mono uppercase tracking-[0.4px] mb-0.5">
                Email
              </p>
              <p className="text-[14px] text-[#334155] truncate" aria-label={`Email: ${profile.email}`}>
                {profile.email}
              </p>
            </div>
          </div>

          {/* School */}
          <div className="flex items-center gap-3 py-2.5 border-b border-[#f1f5f9]">
            <span
              className="material-symbols-outlined text-[18px] text-[#94a3b8] shrink-0"
              aria-hidden="true"
            >
              school
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-[#94a3b8] font-mono uppercase tracking-[0.4px] mb-0.5">
                Kelas &amp; Sekolah
              </p>
              {profile.school ? (
                <p
                  className="text-[14px] text-[#334155] truncate"
                  aria-label={`Sekolah: ${profile.school}`}
                >
                  {profile.school}
                </p>
              ) : (
                <p className="text-[14px] text-[#94a3b8] italic">
                  Belum diisi —{' '}
                  <button
                    type="button"
                    onClick={startEdit}
                    className="text-[#2563eb] hover:text-[#1d4ed8] not-italic underline underline-offset-2 decoration-[#bfdbfe] transition-colors"
                    aria-label="Lengkapi informasi sekolah"
                  >
                    Lengkapi sekarang
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Joined date */}
          <div className="flex items-center gap-3 py-2.5 border-b border-[#f1f5f9]">
            <span
              className="material-symbols-outlined text-[18px] text-[#94a3b8] shrink-0"
              aria-hidden="true"
            >
              calendar_today
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-[#94a3b8] font-mono uppercase tracking-[0.4px] mb-0.5">
                Bergabung
              </p>
              <p className="text-[14px] text-[#334155]">
                {formatDate(profile.createdAt)}
              </p>
            </div>
          </div>

          {/* Total score */}
          <div className="flex items-center gap-3 py-2.5">
            <span
              className="material-symbols-outlined text-[18px] text-[#94a3b8] shrink-0"
              aria-hidden="true"
            >
              emoji_events
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-[#94a3b8] font-mono uppercase tracking-[0.4px] mb-0.5">
                Total Poin
              </p>
              <p
                className="text-[14px] text-[#334155]"
                aria-label={`Total poin: ${resolveDisplayScore(profile.totalScore).toLocaleString('id-ID')}`}
              >
                {resolveDisplayScore(profile.totalScore).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>

        {/* ── Edit Profile Section ─────────────────────────────────────── */}
        {!isEditing ? (
          <div
            className="rise-in"
            style={{ '--d': '0.18s' } as React.CSSProperties}
          >
            <button
              type="button"
              onClick={startEdit}
              aria-label="Edit nama dan sekolah"
              className="w-full bg-white border border-[#e2e8f0] hover:border-[#2563eb] hover:bg-[#eff6ff] text-[#334155] hover:text-[#1d4ed8] font-semibold text-[14px] py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm group"
            >
              <span
                className="material-symbols-outlined text-[18px] text-[#94a3b8] group-hover:text-[#2563eb] transition-colors"
                aria-hidden="true"
              >
                edit
              </span>
              Edit Profil
            </button>
          </div>
        ) : (
          <div
            className="rise-in bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6"
            style={{ '--d': '0.18s' } as React.CSSProperties}
          >
            <h3 className="font-semibold text-[13px] tracking-[0.5px] text-[#94a3b8] uppercase font-mono mb-4">
              Edit Profil
            </h3>

            <div className="space-y-4">
              {/* Name field */}
              <div>
                <FloatingInput
                  id="profile-name"
                  label="Nama Lengkap"
                  type="text"
                  placeholder="Nama lengkap Anda"
                  value={editValues.name}
                  onChange={(v) => setEditField('name', v)}
                  icon={
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      person
                    </span>
                  }
                  error={editErrors.name}
                  valid={editValues.name.trim().length > 0 && !editErrors.name}
                  autoComplete="name"
                />
                {/* aria-describedby hint — screen readers pick up FloatingInput's error paragraph via role="alert" */}
              </div>

              {/* School field */}
              <div>
                <FloatingInput
                  id="profile-school"
                  label="Kelas &amp; Sekolah"
                  type="text"
                  placeholder="Mis. Kelas 7 / SMPN 1 Jakarta"
                  value={editValues.school}
                  onChange={(v) => setEditField('school', v)}
                  icon={
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      school
                    </span>
                  }
                  error={editErrors.school}
                  valid={editValues.school.trim().length > 0 && !editErrors.school}
                  autoComplete="organization"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={isSaving}
                  aria-label="Batalkan pengeditan profil"
                  className="flex-1 bg-white border border-[#e2e8f0] hover:border-[#cbd5e1] text-[#475569] font-semibold text-[14px] py-3 rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  aria-label="Simpan perubahan profil"
                  className="flex-[2] bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#93c5fd] disabled:cursor-not-allowed text-white font-semibold text-[14px] py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] shadow-[0_4px_14px_rgba(37,99,235,0.25)]"
                >
                  {isSaving ? (
                    <>
                      <svg
                        className="animate-spin w-4 h-4 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="white"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="white"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        save
                      </span>
                      Simpan Perubahan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Account Security Section ─────────────────────────────────── */}
        <div
          className="rise-in bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6"
          style={{ '--d': '0.24s' } as React.CSSProperties}
        >
          <h3 className="font-semibold text-[13px] tracking-[0.5px] text-[#94a3b8] uppercase font-mono mb-4">
            Keamanan Akun
          </h3>

          {authProvider === 'password' ? (
            <div className="space-y-3">
              <p className="text-[14px] text-[#64748b] leading-relaxed">
                Kirim email instruksi untuk mengubah kata sandi ke{' '}
                <span className="font-semibold text-[#334155]">{profile.email}</span>.
              </p>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetPasswordStatus === 'loading'}
                aria-label="Kirim email reset kata sandi"
                className="w-full bg-white border border-[#e2e8f0] hover:border-[#2563eb] hover:bg-[#eff6ff] text-[#334155] hover:text-[#1d4ed8] font-semibold text-[14px] py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {resetPasswordStatus === 'loading' ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4 shrink-0 text-[#94a3b8]"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span>Mengirim Email...</span>
                  </>
                ) : (
                  <>
                    <span
                      className="material-symbols-outlined text-[18px] text-[#94a3b8] group-hover:text-[#2563eb] transition-colors"
                      aria-hidden="true"
                    >
                      lock_reset
                    </span>
                    Ubah / Reset Kata Sandi
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Google User — no password management */
            <div className="flex items-start gap-3 p-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
              {/* Google logo */}
              <div className="shrink-0 mt-0.5">
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2v6h7.8c4.5-4.2 7.1-10.3 7.1-17.2z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.8-6c-2.1 1.4-4.8 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.7H2.8v6.2C6.6 42.6 14.7 48 24 48z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.8 28.8c-.5-1.4-.8-2.8-.8-4.3s.3-3 .8-4.3v-6.2H2.8C1 17.4 0 20.6 0 24s1 6.6 2.8 9.1l8-6.3z"
                  />
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.7-6.7C35.9 2.5 30.4 0 24 0 14.7 0 6.6 5.4 2.8 14.2l8 6.2C12.7 14 17.9 9.5 24 9.5z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#334155] mb-1">
                  Masuk via Google
                </p>
                <p className="text-[13px] text-[#64748b] leading-relaxed">
                  Kata sandi Anda dikelola oleh Google Account. Untuk mengubahnya, kunjungi{' '}
                  <a
                    href="https://myaccount.google.com/security"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2563eb] hover:text-[#1d4ed8] underline underline-offset-2 decoration-[#bfdbfe] transition-colors"
                    aria-label="Buka pengaturan keamanan Google Account (tab baru)"
                  >
                    Google Account
                  </a>
                  .
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer spacer ────────────────────────────────────────────── */}
        <div className="pb-6" />
      </div>
    </div>
  );
}
