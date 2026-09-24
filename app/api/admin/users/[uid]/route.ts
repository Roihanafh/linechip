import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import {
  withAdminAuth,
  getAdminAuth,
  getAdminDb,
} from '@/features/auth/services/firebase.admin';
import { validateUid } from '@/lib/admin/utils';
import type { DecodedSessionClaims } from '@/features/auth/types';

/**
 * Extract and validate the `uid` segment from the request URL.
 * Returns the uid string on success, or a NextResponse (error) on failure.
 */
function extractUid(req: NextRequest): string | NextResponse {
  // pathname looks like /api/admin/users/<uid>
  const segments = req.nextUrl.pathname.split('/');
  const uid = segments[segments.length - 1];

  if (!uid || !validateUid(uid)) {
    return NextResponse.json(
      { error: 'uid tidak valid: wajib berupa string dengan panjang 1–128 karakter.' },
      { status: 400 }
    );
  }
  return uid;
}

// ---------------------------------------------------------------------------
// GET /api/admin/users/[uid]
// ---------------------------------------------------------------------------

export const GET = withAdminAuth(
  async (req: NextRequest, _claims: DecodedSessionClaims) => {
    const uidOrError = extractUid(req);
    if (uidOrError instanceof NextResponse) return uidOrError;
    const uid = uidOrError;

    const db = getAdminDb();
    const auth = getAdminAuth();

    try {
      const [docSnap, userRecord] = await Promise.all([
        db.collection('users').doc(uid).get(),
        auth.getUser(uid).catch(() => null),
      ]);

      if (!docSnap.exists || !userRecord) {
        return NextResponse.json(
          { error: 'Pengguna tidak ditemukan.' },
          { status: 404 }
        );
      }

      const data = docSnap.data()!;

      // Prefer Firebase Auth as source of truth for disabled flag
      const disabled = userRecord.disabled;

      const createdAt =
        data.createdAt?.toDate?.()?.toISOString() ??
        data.createdAt ??
        null;
      const updatedAt =
        data.updatedAt?.toDate?.()?.toISOString() ??
        data.updatedAt ??
        null;

      return NextResponse.json(
        {
          uid: data.uid ?? uid,
          name: data.name ?? '',
          email: data.email ?? userRecord.email ?? '',
          school: data.school ?? '',
          photoURL: data.photoURL ?? userRecord.photoURL ?? null,
          role: data.role ?? 'user',
          totalScore: data.totalScore ?? 0,
          disabled,
          createdAt,
          updatedAt,
        },
        { status: 200 }
      );
    } catch (err) {
      console.error('[GET /api/admin/users/[uid]]', err);
      return NextResponse.json(
        { error: 'Gagal memuat data pengguna.' },
        { status: 500 }
      );
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/[uid]  — disable or enable an account
// ---------------------------------------------------------------------------

export const PATCH = withAdminAuth(
  async (req: NextRequest, _claims: DecodedSessionClaims) => {
    const uidOrError = extractUid(req);
    if (uidOrError instanceof NextResponse) return uidOrError;
    const uid = uidOrError;

    // Parse and validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Body permintaan tidak valid.' },
        { status: 400 }
      );
    }

    const { action } = body as { action?: unknown };

    if (action !== 'disable' && action !== 'enable') {
      return NextResponse.json(
        { error: "action tidak valid: harus 'disable' atau 'enable'." },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const auth = getAdminAuth();

    try {
      // Check target role — reject modification of admin accounts
      const docSnap = await db.collection('users').doc(uid).get();

      if (!docSnap.exists) {
        return NextResponse.json(
          { error: 'Pengguna tidak ditemukan.' },
          { status: 404 }
        );
      }

      const targetRole = docSnap.data()?.role;
      if (targetRole === 'admin') {
        return NextResponse.json(
          { error: 'Akun admin tidak dapat dimodifikasi melalui panel ini.' },
          { status: 403 }
        );
      }

      const disabled = action === 'disable';

      // Update Firebase Auth first, then Firestore
      await auth.updateUser(uid, { disabled });
      await db
        .collection('users')
        .doc(uid)
        .update({ disabled, updatedAt: FieldValue.serverTimestamp() });

      return NextResponse.json({ ok: true, disabled }, { status: 200 });
    } catch (err) {
      console.error('[PATCH /api/admin/users/[uid]]', err);
      return NextResponse.json(
        { error: 'Gagal memperbarui status akun.' },
        { status: 500 }
      );
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/admin/users/[uid]
// ---------------------------------------------------------------------------

export const DELETE = withAdminAuth(
  async (req: NextRequest, _claims: DecodedSessionClaims) => {
    const uidOrError = extractUid(req);
    if (uidOrError instanceof NextResponse) return uidOrError;
    const uid = uidOrError;

    const db = getAdminDb();
    const auth = getAdminAuth();

    try {
      // Check target role — reject deletion of admin accounts
      const docSnap = await db.collection('users').doc(uid).get();

      if (!docSnap.exists) {
        // Still attempt to delete orphaned Auth record if Firestore doc is missing
        // but return 404 to communicate the Firestore state
        return NextResponse.json(
          { error: 'Pengguna tidak ditemukan.' },
          { status: 404 }
        );
      }

      const targetRole = docSnap.data()?.role;
      if (targetRole === 'admin') {
        return NextResponse.json(
          { error: 'Akun admin tidak dapat dimodifikasi melalui panel ini.' },
          { status: 403 }
        );
      }

      // Step 1: Delete from Firebase Auth
      await auth.deleteUser(uid);

      // Step 2: Delete Firestore document
      try {
        await db.collection('users').doc(uid).delete();
      } catch (firestoreErr) {
        console.error(
          '[DELETE /api/admin/users/[uid]] Firestore delete failed after Auth delete:',
          firestoreErr
        );
        return NextResponse.json(
          {
            error:
              'Akun telah dihapus dari autentikasi namun data profil gagal dihapus. Hubungi dukungan teknis.',
            partial: true,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    } catch (err) {
      console.error('[DELETE /api/admin/users/[uid]]', err);
      return NextResponse.json(
        { error: 'Gagal menghapus akun pengguna.' },
        { status: 500 }
      );
    }
  }
);
