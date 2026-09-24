import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  withAdminAuth,
  getAdminDb,
} from '@/features/auth/services/firebase.admin';
import type { DecodedSessionClaims } from '@/features/auth/types';


interface AdminTop10Entry {
  uid: string;
  name: string;
  school: string;
  totalScore: number;
}

interface AdminStatsResponse {
  totalUsers: number;
  activeUsers: number;
  topScore: number;
  disabledAccounts: number;
  top10: AdminTop10Entry[];
}

export const GET = withAdminAuth(
  async (_req: NextRequest, _claims: DecodedSessionClaims): Promise<NextResponse> => {
    try {
      const db = getAdminDb();
      const usersCol = db.collection('users');

      // Run 4 count queries in parallel
      const [totalSnap, activeSnap, disabledSnap, topScoreSnap] = await Promise.all([
        usersCol.count().get(),
        usersCol.where('totalScore', '>', 0).count().get(),
        usersCol.where('disabled', '==', true).count().get(),
        usersCol.orderBy('totalScore', 'desc').limit(1).get(),
      ]);

      const totalUsers = totalSnap.data().count;
      const activeUsers = activeSnap.data().count;
      const disabledAccounts = disabledSnap.data().count;
      const topScore =
        !topScoreSnap.empty
          ? (topScoreSnap.docs[0].data().totalScore as number) ?? 0
          : 0;

      // Fetch top 10 entries with totalScore > 0, ordered descending
      const top10Snap = await usersCol
        .where('totalScore', '>', 0)
        .orderBy('totalScore', 'desc')
        .limit(10)
        .get();

      const top10: AdminTop10Entry[] = top10Snap.docs.map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          name: (data.name as string) ?? '',
          school: (data.school as string) ?? '',
          totalScore: (data.totalScore as number) ?? 0,
        };
      });

      const responseBody: AdminStatsResponse = {
        totalUsers,
        activeUsers,
        topScore,
        disabledAccounts,
        top10,
      };

      return NextResponse.json(responseBody, { status: 200 });
    } catch (err) {
      console.error('[/api/admin/stats] Error:', err);
      return NextResponse.json(
        { error: 'Gagal mengambil data statistik.' },
        { status: 500 }
      );
    }
  }
);
