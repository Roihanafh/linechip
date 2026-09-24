import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  withAdminAuth,
  getAdminDb,
} from '@/features/auth/services/firebase.admin';
import type { DecodedSessionClaims } from '@/features/auth/types';

const MAX_UIDS_PER_REQUEST = 500;
const BATCH_CHUNK_SIZE = 500;

interface LeaderboardResetRequest {
  mode: 'selected' | 'all';
  uids?: string[];
}

/**
 * Splits an array into chunks of at most `size` elements.
 */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export const POST = withAdminAuth(
  async (req: NextRequest, _claims: DecodedSessionClaims): Promise<NextResponse> => {
    // Parse and validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Request body tidak valid atau bukan JSON.' },
        { status: 400 }
      );
    }

    const parsed = body as LeaderboardResetRequest;

    // Validate mode
    if (parsed.mode !== 'selected' && parsed.mode !== 'all') {
      return NextResponse.json(
        { error: 'Field "mode" harus berupa "selected" atau "all".' },
        { status: 400 }
      );
    }

    // Validate uids for selected mode
    if (parsed.mode === 'selected') {
      if (!parsed.uids || !Array.isArray(parsed.uids)) {
        return NextResponse.json(
          { error: 'uids wajib disertakan untuk mode selected.' },
          { status: 400 }
        );
      }
      if (parsed.uids.length === 0) {
        return NextResponse.json(
          { error: 'uids tidak boleh kosong untuk mode selected.' },
          { status: 400 }
        );
      }
      if (parsed.uids.length > MAX_UIDS_PER_REQUEST) {
        return NextResponse.json(
          { error: `Maksimal ${MAX_UIDS_PER_REQUEST} uid diperbolehkan per permintaan.` },
          { status: 400 }
        );
      }
      // Validate each uid: non-empty string, length 1–128
      for (const uid of parsed.uids) {
        if (typeof uid !== 'string' || uid.length < 1 || uid.length > 128) {
          return NextResponse.json(
            { error: 'Setiap uid harus berupa string non-kosong dengan panjang 1–128 karakter.' },
            { status: 400 }
          );
        }
      }
    }

    try {
      const db = getAdminDb();
      const usersCol = db.collection('users');

      let targetUids: string[];

      if (parsed.mode === 'all') {
        // Fetch all user document IDs
        const snapshot = await usersCol.select().get(); // select() with no args = only doc IDs (no field data)
        targetUids = snapshot.docs.map((doc) => doc.id);
      } else {
        // mode === 'selected' — use the provided uids directly
        targetUids = parsed.uids!;
      }

      if (targetUids.length === 0) {
        return NextResponse.json({ ok: true, updatedCount: 0 }, { status: 200 });
      }

      // Split into chunks of 500 and commit each batch
      const chunks = chunkArray(targetUids, BATCH_CHUNK_SIZE);

      for (const chunk of chunks) {
        const batch = db.batch();
        for (const uid of chunk) {
          const ref = usersCol.doc(uid);
          batch.update(ref, { totalScore: 0 });
        }
        await batch.commit();
      }

      return NextResponse.json(
        { ok: true, updatedCount: targetUids.length },
        { status: 200 }
      );
    } catch (err) {
      console.error('[/api/admin/leaderboard/reset] Error:', err);
      return NextResponse.json(
        { error: 'Gagal melakukan reset leaderboard. Tidak ada perubahan yang tersimpan.' },
        { status: 500 }
      );
    }
  }
);
