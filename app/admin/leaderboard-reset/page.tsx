// app/admin/leaderboard-reset/page.tsx
// Server Component: fetch all users via Admin SDK and pass to LeaderboardResetClient.
import { getAdminDb } from '@/features/auth/services/firebase.admin';
import LeaderboardResetClient from '@/components/admin/LeaderboardResetClient';
import type { AdminUserRow } from '@/lib/admin/utils';

export default async function LeaderboardResetPage() {
  let users: AdminUserRow[] = [];
  let initialError: string | null = null;

  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection('users')
      .orderBy('createdAt', 'desc')
      .get();

    users = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        uid: typeof d['uid'] === 'string' ? d['uid'] : doc.id,
        name: typeof d['name'] === 'string' ? d['name'] : '',
        email: typeof d['email'] === 'string' ? d['email'] : '',
        school: typeof d['school'] === 'string' ? d['school'] : '',
        totalScore: typeof d['totalScore'] === 'number' ? d['totalScore'] : 0,
        disabled: typeof d['disabled'] === 'boolean' ? d['disabled'] : false,
        createdAt:
          d['createdAt'] != null && typeof d['createdAt'].toDate === 'function'
            ? (d['createdAt'].toDate() as Date).toISOString()
            : '',
      };
    });
  } catch (err) {
    console.error('[LeaderboardResetPage] Error:', err);
    initialError = 'Gagal memuat data pengguna.';
  }

  return <LeaderboardResetClient users={users} initialError={initialError} />;
}
