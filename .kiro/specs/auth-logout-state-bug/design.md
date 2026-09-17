# Auth Logout State Bug — Bugfix Design

## Overview

Setelah user melakukan logout, cookie `__session` tidak selalu berhasil dihapus karena
`authService.logout()` memanggil `/api/auth/logout` secara fire-and-forget di dalam blok
`try/catch` yang menelan error diam-diam. Akibatnya, `proxy.ts` masih membaca cookie lama
yang belum kedaluwarsa dan menganggap user terautentikasi — memblokir akses ke `/login`
dan mengizinkan akses ke protected routes.

Perbaikan berfokus pada **dua perubahan minimal**:

1. `authService.logout()` — jalankan `signOut(auth)` dan `fetch('/api/auth/logout')`
   secara paralel, tunggu keduanya selesai (await), dan propagate error jika fetch gagal
   agar caller dapat menanganinya.
2. `useAccountDropdown.handleLogout()` — tangkap error dari `logout()` secara eksplisit,
   log ke konsol, dan tetap arahkan user ke `/` (graceful degradation sisi UI).

Tidak ada perubahan pada `proxy.ts`, `/api/auth/logout`, `AuthProvider`, atau komponen lain.

---

## Glossary

- **Bug_Condition (C)**: Kondisi yang memicu bug — user sudah `signOut()` di Firebase client
  tetapi cookie `__session` masih ada dan belum expired di browser.
- **Property (P)**: Perilaku yang diharapkan saat C(X) terpenuhi — cookie `__session` HARUS
  sudah tidak ada sebelum `proxy.ts` mengevaluasi request berikutnya.
- **Preservation**: Semua perilaku yang tidak boleh berubah akibat perbaikan ini — login,
  akses protected route saat autentikasi valid, redirect ke beranda saat akses `/login`
  dengan sesi aktif, dsb.
- **`logout()`**: Fungsi di `features/auth/services/authService.ts` yang memanggil
  `signOut(auth)` lalu `fetch('/api/auth/logout')`.
- **`handleLogout()`**: Callback di `features/profile/hooks/useAccountDropdown.ts` yang
  memanggil `logout()` lalu mengarahkan router ke `/`.
- **`proxy()`**: Fungsi di `proxy.ts` yang membaca cookie `__session` secara optimistik
  untuk menentukan `isAuthenticated` di Edge Middleware.
- **`isAuthenticated`**: Flag boolean di `proxy.ts` — `true` jika decoded cookie valid dan
  belum expired, `false` jika cookie tidak ada atau kedaluwarsa.
- **fire-and-forget**: Pola di mana `await` tidak digunakan; promise dijalankan tanpa
  menunggu hasilnya — penyebab utama bug ini.

---

## Bug Details

### Bug Condition

Bug terpicu ketika `logout()` memanggil `signOut(auth)` terlebih dahulu, kemudian
memanggil `fetch('/api/auth/logout')` di dalam blok `try/catch` tanpa `await` yang benar —
jika fetch gagal (network error, timeout, dll.) error-nya ditelan dan cookie `__session`
tetap ada di browser. Bahkan dalam kondisi jaringan normal, `handleLogout()` tidak menunggu
selesainya fetch sebelum memanggil `router.push('/')`, sehingga ada window kecil di mana
request navigasi berikutnya dikirim sebelum cookie dihapus.

**Formal Specification:**

```
FUNCTION isBugCondition(X)
  INPUT: X of type { firebaseUser, sessionCookie, sessionCookieExp }
  OUTPUT: boolean

  // Bug terpicu ketika Firebase sudah logout (signOut selesai)
  // TETAPI cookie __session masih ada dan belum expired di browser
  RETURN X.firebaseUser = null
    AND X.sessionCookie IS NOT NULL
    AND X.sessionCookieExp > Date.now() / 1000
END FUNCTION
```

### Examples

- **Logout + jaringan lambat**: User menekan "Keluar", `signOut()` berhasil, `router.push('/')`
  dipanggil sebelum fetch selesai. Request ke `/` dikirim dengan cookie masih ada →
  `proxy.ts` menganggap user login → redirect ke `/` tidak terjadi (sudah di sana), tetapi
  jika user langsung navigasi ke `/leaderboard` maka akses diizinkan.
- **Logout + fetch gagal (network error)**: `fetch('/api/auth/logout')` throw, error
  ditelan oleh `try/catch`, cookie tidak dihapus. User kembali ke `/`, mencoba `/login` →
  `proxy.ts` redirect kembali ke `/` karena `isAuthenticated = true`.
- **Logout + fetch gagal (5xx)**: Respons bukan `ok`, tapi `logout()` tidak memeriksa
  `res.ok` → cookie tidak dihapus, bug sama seperti di atas.
- **Logout normal (jaringan cepat, no error)**: Tidak ada bug — fetch selesai sebelum
  navigasi terjadi secara kebetulan.

---

## Expected Behavior

### Preservation Requirements

**Perilaku yang TIDAK boleh berubah:**

- User yang belum pernah login mengakses protected route → redirect ke `/login?redirect=...`
- User yang sedang login mengakses protected route → akses diizinkan tanpa interupsi
- User yang berhasil login melalui email/password atau Google → cookie `__session` disimpan
  dan akses ke protected routes berfungsi normal
- `AuthProvider` memperbarui `AuthContextValue` secara real-time mengikuti `onAuthStateChanged`
- User yang sudah login mengakses `/login` atau `/register` → redirect ke `/`
- `proxy.ts` memperlakukan cookie yang kedaluwarsa sebagai tidak terautentikasi

**Scope:**
Semua request yang TIDAK masuk ke kondisi bug (user terautentikasi penuh, atau belum login
sama sekali) tidak boleh dipengaruhi oleh perbaikan ini.

---

## Hypothesized Root Cause

Berdasarkan analisis kode di `authService.ts` baris 264–272:

```typescript
export async function logout(): Promise<void> {
  const { auth } = getFirebaseClient();
  await signOut(auth);                         // ← AWAITED ✓

  try {
    await fetch('/api/auth/logout', { method: 'POST' });  // ← ada await
  } catch {
    console.warn('[AuthService] Server-side logout failed (best-effort)');
  }
}
```

**Root Cause 1 — Missing error propagation (UTAMA)**: `fetch` di-await secara teknis, tetapi
blok `catch` menelan error tanpa propagasi. Jika fetch gagal (network error), caller
(`handleLogout`) tidak tahu bahwa cookie belum dihapus — tidak ada mekanisme retry atau
fallback yang menginformasikan user.

**Root Cause 2 — Tidak memeriksa `res.ok`**: `logout()` tidak memeriksa apakah respons HTTP
sukses. Jika server mengembalikan 500, cookie tetap tidak dihapus padahal tidak ada error
yang dilempar ke caller.

**Root Cause 3 — Race condition di `handleLogout()`**: Di `useAccountDropdown.ts`, setelah
`await logout()`, `router.push('/')` dipanggil. Next.js `router.push()` dapat memicu
prefetch/request sebelum browser sepenuhnya memproses Set-Cookie dari respons `/api/auth/logout`.
Pada koneksi lambat ini menciptakan window kecil di mana cookie lama masih terbaca.

**Root Cause 4 — `signOut()` dijalankan sebelum cookie dihapus**: Urutan saat ini adalah
`signOut(auth)` → `fetch('/api/auth/logout')`. Jika fetch gagal setelah `signOut`, state
Firebase sudah bersih di client tapi cookie masih ada — inilah kondisi bug yang tepat.

---

## Correctness Properties

Property 1: Bug Condition — Cookie `__session` Dihapus Setelah Logout

_For any_ request context di mana `isBugCondition(X)` bernilai `true` (Firebase user sudah
`null` tetapi cookie `__session` masih ada dan belum expired), fungsi `logout()` yang sudah
diperbaiki SHALL memastikan cookie `__session` tidak ada di browser setelah proses logout
selesai, sehingga `proxy.ts` mengevaluasi `isAuthenticated = false` pada request berikutnya.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation — Perilaku Non-Logout Tidak Berubah

_For any_ request context di mana `isBugCondition(X)` bernilai `false` (user terautentikasi
penuh dengan cookie valid, atau user yang belum pernah login sama sekali), semua fungsi yang
dimodifikasi SHALL menghasilkan perilaku identik dengan versi aslinya, menjaga semua alur
autentikasi dan route protection yang sudah bekerja.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

---

## Fix Implementation

### Changes Required

Asumsi root cause analysis benar, diperlukan dua perubahan:

---

**File**: `features/auth/services/authService.ts`

**Function**: `logout()`

**Specific Changes**:

1. **Parallelkan signOut dan fetch**: Jalankan keduanya secara bersamaan dengan
   `Promise.allSettled()` agar waktu total logout lebih singkat dan mengurangi window
   race condition.

2. **Periksa respons fetch**: Setelah fetch selesai, periksa `res.ok`. Jika `false`, lempar
   error agar caller tahu cookie mungkin belum dihapus.

3. **Propagate network error**: Hapus silent `catch` yang menelan network error. Biarkan
   error dipropagasi ke caller sehingga `handleLogout()` bisa menanganinya secara sadar.

**Pseudocode implementasi:**

```
FUNCTION logout()
  [signOutResult, fetchResult] ← await Promise.allSettled([
    signOut(auth),
    fetch('/api/auth/logout', { method: 'POST' })
  ])

  IF signOutResult.status = 'rejected' THEN
    THROW signOutResult.reason   // Firebase signOut gagal — rare, tapi harus dihandle
  END IF

  IF fetchResult.status = 'rejected' THEN
    LOG warn '[AuthService] Cookie logout failed (network error)'
    THROW new Error('Cookie logout failed')
  END IF

  IF NOT fetchResult.value.ok THEN
    LOG warn '[AuthService] Cookie logout returned non-ok status'
    THROW new Error('Cookie logout returned non-ok status')
  END IF
END FUNCTION
```

---

**File**: `features/profile/hooks/useAccountDropdown.ts`

**Function**: `handleLogout()`

**Specific Changes**:

4. **Tangkap error dari `logout()` secara eksplisit**: Karena `logout()` sekarang dapat
   melempar error, `handleLogout()` harus menangkapnya, log ke konsol, dan tetap mengarahkan
   user ke `/` (graceful degradation di sisi UI) — tapi jangan diam saja.

5. **Pastikan `isLoggingOut` selalu di-reset**: Tambahkan blok `finally` untuk memastikan
   `setIsLoggingOut(false)` selalu dipanggil.

**Pseudocode implementasi:**

```
FUNCTION handleLogout()
  setIsLoggingOut(true)
  TRY
    await logout()
  CATCH error
    LOG error '[handleLogout] Logout gagal:', error
    // Tetap lanjutkan — user sudah di-signOut dari Firebase
  FINALLY
    setIsLoggingOut(false)
  END TRY
  close()
  router.push('/')
END FUNCTION
```

---

## Testing Strategy

### Validation Approach

Strategi dua fase: pertama, tulis test yang membuktikan bug pada kode **sebelum** diperbaiki
(exploratory), kemudian verifikasi bahwa fix bekerja (fix checking) dan tidak merusak alur
lain (preservation checking).

---

### Exploratory Bug Condition Checking

**Goal**: Konfirmasi root cause dengan menjalankan test pada kode yang BELUM diperbaiki.
Observasi kegagalan akan memvalidasi atau meruntuhkan hipotesis.

**Test Plan**: Mock `fetch` agar gagal (network error) setelah `signOut()` berhasil. Verifikasi
bahwa versi `logout()` saat ini tidak melempar error sehingga caller tidak tahu cookie
belum dihapus.

**Test Cases**:

1. **`logout()` — fetch gagal, tidak ada error yang dilempar** _(akan PASS pada unfixed code,
   membuktikan bahwa caller tidak pernah tahu)_: Mock `fetch` agar throw. Panggil `logout()`.
   Assert: tidak ada exception. Ini adalah bukti bug — silent failure.

2. **`logout()` — fetch returns 500, tidak ada error yang dilempar** _(akan PASS pada unfixed
   code, membuktikan ketiadaan pemeriksaan `res.ok`)_: Mock `fetch` agar return `{ ok: false,
   status: 500 }`. Panggil `logout()`. Assert: tidak ada exception.

3. **`handleLogout()` — `router.push()` dipanggil sebelum cookie dihapus** _(race condition)_:
   Mock `fetch` dengan delay artifisial. Jalankan `handleLogout()`. Assert: `router.push()`
   dipanggil sebelum fetch resolve — membuktikan race condition.

4. **`proxy()` — cookie ada setelah logout** _(membuktikan dampak bug)_: Buat mock request
   dengan cookie `__session` yang valid. Assert: `proxy()` mengembalikan `isAuthenticated =
   true` meski user sudah logout di Firebase.

**Expected Counterexamples**:

- `logout()` diam saja saat fetch gagal — tidak ada error, tidak ada retry, cookie tersisa
- `handleLogout()` tidak menunggu penghapusan cookie sebelum navigasi — race condition
  terkonfirmasi

---

### Fix Checking

**Goal**: Verifikasi bahwa untuk semua input di mana `isBugCondition(X)` benar, fungsi yang
sudah diperbaiki menghasilkan perilaku yang benar.

**Pseudocode:**

```
FOR ALL X WHERE isBugCondition(X) DO
  result ← logout_fixed()
  ASSERT cookie __session ABSENT in browser after result
  ASSERT isAuthenticated(next_request) = false
  ASSERT proxy(next_request) ALLOWS redirect_to_login FOR protected_routes
  ASSERT proxy(next_request) ALLOWS access_to_login_page
END FOR
```

---

### Preservation Checking

**Goal**: Verifikasi bahwa untuk semua input di mana `isBugCondition(X)` tidak benar,
fungsi yang diperbaiki menghasilkan hasil yang sama dengan versi asli.

**Pseudocode:**

```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT logout_original(X) behaves same as logout_fixed(X)
  ASSERT proxy_original(X.request) = proxy_fixed(X.request)
END FOR
```

**Testing Approach**: Property-based testing direkomendasikan untuk preservation checking
karena:
- Men-generate banyak kombinasi state (user terautentikasi, belum login, cookie expired)
- Menangkap edge case yang terlewat oleh unit test manual
- Memberikan jaminan kuat bahwa perilaku non-logout tidak berubah

**Test Plan**: Observasi perilaku pada kode unfixed untuk user terautentikasi normal, lalu
tulis property-based test yang memverifikasi perilaku tetap sama setelah fix.

**Test Cases**:

1. **Login flow preservation**: Verifikasi `loginWithEmail()` dan `loginWithGoogle()` tetap
   menyimpan cookie `__session` dan tidak terpengaruh oleh perubahan di `logout()`.
2. **Protected route access preservation**: Verifikasi `proxy()` tetap mengizinkan akses
   untuk user dengan cookie valid setelah fix diterapkan.
3. **Auth route redirect preservation**: Verifikasi `proxy()` tetap meredirect user dengan
   cookie valid dari `/login` ke `/`.
4. **Expired cookie preservation**: Verifikasi `proxy()` tetap menolak cookie yang kedaluwarsa.
5. **`AuthProvider` state preservation**: Verifikasi `onAuthStateChanged` tetap memperbarui
   `AuthContextValue` dengan benar untuk login dan logout.

---

### Unit Tests

- Test `logout()` melempar error saat `fetch` gagal dengan network error (setelah fix)
- Test `logout()` melempar error saat server mengembalikan status non-ok (setelah fix)
- Test `logout()` berhasil saat `signOut()` dan `fetch()` keduanya sukses (happy path)
- Test `handleLogout()` tetap memanggil `router.push('/')` meski `logout()` throw (graceful)
- Test `handleLogout()` selalu me-reset `isLoggingOut` ke `false` via `finally`
- Test `proxy()` mengembalikan `isAuthenticated = false` saat tidak ada cookie

### Property-Based Tests

- Untuk setiap kombinasi (fetch success/fail, signOut success/fail), verifikasi bahwa state
  akhir konsisten — jika ada error, selalu dilempar ke caller (tidak pernah ditelan diam-diam)
- Untuk setiap request dengan cookie valid dan belum expired, verifikasi `proxy()` selalu
  mengembalikan `isAuthenticated = true` (tidak berubah dari perilaku asli)
- Untuk setiap request tanpa cookie atau dengan cookie expired, verifikasi `proxy()` selalu
  mengembalikan `isAuthenticated = false`

### Integration Tests

- Test full logout flow: tekan "Keluar" → `signOut()` berhasil → fetch berhasil → cookie
  dihapus → navigasi ke `/` → akses `/login` berhasil (tidak ada redirect ke `/`)
- Test logout dengan fetch gagal: cookie tidak ada di Firebase, user tetap diarahkan ke `/`,
  warning di konsol tersedia, tidak ada crash UI
- Test bahwa setelah logout berhasil, akses ke `/leaderboard` meredirect ke `/login?redirect=...`
- Test bahwa login ulang setelah logout berjalan normal dan cookie baru disimpan
