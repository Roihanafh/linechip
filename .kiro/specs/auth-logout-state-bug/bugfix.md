# Bugfix Requirements Document

## Introduction

Setelah user melakukan logout, sistem masih menganggap user tersebut dalam keadaan terautentikasi. Dampaknya:
- Halaman-halaman yang seharusnya terproteksi (leaderboard, game, garis bilangan, dll.) tetap dapat diakses tanpa login ulang.
- Tombol "Masuk" di Navbar tidak muncul kembali — digantikan avatar user yang sudah logout.
- Navigasi ke `/login` diredirect kembali ke beranda karena `proxy` masih membaca `__session` cookie yang seharusnya sudah dihapus.

Bug ini berpangkal pada ketidakkonsistenan antara dua lapisan autentikasi: Firebase client-side (`onAuthStateChanged`) dan sesi berbasis cookie (`__session`) yang digunakan oleh `proxy.ts` untuk route protection.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN user menekan tombol "Keluar" dan `logout()` berhasil memanggil `signOut(auth)` THEN sistem tidak memanggil `/api/auth/logout` secara andal sehingga cookie `__session` tidak selalu dihapus dari browser

1.2 WHEN cookie `__session` masih ada di browser setelah logout THEN `proxy.ts` mendekode cookie tersebut secara optimistik dan menganggap user masih terautentikasi (`isAuthenticated = true`)

1.3 WHEN `proxy.ts` menganggap user terautentikasi THEN redirect ke `/login` tidak terjadi saat user mencoba mengakses protected route

1.4 WHEN `proxy.ts` menganggap user terautentikasi dan user mencoba mengakses `/login` THEN sistem meredirect user kembali ke beranda (`/`) sehingga user tidak bisa login ulang

1.5 WHEN Firebase `onAuthStateChanged` mengembalikan `null` (user sudah logout di sisi client) THEN `AuthContext` sudah merefleksikan `user: null`, tetapi tampilan Navbar dan akses route masih bergantung pada cookie yang belum dibersihkan

### Expected Behavior (Correct)

2.1 WHEN user menekan tombol "Keluar" THEN sistem SHALL memanggil `/api/auth/logout` dan menunggu respons sebelum melanjutkan redirect, memastikan cookie `__session` sudah dihapus dari browser

2.2 WHEN `/api/auth/logout` berhasil menghapus cookie `__session` THEN `proxy.ts` SHALL tidak lagi menemukan cookie valid sehingga `isAuthenticated` menjadi `false`

2.3 WHEN `isAuthenticated` menjadi `false` setelah logout THEN sistem SHALL memblokir akses ke protected routes dan meredirect ke `/login` dengan parameter `redirect`

2.4 WHEN user yang sudah logout mencoba mengakses `/login` THEN sistem SHALL menampilkan halaman login tanpa meredirect (tidak ada cookie valid → `isAuthenticated = false`)

2.5 WHEN `signOut(auth)` berhasil namun `fetch('/api/auth/logout')` gagal THEN sistem SHALL tetap melanjutkan proses logout sisi client (graceful degradation) sambil me-log error, namun cookie HARUS tetap dihapus pada pemanggilan berikutnya

### Unchanged Behavior (Regression Prevention)

3.1 WHEN user yang belum pernah login mengakses protected route THEN sistem SHALL CONTINUE TO meredirect ke `/login` dengan parameter `redirect` yang sesuai

3.2 WHEN user yang sedang login mengakses halaman yang sudah terproteksi THEN sistem SHALL CONTINUE TO mengizinkan akses tanpa interupsi

3.3 WHEN user berhasil login melalui email/password atau Google THEN sistem SHALL CONTINUE TO menyimpan `__session` cookie dan user dapat mengakses protected routes

3.4 WHEN `AuthProvider` mendeteksi perubahan `onAuthStateChanged` (login/logout/re-auth) THEN sistem SHALL CONTINUE TO memperbarui `AuthContextValue` secara real-time sesuai state Firebase

3.5 WHEN user yang sudah login mengakses `/login` atau `/register` THEN sistem SHALL CONTINUE TO meredirect ke beranda (`/`) karena cookie `__session` masih valid

3.6 WHEN `proxy.ts` mendekode cookie yang sudah kedaluwarsa (exp ≤ Date.now()/1000) THEN sistem SHALL CONTINUE TO memperlakukan user sebagai tidak terautentikasi

---

## Bug Condition (Pseudocode)

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type RequestContext
  OUTPUT: boolean

  // Bug terpicu ketika user sudah logout dari Firebase client
  // TETAPI cookie __session masih ada dan belum expired di browser
  RETURN X.firebaseUser = null
    AND X.sessionCookie IS NOT NULL
    AND X.sessionCookie.exp > Date.now() / 1000
END FUNCTION
```

**Property: Fix Checking**
```pascal
FOR ALL X WHERE isBugCondition(X) DO
  result ← proxy(X.request)
  // Cookie harus sudah dihapus, route protection harus benar
  ASSERT X.sessionCookie ABSENT AFTER logout
  ASSERT isAuthenticated(X.request) = false
  ASSERT result ALLOWS redirect_to_login FOR protected_routes
  ASSERT result ALLOWS access_to_login_page
END FOR
```

**Property: Preservation Checking**
```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  // User terautentikasi penuh (Firebase + cookie valid) atau belum login sama sekali
  ASSERT proxy(X.request) = proxy_original(X.request)
END FOR
```
