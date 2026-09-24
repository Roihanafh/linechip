import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  withAdminAuth,
  getAdminAuth,
  getAdminDb,
} from '@/features/auth/services/firebase.admin';
import type { DecodedSessionClaims } from '@/features/auth/types';
import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { validateCreateUserInput, sanitizeInput } from '@/lib/admin/utils';
import type { CreateUserInput } from '@/lib/admin/utils';

/** Shape returned per-row in the admin users list */
export interface AdminUserRow {
  uid: string;
  name: string;
  email: string;
  school: string;
  totalScore: number;
  disabled: boolean;
  createdAt: string; // ISO 8601
}

/** Response body for GET /api/admin/users */
export interface AdminUsersResponse {
  users: AdminUserRow[];
  nextCursor: string | null;
}

const PAGE_SIZE = 20;

/**
 * Maps a Firestore Admin SDK document snapshot to an AdminUserRow.
 * Timestamps are converted to ISO strings; missing fields get safe defaults.
 */
function docToRow(docSnap: QueryDocumentSnapshot): AdminUserRow {
  const d = docSnap.data();
  return {
    uid: typeof d['uid'] === 'string' ? d['uid'] : docSnap.id,
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
}

export const GET = withAdminAuth(
  async (req: NextRequest, _claims: DecodedSessionClaims) => {
    const { searchParams } = req.nextUrl;

    // --- Parse query params ---
    const limitParam = searchParams.get('limit') ?? String(PAGE_SIZE);
    const cursorParam = searchParams.get('cursor') ?? null; // Firestore doc ID
    const searchParam = searchParams.get('search') ?? null;

    // 'all' = no pagination (used by leaderboard-reset page).
    const fetchAll = limitParam === 'all';
    const pageSize = fetchAll
      ? null
      : Math.min(parseInt(limitParam, 10) || PAGE_SIZE, PAGE_SIZE);

    const db: Firestore = getAdminDb();

    try {
      // Build the base query ordered by createdAt descending for stable ordering.
      let q: FirebaseFirestore.Query = db
        .collection('users')
        .orderBy('createdAt', 'desc');

      // Apply cursor if provided.
      if (cursorParam) {
        const cursorDocSnap = await db.collection('users').doc(cursorParam).get();
        if (cursorDocSnap.exists) {
          q = q.startAfter(cursorDocSnap);
        }
      }

      // Fetch one extra document to cheaply detect whether a next page exists.
      if (pageSize !== null) {
        q = q.limit(pageSize + 1);
      }

      const snapshot = await q.get();
      const allDocs = snapshot.docs;

      let hasNextPage = false;
      let rowDocs = allDocs;

      if (pageSize !== null && allDocs.length > pageSize) {
        hasNextPage = true;
        rowDocs = allDocs.slice(0, pageSize);
      }

      let rows: AdminUserRow[] = rowDocs.map(docToRow);

      // --- Optional search filter (case-insensitive match on name or email) ---
      // Design note: Firestore Admin SDK doesn't support full-text search, so
      // filtering is done here in memory.  The client enforces a minimum of 2
      // characters; we mirror that guard here.
      if (searchParam && searchParam.length >= 2) {
        const qLower = searchParam.toLowerCase();
        rows = rows.filter(
          (u) =>
            u.name.toLowerCase().includes(qLower) ||
            u.email.toLowerCase().includes(qLower)
        );
        // A search across a single page is not cursor-paginated.
        hasNextPage = false;
      }

      const nextCursor =
        hasNextPage && rowDocs.length > 0
          ? rowDocs[rowDocs.length - 1].id
          : null;

      const response: AdminUsersResponse = {
        users: rows,
        nextCursor,
      };

      return NextResponse.json(response, { status: 200 });
    } catch (err) {
      console.error('[GET /api/admin/users] Error:', err);
      return NextResponse.json(
        { error: 'Gagal mengambil data pengguna.' },
        { status: 500 }
      );
    }
  }
);

export const POST = withAdminAuth(
  async (req: NextRequest, claims: DecodedSessionClaims) => {
    // Parse request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 });
    }

    // Validate input
    const input = body as CreateUserInput;
    const validation = validateCreateUserInput(input);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0] ?? 'Input tidak valid.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    // Sanitize name and school
    const name = sanitizeInput(input.name);
    const school = sanitizeInput(input.school);
    const { email, password } = input;

    // Create Firebase Auth user
    let uid: string;
    try {
      const userRecord = await getAdminAuth().createUser({
        email,
        password,
        displayName: name,
      });
      uid = userRecord.uid;
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      console.error(
        `[POST /api/admin/users] Admin ${claims.uid} failed to create user: ${code}`
      );
      if (code === 'auth/email-already-in-use') {
        return NextResponse.json({ error: 'Email sudah digunakan.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Gagal membuat akun.' }, { status: 500 });
    }

    // Set custom claims — best-effort, continue even if it fails
    try {
      await getAdminAuth().setCustomUserClaims(uid, { role: 'user' });
    } catch {
      /* ignore */
    }

    // Write Firestore document
    try {
      await getAdminDb().collection('users').doc(uid).set({
        uid,
        name,
        email,
        school,
        role: 'user',
        totalScore: 0,
        disabled: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error(
        `[POST /api/admin/users] Admin ${claims.uid} failed to create user: Firestore set failed`
      );
      // Rollback Auth user — best-effort
      try {
        await getAdminAuth().deleteUser(uid);
      } catch {
        /* rollback best-effort */
      }
      return NextResponse.json({ error: 'Gagal menyimpan data pengguna.' }, { status: 500 });
    }

    console.log(
      `[POST /api/admin/users] Admin ${claims.uid} created user ${uid} with email ${email}`
    );
    return NextResponse.json({ ok: true, uid, email }, { status: 201 });
  }
);
