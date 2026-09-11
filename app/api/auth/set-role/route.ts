import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  withAdminAuth,
  getAdminAuth,
  getAdminDb,
} from '@/features/auth/services/firebase.admin';
import type { DecodedSessionClaims } from '@/features/auth/types';

const VALID_ROLES = ['user', 'admin'] as const;
type ValidRole = (typeof VALID_ROLES)[number];

export const POST = withAdminAuth(
  async (req: NextRequest, _claims: DecodedSessionClaims) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Parameter tidak valid: uid dan role wajib ada.' },
        { status: 400 }
      );
    }

    const { uid, role } = body as { uid?: string; role?: string };

    if (!uid || typeof uid !== 'string' || uid.trim() === '') {
      return NextResponse.json(
        { error: 'Parameter tidak valid: uid dan role wajib ada.' },
        { status: 400 }
      );
    }

    if (!role || !VALID_ROLES.includes(role as ValidRole)) {
      return NextResponse.json(
        { error: 'Parameter tidak valid: role harus "user" atau "admin".' },
        { status: 400 }
      );
    }

    const validRole = role as ValidRole;
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    try {
      // Set custom claims on Firebase Auth
      await adminAuth.setCustomUserClaims(uid, { role: validRole });

      // Update role field in Firestore users/{uid}
      const userRef = adminDb.collection('users').doc(uid);
      await userRef.update({ role: validRole });

      return NextResponse.json({ ok: true }, { status: 200 });
    } catch (err) {
      console.error('[set-role] Operation failed:', err);
      return NextResponse.json(
        { error: 'Gagal memperbarui peran. Silakan coba lagi.' },
        { status: 500 }
      );
    }
  }
);
