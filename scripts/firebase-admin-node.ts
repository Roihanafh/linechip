/**
 * Thin Node.js-safe re-export of Firebase Admin helpers.
 *
 * firebase.admin.ts in features/ uses `import 'server-only'` which throws
 * outside the Next.js server environment. This module replicates the same
 * initialization logic for use in CLI scripts (seed-admin.ts, etc.)
 * without the server-only guard.
 *
 * NOTE: This file is intentionally NOT imported by any application code.
 * Application code must continue to use features/auth/services/firebase.admin.ts.
 */

import * as admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

const REQUIRED_ENV = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
] as const;

function validateEnv(): void {
  const missing = REQUIRED_ENV.filter((key) => {
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
  if (admin.apps.length > 0) return admin.apps[0]!;
  validateEnv();
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
