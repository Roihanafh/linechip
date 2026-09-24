// app/admin/users/page.tsx
// Server Component: fetches first page of users via Admin SDK and passes to UsersClient.
import { getAdminDb } from '@/features/auth/services/firebase.admin';
import UsersClient from '@/components/admin/UsersClient';
import type { AdminUserRow } from '@/lib/admin/utils';

export interface PaginatedUsersResponse {
  users: AdminUserRow[];
  nextCursor: string | null;
}

const PAGE_SIZE = 20;

export default async function AdminUsersPage() {
  let initialData: PaginatedUsersResponse = { users: [], nextCursor: null };
  let initialError: string | null = null;

  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection('users')
      .orderBy('createdAt', 'desc')
      .limit(PAGE_SIZE + 1)
      .get();

    const allDocs = snapshot.docs;
    const hasNext = allDocs.length > PAGE_SIZE;
    const rowDocs = hasNext ? allDocs.slice(0, PAGE_SIZE) : allDocs;

    const users: AdminUserRow[] = rowDocs.map((doc) => {
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

    const nextCursor =
      hasNext && rowDocs.length > 0 ? rowDocs[rowDocs.length - 1].id : null;

    initialData = { users, nextCursor };
  } catch (err) {
    console.error('[AdminUsersPage] Error:', err);
    initialError = 'Gagal memuat data pengguna.';
  }

  return <UsersClient initialData={initialData} initialError={initialError} />;
}
