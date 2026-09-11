# Design Document: Firebase Auth Module

## Overview

Modul Firebase Auth mengintegrasikan Firebase Authentication dan Cloud Firestore ke dalam platform edukasi LineChip yang sudah ada. Modul ini menghubungkan UI login/registrasi yang telah selesai (`LoginClient.tsx`, `RegisterClient.tsx`) dengan backend Firebase tanpa mengubah satu karakter pun di JSX atau styling-nya.

### Prinsip Utama

- **Feature-based isolation**: Semua Firebase logic dikurung di `features/auth/` — tidak ada import Firebase SDK langsung dari `app/` atau `components/`.
- **UI integration via hooks**: `LoginClient` dan `RegisterClient` mengkonsumsi `useLoginForm()` / `useRegisterForm()` — dua hook yang menyuplai `onSubmit`, `loading`, `errors`, dan `toast`.
- **Server-side session**: Session disimpan sebagai `httpOnly` cookie yang diverifikasi oleh Firebase Admin SDK di API Routes dan oleh `jose` di Proxy (Edge Runtime).
- **Role via Custom Claims**: Peran `user`/`admin` dikodekan ke ID Token Firebase sehingga tidak perlu query Firestore tambahan saat otorisasi server.

### Dependensi Baru yang Perlu Ditambahkan

```bash
npm install firebase firebase-admin jose
```

| Paket | Versi yang direkomendasikan | Digunakan di |
|---|---|---|
| `firebase` | `^11.x` | Client SDK (browser) |
| `firebase-admin` | `^13.x` | Admin SDK (Node.js / API Routes) |
| `jose` | `^5.x` | Verifikasi JWT ringan di Proxy (Edge Runtime) |

---

## Architecture

### Layer Diagram

```
┌────────────────────────────────────────────────────────────┐
│  UI Components (app/ & components/)                        │
│  LoginClient.tsx   RegisterClient.tsx                      │
│  ↓ consume via props/hooks — no Firebase import            │
├────────────────────────────────────────────────────────────┤
│  Custom Hooks  (features/auth/hooks/)                      │
│  useLoginForm()   useRegisterForm()   useAuth()            │
│  ↓ call AuthService, read AuthContext                      │
├────────────────────────────────────────────────────────────┤
│  AuthContext  (features/auth/context/)                     │
│  AuthProvider — onAuthStateChanged + Firestore listener    │
├────────────────────────────────────────────────────────────┤
│  AuthService  (features/auth/services/)                    │
│  registerWithEmail  loginWithEmail  loginWithGoogle        │
│  logout  sendPasswordReset  getValidIdToken  updateUserProfile │
│  getUserProfile                                            │
│  ↓ calls Firebase client SDK / API Routes                  │
├────────────────────────────────────────────────────────────┤
│  Firebase Client SDK  firebase.client.ts                   │
│  FirebaseApp  Auth  Firestore  (browser, singleton)        │
├────────────────────────────────────────────────────────────┤
│  API Routes  (app/api/auth/)                               │
│  POST /session   POST /logout   POST /set-role             │
│  ↓ uses Firebase Admin SDK                                 │
├────────────────────────────────────────────────────────────┤
│  Firebase Admin SDK  firebase.admin.ts                     │
│  verifySessionCookie  withAuth  withAdminAuth              │
│  (Node.js only — never imported from Client Components)    │
├────────────────────────────────────────────────────────────┤
│  Proxy  (proxy.ts — Next.js 16)                            │
│  Reads session cookie → verifies with jose (Edge-safe)     │
│  Redirects: protected routes, auth routes, admin routes    │
└────────────────────────────────────────────────────────────┘
```

### Alur Request Kritis

**Login (email/password)**:
1. `LoginClient` memanggil `onSubmit(email, password)` dari `useLoginForm()`
2. Hook memanggil `AuthService.loginWithEmail(email, password)`
3. AuthService memanggil Firebase Auth `signInWithEmailAndPassword`
4. Jika berhasil, AuthService memanggil `getIdToken()` lalu `POST /api/auth/session` dengan ID Token + `rememberMe`
5. API Route memverifikasi ID Token via Admin SDK, menerbitkan Session Cookie (`httpOnly`, `secure`)
6. `onAuthStateChanged` di AuthProvider terpanggil → AuthProvider fetch User Profile dari Firestore → update AuthContext
7. `useLoginForm` menerima signal sukses → router redirect ke halaman tujuan

**Akses Protected Route**:
1. Browser mengirim request dengan Session Cookie
2. `proxy.ts` membaca cookie, mendekode JWT via `jose` (Edge-safe, tanpa Admin SDK)
3. Jika tidak valid → redirect ke `/login?redirect=<encoded-path>`
4. Jika valid → request diteruskan ke halaman

---

## Components and Interfaces

### Struktur Direktori Lengkap

```
features/
└── auth/
    ├── index.ts                        # Barrel file — semua public API
    ├── services/
    │   ├── firebase.client.ts          # Inisialisasi Firebase client (singleton)
    │   ├── firebase.admin.ts           # Inisialisasi Firebase Admin (server-only)
    │   └── authService.ts              # Semua fungsi AuthService
    ├── hooks/
    │   ├── useAuth.ts                  # Baca AuthContext
    │   ├── useLoginForm.ts             # Logic login form untuk LoginClient
    │   └── useRegisterForm.ts          # Logic register form untuk RegisterClient
    ├── context/
    │   ├── AuthContext.ts              # Definisi context + default value
    │   └── AuthProvider.tsx            # Provider dengan onAuthStateChanged
    ├── types/
    │   └── index.ts                    # UserProfile, AuthUser, AuthContextValue, AuthError
    └── utils/
        ├── errorMessages.ts            # Firebase error code → Bahasa Indonesia
        └── tokenHelpers.ts             # getValidIdToken, cookie expiry helpers

app/
└── api/
    └── auth/
        ├── session/
        │   └── route.ts               # POST /api/auth/session
        ├── logout/
        │   └── route.ts               # POST /api/auth/logout
        └── set-role/
            └── route.ts               # POST /api/auth/set-role

proxy.ts                               # Next.js 16 Proxy (menggantikan middleware.ts)
```

### firebase.client.ts — Singleton Pattern

```typescript
// features/auth/services/firebase.client.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

function validateClientEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => {
    const val = process.env[key];
    return !val || val.trim() === '';
  });
  if (missing.length > 0) {
    throw new Error(
      `Firebase client env tidak terdefinisi atau kosong: ${missing.join(', ')}`
    );
  }
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

function getFirebaseClient() {
  if (!app) {
    validateClientEnv();
    app = getApps().length > 0 ? getApp() : initializeApp({ /* env vars */ });
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return { app, auth, db };
}

export { getFirebaseClient };
```

### firebase.admin.ts — Server-Only Guard

```typescript
// features/auth/services/firebase.admin.ts
import 'server-only'; // Melempar error jika diimpor dari Client Component
import * as admin from 'firebase-admin';

// Validasi env server (tanpa prefix NEXT_PUBLIC_)
const REQUIRED_SERVER_ENV = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
] as const;
```

---

## Data Models

### TypeScript Types

```typescript
// features/auth/types/index.ts
import type { Timestamp } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

/** Dokumen Firestore di koleksi users/{uid} */
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  school: string;
  role: 'user' | 'admin';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Subset aman dari FirebaseUser yang diekspos ke komponen */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  photoURL: string | null;
}

/** Shape dari AuthContext */
export interface AuthContextValue {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

/** Error terstruktur dari AuthService */
export interface AuthError {
  code: string;           // Firebase error code, mis. 'auth/email-already-in-use'
  message: string;        // Pesan Bahasa Indonesia yang sudah diterjemahkan
  field?: 'email' | 'password' | 'name' | 'school'; // Field spesifik jika ada
}

/** Return type useLoginForm / useRegisterForm */
export interface UseLoginFormReturn {
  onSubmit: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  loading: boolean;
  errors: Record<string, string>;
  toast: { message: string; type: 'success' | 'error' } | null;
  clearToast: () => void;
}

export interface UseRegisterFormReturn {
  onSubmit: (
    name: string,
    email: string,
    password: string,
    school: string
  ) => Promise<void>;
  loading: boolean;
  errors: Record<string, string>;
  toast: { message: string; type: 'success' | 'error' } | null;
  clearToast: () => void;
}

/** Decoded claims dari Session Cookie yang diverifikasi Admin SDK */
export interface DecodedSessionClaims {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  email_verified: boolean;
  exp: number;
  iat: number;
}

/** Partial profile yang boleh diupdate via updateUserProfile */
export type UpdatableUserProfile = Partial<Pick<UserProfile, 'name' | 'email' | 'school'>>;
```

---

## AuthContext & AuthProvider Design

### State Machine

AuthProvider mengelola state dengan nilai-nilai berikut:

```
                    ┌──────────────────────────────────────────┐
                    │            LOADING                        │
                    │  loading: true                            │
                    │  user: null, profile: null, error: null   │
                    └──────────────┬───────────────────────────┘
                                   │ onAuthStateChanged fires
                    ┌──────────────▼───────────────────────────┐
                    │        UNAUTHENTICATED                    │
                    │  loading: false, user: null               │
                    │  profile: null, error: null               │
                    └──────────────┬───────────────────────────┘
                                   │ login success
          ┌────────────────────────▼───────────────────────────┐
          │                 AUTHENTICATED                       │
          │  loading: false                                     │
          │  user: FirebaseUser (non-null)                      │
          │  profile: UserProfile | null                        │
          │  error: null | "pesan error profil"                 │
          └───────────────────────────┬────────────────────────┘
                    logout ▲          │ profile fetch error
                           │          ▼
                    ┌──────┘  error: "Gagal memuat profil..."   │
                    │         profile: null, user: tetap ada    │
                    └───────────────────────────────────────────┘
```

### onAuthStateChanged + Firestore Listener

```typescript
// features/auth/context/AuthProvider.tsx
"use client";

useEffect(() => {
  const { auth, db } = getFirebaseClient();
  let profileUnsub: (() => void) | null = null;

  const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
    // Bersihkan listener profil sebelumnya
    if (profileUnsub) { profileUnsub(); profileUnsub = null; }

    if (!firebaseUser) {
      setState({ user: null, profile: null, loading: false, error: null });
      return;
    }

    // Set user segera, mulai loading profil
    setState((prev) => ({ ...prev, user: firebaseUser, loading: true }));

    // Pasang real-time listener Firestore
    const docRef = doc(db, 'users', firebaseUser.uid);
    profileUnsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          setState({ user: firebaseUser, profile: snap.data() as UserProfile, loading: false, error: null });
        } else {
          // Profil belum ada (race condition saat registrasi) — tunggu
          setState((prev) => ({ ...prev, profile: null, loading: false }));
        }
      },
      (err) => {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Gagal memuat data profil. Coba muat ulang halaman.',
          profile: null,
        }));
      }
    );
  });

  return () => {
    authUnsub();
    if (profileUnsub) profileUnsub();
  };
}, []);
```

AuthProvider dipasang di `components/AppShell.tsx` (yang sudah ada di `layout.tsx`) sehingga seluruh pohon komponen mendapat akses AuthContext.

---

## AuthService API

### Function Signatures Lengkap

```typescript
// features/auth/services/authService.ts

/**
 * Mendaftarkan pengguna baru dengan email dan password.
 * Membuat akun Firebase Auth → dokumen Firestore → kirim email verifikasi.
 * Throws AuthError jika validasi gagal atau Firebase error.
 */
export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
  school: string
): Promise<void>;

/**
 * Login dengan email dan password.
 * Memanggil signInWithEmailAndPassword → request Session Cookie ke server.
 */
export async function loginWithEmail(
  email: string,
  password: string,
  rememberMe: boolean
): Promise<void>;

/**
 * Login dengan Google OAuth via Firebase GoogleAuthProvider (popup).
 * Membuat profil Firestore jika pengguna baru, memuat yang ada jika sudah terdaftar.
 */
export async function loginWithGoogle(): Promise<void>;

/**
 * Logout: sign out Firebase Auth klien → DELETE session cookie via API Route.
 * Tidak throws jika penghapusan cookie server gagal (best-effort).
 */
export async function logout(): Promise<void>;

/**
 * Mengirim email reset kata sandi.
 * Selalu mengembalikan void (tidak mengonfirmasi apakah email terdaftar).
 */
export async function sendPasswordReset(email: string): Promise<void>;

/**
 * Mengembalikan ID Token yang masih valid.
 * Melakukan refresh otomatis via getIdToken(true) jika diperlukan.
 * Throws jika sesi telah dicabut atau refresh gagal.
 */
export async function getValidIdToken(): Promise<string>;

/**
 * Memperbarui field name, email, dan/atau school di dokumen Firestore.
 * Juga memperbarui updatedAt ke timestamp sekarang.
 * Throws jika dokumen tidak ditemukan (tidak membuat baru).
 */
export async function updateUserProfile(
  uid: string,
  partialProfile: UpdatableUserProfile
): Promise<void>;

/**
 * Mengambil dokumen UserProfile dari Firestore.
 * Mengembalikan null jika dokumen tidak ditemukan.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null>;

/**
 * Sanitasi input: menghapus karakter kontrol dan tag HTML.
 * Dipanggil sebelum menyimpan ke Firestore.
 */
export function sanitizeInput(input: string): string;
```

### Pola Penanganan Error di AuthService

```typescript
// Contoh pola di loginWithEmail
try {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await cred.user.getIdToken();
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, rememberMe }),
  });
} catch (err) {
  const firebaseCode = (err as { code?: string }).code ?? 'unknown';
  throw {
    code: firebaseCode,
    message: getErrorMessage(firebaseCode),   // dari errorMessages.ts
    field: getErrorField(firebaseCode),        // 'email' | 'password' | undefined
  } satisfies AuthError;
}
```

---

## Custom Hooks

### useAuth()

```typescript
// features/auth/hooks/useAuth.ts
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      'useAuth harus digunakan di dalam AuthProvider. ' +
      'Pastikan AuthProvider dipasang di AppShell atau layout.tsx.'
    );
  }
  return ctx;
}
```

### useLoginForm()

Hook ini dikonsumsi oleh `LoginClient.tsx` tanpa mengubah JSX atau styling.

```typescript
// features/auth/hooks/useLoginForm.ts
export function useLoginForm(): UseLoginFormReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const submittingRef = useRef(false); // Mencegah double-submit

  const onSubmit = async (email: string, password: string, rememberMe: boolean) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setErrors({});

    try {
      await AuthService.loginWithEmail(email, password, rememberMe);
      setToast({ message: 'Login berhasil! Selamat datang kembali.', type: 'success' });
      const redirect = searchParams.get('redirect') ?? '/';
      router.replace(decodeURIComponent(redirect));
    } catch (err) {
      const authErr = err as AuthError;
      if (authErr.field) {
        setErrors({ [authErr.field]: authErr.message });
      } else {
        setToast({ message: authErr.message, type: 'error' });
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return { onSubmit, loading, errors, toast, clearToast: () => setToast(null) };
}
```

### useRegisterForm()

Serupa dengan `useLoginForm` tetapi menangani field `name`, `email`, `password`, `school`.

```typescript
// features/auth/hooks/useRegisterForm.ts
export function useRegisterForm(): UseRegisterFormReturn {
  // ... state identik dengan useLoginForm
  
  const onSubmit = async (name: string, email: string, password: string, school: string) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setErrors({});

    try {
      await AuthService.registerWithEmail(name, email, password, school);
      setToast({
        message: 'Akun berhasil dibuat! Cek email untuk verifikasi.',
        type: 'success',
      });
      router.replace('/login');
    } catch (err) {
      const authErr = err as AuthError;
      if (authErr.field) {
        setErrors({ [authErr.field]: authErr.message });
      } else {
        setToast({ message: authErr.message, type: 'error' });
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return { onSubmit, loading, errors, toast, clearToast: () => setToast(null) };
}
```

---

## Firebase Admin SDK

### verifySessionCookie

```typescript
// features/auth/services/firebase.admin.ts
import 'server-only';

export async function verifySessionCookie(
  cookie: string
): Promise<DecodedSessionClaims>;
// Throws FirebaseAdminError jika cookie tidak valid, kadaluarsa, atau dicabut.
// Return type mencakup: uid, email, role (dari Custom Claims), email_verified.
```

### Higher-Order Functions

```typescript
import type { NextRequest, NextResponse } from 'next/server';

type RouteHandler = (
  req: NextRequest,
  claims: DecodedSessionClaims
) => Promise<NextResponse>;

/**
 * Memverifikasi Session Cookie. Jika tidak valid → 401.
 * Meneruskan decoded claims ke handler.
 */
export function withAuth(handler: RouteHandler): (req: NextRequest) => Promise<NextResponse>;

/**
 * Memverifikasi Session Cookie DAN memvalidasi role === 'admin'.
 * Jika tidak valid → 401. Jika bukan admin → 403.
 */
export function withAdminAuth(handler: RouteHandler): (req: NextRequest) => Promise<NextResponse>;
```

---

## API Routes

### POST /api/auth/session

**File**: `app/api/auth/session/route.ts`

```
Request Body: { idToken: string, rememberMe: boolean }
Response 200: { ok: true }
Response 401: { error: "Token tidak valid atau kadaluarsa." }
Response 400: { error: "idToken wajib disertakan." }
```

**Logika**:
1. Validasi body: `idToken` harus hadir dan non-empty
2. `admin.auth().verifyIdToken(idToken)` — validasi ID Token
3. `admin.auth().createSessionCookie(idToken, { expiresIn })`:
   - `rememberMe = true` → `expiresIn = 30 * 24 * 60 * 60 * 1000` (30 hari)
   - `rememberMe = false` → `expiresIn = 5 * 24 * 60 * 60 * 1000` (5 hari, session-like)
4. Set cookie via `NextResponse` dengan atribut:
   - `httpOnly: true`
   - `secure: process.env.NODE_ENV === 'production'`
   - `sameSite: 'lax'`
   - `path: '/'`
   - `maxAge`: sesuai `expiresIn`

### POST /api/auth/logout

**File**: `app/api/auth/logout/route.ts`

```
Response 200: { ok: true }   (selalu — bahkan jika cookie tidak ada)
```

**Logika**:
1. Baca Session Cookie dari request
2. Jika ada: `admin.auth().revokeRefreshTokens(uid)` (best-effort, tidak melempar ke klien jika gagal)
3. Set cookie dengan `maxAge: 0` untuk menghapusnya dari browser
4. Return 200

### POST /api/auth/set-role

**File**: `app/api/auth/set-role/route.ts`

```
Request Body: { uid: string, role: 'user' | 'admin' }
Response 200: { ok: true }
Response 400: { error: "Parameter tidak valid: uid dan role wajib ada." }
Response 403: { error: "Akses ditolak. Hanya admin yang dapat mengubah peran pengguna." }
Response 500: { error: "Gagal memperbarui peran. Silakan coba lagi." }
```

**Logika** (dibungkus `withAdminAuth`):
1. Validasi body: `uid` (string non-empty) dan `role` (harus `'user'` atau `'admin'`)
2. `admin.auth().setCustomUserClaims(uid, { role })`
3. Update dokumen Firestore `users/{uid}` field `role`
4. Keduanya dalam try-catch — jika salah satu gagal, return 500 dan rollback tidak dilakukan (dicatat di log)

---

## Next.js Proxy (proxy.ts)

> ⚠️ **Next.js 16**: File `middleware.ts` telah diganti dengan `proxy.ts`. Nama fungsi export adalah `proxy`, bukan `middleware`.

### Logic Flow

```typescript
// proxy.ts (di root proyek, bukan di app/)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PROTECTED_ROUTES = [
  '/leaderboard',
  '/game-virus',
  '/intline-run',
  '/garis-bilangan',
  '/materi',
];
const ADMIN_ROUTES = ['/admin'];
const AUTH_ROUTES = ['/login', '/register'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookie = req.cookies.get('__session')?.value;  // nama cookie dari /api/auth/session

  // Verifikasi ringan via jose (Edge Runtime — tidak bisa pakai Firebase Admin SDK)
  let claims: { uid: string; role?: string } | null = null;
  if (cookie) {
    try {
      // Verifikasi menggunakan Firebase public keys atau HMAC secret
      // Untuk Firebase session cookie: gunakan jose untuk decode tanpa signature verify
      // (Full verification dilakukan di API Routes via Admin SDK)
      // Di proxy: cukup cek format dan expiry via jose.decodeJwt untuk performa
      const decoded = decodeSessionCookieOptimistic(cookie);
      if (decoded && decoded.exp > Date.now() / 1000) {
        claims = decoded;
      }
    } catch {
      claims = null;
    }
  }

  const isAuthenticated = claims !== null;
  const isAdmin = claims?.role === 'admin';

  // 1. Auth routes: redirect ke '/' jika sudah login
  if (AUTH_ROUTES.some((r) => pathname.startsWith(r)) && isAuthenticated) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // 2. Protected routes: redirect ke login jika belum autentikasi
  if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r)) && !isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    const safePath = pathname.length <= 2000 ? pathname : '/';
    loginUrl.searchParams.set('redirect', encodeURIComponent(safePath));
    return NextResponse.redirect(loginUrl);
  }

  // 3. Admin routes: redirect ke '/?error=unauthorized' jika bukan admin
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r)) && !isAdmin) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', encodeURIComponent(pathname));
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.redirect(new URL('/?error=unauthorized', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|public/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
```

### Catatan Penting: Verifikasi di Proxy vs API Routes

Firebase session cookie adalah JWT yang ditandatangani oleh Firebase. Untuk memverifikasi signature-nya, diperlukan Firebase public keys yang tidak tersedia di Edge Runtime secara efisien.

**Strategi dua lapis**:
- **Proxy** (`proxy.ts`): Lakukan optimistic check — decode JWT tanpa verifikasi signature penuh, cek expiry. Ini mencegah redirect yang jelas-jelas tidak perlu untuk token yang jelas-jelas kadaluarsa atau malformed.
- **API Routes**: Verifikasi penuh via Firebase Admin SDK (`verifySessionCookie` dengan `checkRevoked: true`).

Untuk keamanan production, pertimbangkan menggunakan `jose` dengan Firebase's public key endpoint (`https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`) di proxy untuk verifikasi yang lebih ketat.

---

## Integrasi UI

### Cara LoginClient.tsx Mengkonsumsi Hook (Tanpa Modifikasi)

`LoginClient.tsx` yang ada sudah memiliki state `loading`, `errors`, `toast` — hook `useLoginForm()` menyuplai nilai-nilai tersebut melalui destructuring. Tidak ada perubahan pada JSX, styling, atau struktur form.

```typescript
// app/login/LoginClient.tsx  (hanya tambahan 2 baris import + destructure)
import { useLoginForm } from '@/features/auth/hooks/useLoginForm';

export function LoginClient() {
  // Ganti state lokal ini:
  // const [loading, setLoading] = useState(false);
  // const [errors, setErrors] = useState<...>({});
  // const [toast, setToast] = useState<...>(null);
  // const handleSubmit = async (e) => { ... await new Promise ... }

  // Dengan ini:
  const { onSubmit, loading, errors, toast, clearToast } = useLoginForm();

  // handleSubmit menjadi:
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password, rememberMe);
  };

  // Semua JSX, Tailwind classes, animasi — tidak berubah sama sekali
  // toast: { type, msg } → { type, message } — sesuaikan nama field saja
}
```

Perubahan minimal yang diperlukan:
1. Tambah import `useLoginForm`
2. Hapus 4 baris state lokal (loading, errors, toast, handleSubmit mock)
3. Destructure dari hook
4. Sesuaikan nama field `toast.msg` → `toast.message` di JSX (1 tempat)

### Cara RegisterClient.tsx Mengkonsumsi Hook

Identik dengan LoginClient — tambah import `useRegisterForm`, hapus state lokal, destructure dari hook.

---

## Security Considerations

### httpOnly Cookie
Session Cookie selalu di-set dengan `httpOnly: true`, sehingga tidak dapat diakses oleh JavaScript di browser. Ini mencegah serangan XSS mengambil session token.

### CSRF Protection
- Cookie menggunakan `sameSite: 'lax'` — melindungi dari sebagian besar serangan CSRF lintas situs
- Untuk perlindungan lebih kuat, pertimbangkan `sameSite: 'strict'` jika tidak ada kebutuhan cross-site embedding

### Variabel Lingkungan
- Konfigurasi Firebase klien (dengan prefix `NEXT_PUBLIC_`) boleh diekspos ke browser — ini adalah desain Firebase
- Konfigurasi Admin SDK (`FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`) hanya di `.env.local` tanpa prefix, dan dilindungi oleh `'server-only'` import guard

### Input Sanitization
Semua input teks (`name`, `school`, `email`) melewati `sanitizeInput()` sebelum disimpan ke Firestore:
```typescript
export function sanitizeInput(input: string): string {
  return input
    .replace(/[\x00-\x1F\x7F]/g, '')   // Hapus karakter kontrol
    .replace(/<[^>]*>/g, '')             // Hapus tag HTML
    .trim();
}
```

### Tidak Menyimpan Password
Firebase Authentication mengelola hashing password — aplikasi tidak pernah menyentuh atau menyimpan password mentah.

### Rate Limiting
Firebase Authentication memiliki rate limiting bawaan. Untuk perlindungan tambahan di sisi aplikasi, error `auth/too-many-requests` dipetakan ke pesan "Terlalu banyak percobaan. Coba lagi dalam beberapa menit."

---

## Error Handling

### Firebase Error Code → Bahasa Indonesia

```typescript
// features/auth/utils/errorMessages.ts

export const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  'auth/email-already-in-use':
    'Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.',
  'auth/invalid-email':
    'Format email tidak valid. Periksa kembali alamat email Anda.',
  'auth/user-not-found':
    'Email atau kata sandi salah. Periksa kembali dan coba lagi.',
  'auth/wrong-password':
    'Email atau kata sandi salah. Periksa kembali dan coba lagi.',
  'auth/invalid-credential':
    'Email atau kata sandi salah. Periksa kembali dan coba lagi.',
  'auth/user-disabled':
    'Akun ini telah dinonaktifkan. Hubungi administrator untuk bantuan.',
  'auth/too-many-requests':
    'Terlalu banyak percobaan. Coba lagi dalam beberapa menit.',
  'auth/network-request-failed':
    'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
  'auth/popup-closed-by-user':
    '', // Tidak perlu pesan — pengguna sengaja menutup
  'auth/popup-blocked':
    'Pop-up diblokir oleh browser. Izinkan pop-up untuk masuk dengan Google.',
  'auth/cancelled-popup-request':
    '', // Diabaikan
  'auth/account-exists-with-different-credential':
    'Email ini sudah terdaftar dengan metode login lain. Coba masuk dengan email/kata sandi.',
  'auth/requires-recent-login':
    'Sesi Anda sudah lama tidak aktif. Silakan masuk kembali untuk melanjutkan.',
  'auth/weak-password':
    'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.',
  'auth/operation-not-allowed':
    'Metode login ini tidak diizinkan. Hubungi administrator.',
  'auth/session-cookie-expired':
    'Sesi Anda telah berakhir. Silakan masuk kembali.',
  'auth/session-cookie-revoked':
    'Sesi Anda telah dicabut. Silakan masuk kembali.',
  // Network / generic
  'network-error':
    'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
  'unknown':
    'Terjadi kesalahan yang tidak terduga. Coba lagi atau hubungi dukungan.',
};

export function getErrorMessage(code: string): string {
  return FIREBASE_ERROR_MESSAGES[code] ?? FIREBASE_ERROR_MESSAGES['unknown'];
}

/** Field yang terkait dengan error code tertentu */
export function getErrorField(
  code: string
): 'email' | 'password' | undefined {
  const emailCodes = new Set([
    'auth/email-already-in-use',
    'auth/invalid-email',
    'auth/user-not-found',
    'auth/invalid-credential',
  ]);
  const passwordCodes = new Set([
    'auth/wrong-password',
    'auth/weak-password',
    'auth/invalid-credential',
  ]);
  if (emailCodes.has(code)) return 'email';
  if (passwordCodes.has(code)) return 'password';
  return undefined;
}
```

### Strategi Error Routing di Hook

| Tipe Error | Routing |
|---|---|
| Error per-field (`auth/invalid-email`, `auth/wrong-password`, dll.) | → `setErrors({ [field]: message })` — tampil di bawah input via `FloatingInput.error` |
| Error umum (network, server, unknown) | → `setToast({ type: 'error', message })` — tampil via komponen `Toast` yang sudah ada |
| Login berhasil | → `setToast({ type: 'success', message: 'Login berhasil!' })` |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property Reflection**

Sebelum finalisasi, berikut adalah eliminasi redundansi:

- **Requirements 1.3 dan 1.7** sama-sama menguji validasi env var (missing vs. whitespace) — keduanya digabung ke Property 1 karena "whitespace-only" adalah subset dari "invalid/missing".
- **Requirements 2.5 dan 2.6** sama-sama menguji penolakan input tidak valid — digabung ke Property 3 karena password pendek adalah bagian dari "field tidak memenuhi batas karakter".
- **Requirements 15.1 dan 15.3** adalah property yang sama (semua error code → non-empty message) — digabung ke Property 2.

---

### Property 1: Validasi env var — string kosong atau whitespace-only diperlakukan sebagai tidak terdefinisi

*Untuk semua* subset non-kosong dari required env vars Firebase di mana setidaknya satu nilai berupa string kosong atau hanya berisi whitespace (`' '`, `'\t'`, `'\n'`, dan kombinasinya), fungsi `validateClientEnv()` SHALL melempar Error yang menyebutkan nama variabel yang tidak valid dan TIDAK membuat objek Firebase apapun.

**Validates: Requirements 1.3, 1.7**

### Property 2: Error message mapping — setiap error code menghasilkan pesan yang dapat ditampilkan

*Untuk semua* string yang digunakan sebagai Firebase error code (baik yang terdefinisi di `FIREBASE_ERROR_MESSAGES` maupun string acak yang tidak dikenal), `getErrorMessage(code)` SHALL mengembalikan string non-kosong dan non-whitespace yang tidak mengekspos detail teknis internal.

**Validates: Requirements 15.1, 15.3**

### Property 3: Validasi form — field wajib kosong atau whitespace-only selalu ditolak

*Untuk semua* kombinasi input di mana setidaknya satu field wajib (name, email, password, school) adalah string yang hanya mengandung whitespace atau string kosong, `useRegisterForm().onSubmit` SHALL menempatkan error di field yang sesuai tanpa memanggil `AuthService.registerWithEmail`.

**Validates: Requirements 2.5, 2.6**

### Property 4: Input sanitasi tidak menambah karakter berbahaya

*Untuk semua* string input, `sanitizeInput(input)` SHALL mengembalikan string yang (a) panjangnya tidak melebihi input asli, (b) tidak mengandung tag HTML dalam bentuk apapun, dan (c) tidak mengandung karakter kontrol dalam rentang `\x00`–`\x1F`.

**Validates: Requirements 2.10**

### Property 5: Auth state transitions membentuk urutan yang konsisten

*Untuk semua* urutan event `onAuthStateChanged` (null → FirebaseUser → null), state AuthContext SHALL selalu mengikuti pola yang valid:

- Dimulai di state `loading: true`
- Setelah event `null` → `{ user: null, profile: null, loading: false, error: null }`
- Setelah event dengan FirebaseUser → `{ user: non-null, loading: false }`
- Setelah event `null` (logout) → `{ user: null, profile: null, loading: false }`

Tidak ada state yang valid di mana `user: null` tetapi `profile: non-null`.

**Validates: Requirements 9.1, 9.5, 10.3**

### Property 6: updateUserProfile hanya memperbarui field yang diizinkan

*Untuk semua* kombinasi nilai `name`, `email`, dan `school` yang valid, panggilan `updateUserProfile(uid, partialProfile)` SHALL hanya menulis field `name`, `email`, `school`, dan `updatedAt` ke Firestore — tidak pernah menulis `uid`, `role`, `createdAt`, atau field lainnya.

**Validates: Requirements 5.5**

---

## Testing Strategy

### Dual Testing Approach

Modul ini menggunakan kombinasi **unit tests** (example-based) dan **property-based tests** menggunakan `fast-check` yang sudah tersedia di `devDependencies`.

### Property-Based Tests (fast-check)

Library: `fast-check` v4.9.0 (sudah ada di `package.json`)
Konfigurasi: minimum 100 iterasi per property test
Tag format: `// Feature: firebase-auth-module, Property {N}: {property_text}`

**Property 1: Env var validation**
```typescript
// __tests__/auth/firebase.client.test.ts
// Feature: firebase-auth-module, Property 1: Whitespace env vars treated as missing
it.prop([
  fc.subarray(REQUIRED_ENV_VARS, { minLength: 1 }),  // subset of required vars
  fc.stringMatching(/^[\s\t\n]+$/),                  // whitespace-only value
])('Env vars dengan nilai whitespace melempar error', (missingVars, whitespaceVal) => {
  const envBackup = { ...process.env };
  missingVars.forEach((v) => { process.env[v] = whitespaceVal; });
  expect(() => validateClientEnv()).toThrow();
  Object.assign(process.env, envBackup);
});
```

**Property 2: Error message mapping**
```typescript
// __tests__/auth/errorMessages.test.ts
// Feature: firebase-auth-module, Property 2: Error message mapping non-kosong
it.prop([fc.string()])('getErrorMessage selalu mengembalikan string non-kosong', (code) => {
  const msg = getErrorMessage(code);
  expect(msg).toBeTruthy();
  expect(msg.trim().length).toBeGreaterThan(0);
});
```

**Property 3: Form validation rejects empty/whitespace fields**
```typescript
// __tests__/auth/useRegisterForm.test.ts
// Feature: firebase-auth-module, Property 3: Whitespace fields rejected without calling AuthService
const whitespace = fc.stringMatching(/^[\s\t\n]*$/);  // empty or whitespace-only
it.prop([whitespace, fc.emailAddress(), fc.string({ minLength: 6 }), fc.string({ minLength: 1 })])(
  'Nama kosong → error, AuthService tidak dipanggil',
  async (emptyName, email, password, school) => {
    const mockRegister = jest.spyOn(AuthService, 'registerWithEmail').mockResolvedValue();
    await onSubmit(emptyName, email, password, school);
    expect(mockRegister).not.toHaveBeenCalled();
    expect(errors.name).toBeTruthy();
  }
);
```

**Property 4: Input sanitization**
```typescript
// __tests__/auth/utils.test.ts
// Feature: firebase-auth-module, Property 4: sanitizeInput menghapus chars berbahaya
it.prop([fc.string()])('sanitizeInput tidak menambah karakter berbahaya', (input) => {
  const result = sanitizeInput(input);
  expect(result.length).toBeLessThanOrEqual(input.length);
  expect(result).not.toMatch(/<[^>]*>/);      // No HTML tags
  expect(result).not.toMatch(/[\x00-\x1F]/);  // No control chars
});
```

**Property 5: Auth state transitions**
```typescript
// __tests__/auth/AuthProvider.test.tsx
// Feature: firebase-auth-module, Property 5: Auth state transitions valid
// Generate berbagai urutan event onAuthStateChanged (null/FirebaseUser) dengan fast-check
it.prop([
  fc.array(fc.oneof(fc.constant(null), fc.record({ uid: fc.uuid(), email: fc.emailAddress() })),
    { minLength: 1, maxLength: 10 })
])('State AuthContext selalu konsisten', async (events) => {
  // Simulate events via mock onAuthStateChanged
  // Verify: never { user: null, profile: non-null }
  // Verify: last null event → { user: null, profile: null }
});
```

**Property 6: updateUserProfile field restriction**
```typescript
// __tests__/auth/authService.test.ts
// Feature: firebase-auth-module, Property 6: updateUserProfile hanya menulis field yang diizinkan
it.prop([
  fc.uuid(),          // uid
  fc.string({ minLength: 1, maxLength: 100 }),  // name
  fc.emailAddress(),  // email
  fc.string({ minLength: 1, maxLength: 200 }),  // school
])('updateUserProfile hanya menulis name/email/school/updatedAt', async (uid, name, email, school) => {
  const mockUpdate = jest.fn();
  // ... setup Firestore mock
  await updateUserProfile(uid, { name, email, school });
  const writtenData = mockUpdate.mock.calls[0][0];
  expect(Object.keys(writtenData)).toEqual(
    expect.arrayContaining(['name', 'email', 'school', 'updatedAt'])
  );
  expect(writtenData).not.toHaveProperty('uid');
  expect(writtenData).not.toHaveProperty('role');
  expect(writtenData).not.toHaveProperty('createdAt');
});
```

### Unit Tests (Example-based)

- **firebase.client.ts**: Test singleton pattern (initializeApp hanya dipanggil sekali), test error saat env var hilang/kosong
- **errorMessages.ts**: Test specific error code → pesan Bahasa Indonesia yang diharapkan
- **authService.ts**: Test tiap fungsi dengan Firebase SDK mock (jest.mock)
- **useLoginForm / useRegisterForm**: Test dengan React Testing Library — submit, loading state, error state, success redirect
- **API Routes**: Test dengan `NextRequest` mock — session creation, logout, set-role dengan berbagai authorization states
- **withAuth / withAdminAuth**: Test HOF dengan valid/invalid/expired cookie

### Integrasi & E2E

- Login flow end-to-end (login → session cookie set → protected route accessible)
- Google OAuth flow (menggunakan Firebase Emulator)
- Logout flow (cookie dihapus → protected route redirect ke login)
- Role-based access (non-admin → /admin redirect)

Gunakan **Firebase Local Emulator Suite** untuk semua integration tests agar tidak memerlukan koneksi ke Firebase production.

### Test Setup

```typescript
// jest.config.ts sudah dikonfigurasi untuk ts-jest
// Tambahkan setup file untuk Firebase mock:
// jest.setup.ts
jest.mock('firebase/app', () => ({ ... }));
jest.mock('firebase/auth', () => ({ ... }));
jest.mock('firebase/firestore', () => ({ ... }));
```
