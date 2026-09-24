/**
 * Admin Seed Script
 *
 * Creates the first admin account in Firebase Auth and Firestore.
 * Uses the same initialization pattern as features/auth/services/firebase.admin.ts
 * (getAdminAuth / getAdminDb) via a Node.js-safe local re-export that omits the
 * Next.js `server-only` import guard — which has no relevance in a CLI context.
 *
 * Usage:
 *   npm run seed:admin
 *   — OR —
 *   npx ts-node --project tsconfig.scripts.json scripts/seed-admin.ts
 *
 * Required environment variables (read from .env.local):
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_SCHOOL
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env.local BEFORE Firebase Admin SDK initializes (needs FIREBASE_* vars).
// Per Requirement 8.8: "SHALL memuat variabel environment dari file .env.local
// menggunakan dotenv sebelum inisialisasi Firebase Admin SDK."
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Uses the same getAdminAuth / getAdminDb pattern as
// features/auth/services/firebase.admin.ts (Requirement 8.8).
// The local re-export omits `import 'server-only'` which is a Next.js build-time
// guard not applicable to CLI scripts.
import { getAdminAuth, getAdminDb } from './firebase-admin-node';
import { FieldValue } from 'firebase-admin/firestore';

async function main(): Promise<void> {
  // ── 1. Read and validate required environment variables ──────────────────────
  // Per Requirements 8.2: reject if any required variable is missing or empty.
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const name = process.env.ADMIN_NAME?.trim();
  const school = process.env.ADMIN_SCHOOL?.trim();

  const missing: string[] = [];
  if (!email) missing.push('ADMIN_EMAIL');
  if (!password) missing.push('ADMIN_PASSWORD');
  if (!name) missing.push('ADMIN_NAME');
  if (!school) missing.push('ADMIN_SCHOOL');

  if (missing.length > 0) {
    console.error(
      `Error: Variabel environment berikut wajib diisi dan tidak boleh kosong: ${missing.join(', ')}`
    );
    console.error(
      'Pastikan variabel tersebut terdefinisi di file .env.local atau environment saat ini.'
    );
    process.exit(1);
  }

  const auth = getAdminAuth();
  const db = getAdminDb();

  // ── 2. Create Firebase Auth account ──────────────────────────────────────────
  // Per Requirement 8.3: createUser with email, password, displayName.
  let uid: string;
  try {
    const userRecord = await auth.createUser({
      email: email!,
      password: password!,
      displayName: name!,
    });
    uid = userRecord.uid;
    console.log(`✓ Akun Firebase Auth berhasil dibuat (uid: ${uid})`);
  } catch (err: unknown) {
    // Per Requirement 8.5: inform and stop if email already in use.
    const code = (err as { code?: string }).code;
    if (code === 'auth/email-already-in-use') {
      console.error(`Error: Email "${email}" sudah terdaftar di Firebase Auth.`);
      console.error(
        'Gunakan email yang berbeda atau hapus akun yang sudah ada terlebih dahulu.'
      );
    } else {
      console.error('Error saat membuat akun Firebase Auth:', err);
    }
    process.exit(1);
  }

  // ── 3. Set custom claim role: "admin" ─────────────────────────────────────────
  // Per Requirement 8.3: setCustomUserClaims with { role: 'admin' }.
  await auth.setCustomUserClaims(uid, { role: 'admin' });
  console.log(`✓ Custom claim "role: admin" berhasil ditetapkan pada uid: ${uid}`);

  // ── 4. Create / overwrite Firestore document users/{uid} ─────────────────────
  // Per Requirements 8.4, 8.6: set with merge: false; includes all required fields.
  await db.collection('users').doc(uid).set(
    {
      uid,
      name: name!,
      email: email!,
      school: school!,
      role: 'admin',
      totalScore: 0,
      disabled: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: false }
  );
  console.log(`✓ Dokumen Firestore users/${uid} berhasil dibuat.`);

  // ── 5. Print success summary (Requirement 8.7) ───────────────────────────────
  console.log('\n========================================');
  console.log('Admin berhasil dibuat:');
  console.log(`  uid   : ${uid}`);
  console.log(`  email : ${email}`);
  console.log('  Custom claim "role: admin" dan dokumen Firestore telah berhasil dibuat.');
  console.log('========================================\n');

  process.exit(0);
}

main().catch((err: unknown) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
