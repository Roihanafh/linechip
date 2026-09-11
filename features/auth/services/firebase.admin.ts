import 'server-only';
import * as admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

const REQUIRED_SERVER_ENV = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
] as const;

function validateServerEnv(): void {
  const missing = REQUIRED_SERVER_ENV.filter((key) => {
    const val = process.env[key];
    return !val || val.trim() === '';
  });
  if (missing.length > 0) {
    throw new Error(
      `Firebase Admin env tidak terdefinisi atau kosong: ${missing.join(', ')}`
    );
  }
}

function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  validateServerEnv();

  const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey,
    }),
  });
}

export function getAdminAuth(): Auth {
  return getAdminApp().auth();
}

export function getAdminDb(): Firestore {
  return getAdminApp().firestore();
}

import type { NextRequest, NextResponse as NextResponseType } from 'next/server';
import { NextResponse } from 'next/server';
import type { DecodedSessionClaims } from '../types';

type RouteHandler = (
  req: NextRequest,
  claims: DecodedSessionClaims
) => Promise<NextResponseType>;

export async function verifySessionCookie(cookie: string): Promise<DecodedSessionClaims> {
  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifySessionCookie(cookie, true); // checkRevoked: true
  return {
    uid: decoded.uid,
    email: decoded.email ?? '',
    role: (decoded['role'] as 'user' | 'admin') ?? 'user',
    email_verified: decoded.email_verified ?? false,
    exp: decoded.exp,
    iat: decoded.iat,
  };
}

export function withAuth(handler: RouteHandler) {
  return async (req: NextRequest): Promise<NextResponseType> => {
    const cookie = req.cookies.get('__session')?.value;
    if (!cookie) {
      return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 });
    }
    try {
      const claims = await verifySessionCookie(cookie);
      return await handler(req, claims);
    } catch {
      return NextResponse.json({ error: 'Sesi tidak valid atau telah berakhir.' }, { status: 401 });
    }
  };
}

export function withAdminAuth(handler: RouteHandler) {
  return async (req: NextRequest): Promise<NextResponseType> => {
    const cookie = req.cookies.get('__session')?.value;
    if (!cookie) {
      return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 });
    }
    try {
      const claims = await verifySessionCookie(cookie);
      if (claims.role !== 'admin') {
        return NextResponse.json(
          { error: 'Akses ditolak. Hanya admin yang dapat mengakses endpoint ini.' },
          { status: 403 }
        );
      }
      return await handler(req, claims);
    } catch {
      return NextResponse.json({ error: 'Sesi tidak valid atau telah berakhir.' }, { status: 401 });
    }
  };
}
