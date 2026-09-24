// app/admin/users/[uid]/page.tsx
// Server Component: fetch user detail from Admin SDK; pass to UserDetailClient.
import { getAdminAuth, getAdminDb } from '@/features/auth/services/firebase.admin';
import Link from 'next/link';
import UserDetailClient from '@/components/admin/UserDetailClient';

export interface AdminUserDetail {
  uid: string;
  name: string;
  email: string;
  school: string;
  photoURL: string | null;
  role: 'user' | 'admin';
  totalScore: number;
  disabled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;

  let profile: AdminUserDetail | null = null;
  let notFound = false;

  try {
    const db = getAdminDb();
    const auth = getAdminAuth();

    const [docSnap, userRecord] = await Promise.all([
      db.collection('users').doc(uid).get(),
      auth.getUser(uid).catch(() => null),
    ]);

    if (!docSnap.exists || !userRecord) {
      notFound = true;
    } else {
      const d = docSnap.data()!;
      profile = {
        uid: d['uid'] ?? uid,
        name: d['name'] ?? '',
        email: d['email'] ?? userRecord.email ?? '',
        school: d['school'] ?? '',
        photoURL: d['photoURL'] ?? userRecord.photoURL ?? null,
        role: d['role'] ?? 'user',
        totalScore: d['totalScore'] ?? 0,
        disabled: userRecord.disabled,
        createdAt:
          d['createdAt'] != null && typeof d['createdAt'].toDate === 'function'
            ? (d['createdAt'].toDate() as Date).toISOString()
            : null,
        updatedAt:
          d['updatedAt'] != null && typeof d['updatedAt'].toDate === 'function'
            ? (d['updatedAt'].toDate() as Date).toISOString()
            : null,
      };
    }
  } catch (err) {
    console.error('[UserDetailPage] Error:', err);
    notFound = true;
  }

  if (notFound || !profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
        <span className="material-symbols-outlined text-5xl text-slate-300" aria-hidden="true">
          person_off
        </span>
        <h1 className="text-xl font-semibold text-slate-700">Pengguna tidak ditemukan</h1>
        <p className="text-sm text-slate-500">
          Pengguna dengan ID <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">{uid}</code> tidak ada atau telah dihapus.
        </p>
        <Link
          href="/admin/users"
          className="mt-2 rounded-xl bg-intblue px-5 py-2 text-sm font-semibold text-white hover:bg-intblue/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-intblue"
        >
          Kembali ke Daftar Pengguna
        </Link>
      </div>
    );
  }

  return <UserDetailClient profile={profile} isDisabled={profile.disabled} />;
}
