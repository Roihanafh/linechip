# Requirements Document

## Introduction

Modul Firebase Authentication adalah fitur inti yang mengamankan platform edukasi LineChip. Modul ini menghubungkan UI login/registrasi yang sudah ada dengan backend Firebase Authentication dan Cloud Firestore, menyediakan manajemen sesi pengguna end-to-end, kontrol akses berbasis peran (siswa vs. admin), serta proteksi route di sisi server maupun klien.

Modul dibangun menggunakan arsitektur **feature-based** di dalam `features/auth/` sehingga tidak ada Firebase logic yang tersebar langsung di komponen UI. Firebase Authentication menangani identitas, Cloud Firestore menyimpan profil pengguna yang diperkaya, Firebase Admin SDK memverifikasi token di server, dan Custom Claims menentukan peran (`user` / `admin`).

---

## Glossary

- **Auth_Module**: Keseluruhan fitur autentikasi yang diimplementasikan di `features/auth/`.
- **Firebase_Auth**: Layanan Firebase Authentication yang mengelola identitas pengguna.
- **Firestore**: Cloud Firestore — database dokumen yang menyimpan profil pengguna.
- **Admin_SDK**: Firebase Admin SDK yang berjalan di sisi server (API Routes / Server Components).
- **Custom_Claims**: Metadata peran yang disisipkan ke dalam ID token Firebase oleh Admin SDK.
- **AuthContext**: React Context yang mendistribusikan auth state ke seluruh komponen klien.
- **AuthProvider**: Provider komponen yang membungkus aplikasi dan menyediakan AuthContext.
- **ID_Token**: JWT yang diterbitkan Firebase setelah autentikasi berhasil; diverifikasi oleh Admin_SDK.
- **Session_Cookie**: Cookie HTTP-only berumur 5 hari yang dikelola server sebagai sesi yang tahan-refresh.
- **Middleware**: Next.js middleware (`middleware.ts`) yang memproteksi rute sebelum request sampai ke halaman.
- **Protected_Route**: Rute yang hanya dapat diakses oleh pengguna terautentikasi (`/leaderboard`, `/game-virus`, `/intline-run`, `/garis-bilangan`, `/materi`, dll.).
- **Admin_Route**: Rute yang hanya dapat diakses oleh pengguna dengan peran `admin` (mis. `/admin/*`).
- **User_Profile**: Dokumen Firestore di koleksi `users/{uid}` yang menyimpan data profil pengguna.
- **Role**: Nilai string `'user'` atau `'admin'` yang tercatat dalam Custom_Claims dan User_Profile.
- **LoginClient**: Komponen UI yang sudah ada di `app/login/LoginClient.tsx` — tidak dirombak ulang.
- **RegisterClient**: Komponen UI yang sudah ada di `app/register/RegisterClient.tsx` — tidak dirombak ulang.
- **AuthService**: Layer service di `features/auth/services/` yang mengabstraksi semua panggilan Firebase_Auth dan Firestore.
- **useAuth**: Custom hook di `features/auth/hooks/` yang mengekspos auth state dari AuthContext ke komponen.
- **PasswordResetFlow**: Alur pengiriman email reset kata sandi via Firebase_Auth.

---

## Requirements

### Requirement 1: Inisialisasi dan Konfigurasi Firebase

**User Story:** Sebagai developer, saya ingin Firebase SDK dikonfigurasi secara terpusat dan aman, agar semua bagian aplikasi menggunakan satu instance yang sama tanpa kebocoran konfigurasi ke klien yang tidak berwenang.

#### Acceptance Criteria

1. THE Auth_Module SHALL menyediakan satu file inisialisasi Firebase klien di `features/auth/services/firebase.client.ts` yang mengekspor instance `FirebaseApp`, `Auth`, dan `Firestore`.
2. THE Auth_Module SHALL menyediakan satu file inisialisasi Firebase Admin SDK di `features/auth/services/firebase.admin.ts` yang hanya diimpor dari Server Components dan API Routes.
3. WHEN variabel lingkungan Firebase tidak terdefinisi saat aplikasi dimulai, THEN THE Auth_Module SHALL melempar error yang menyebutkan nama variabel yang hilang dan menghentikan inisialisasi sebelum objek Firebase apapun dibuat.
4. THE Auth_Module SHALL membaca konfigurasi Firebase dari variabel lingkungan dengan prefix `NEXT_PUBLIC_` untuk klien dan tanpa prefix untuk server, sesuai konvensi Next.js.
5. THE Auth_Module SHALL menggunakan pola singleton sehingga fungsi `initializeApp` Firebase hanya dipanggil tepat satu kali per proses selama siklus hidup aplikasi, dan panggilan berikutnya mengembalikan instance yang sudah ada.
6. IF `features/auth/services/firebase.admin.ts` diimpor dari Client Component, THEN THE Auth_Module SHALL melempar error yang mengindikasikan bahwa modul Admin SDK tidak boleh digunakan di sisi klien.
7. IF variabel lingkungan Firebase terdefinisi tetapi memiliki nilai kosong (string kosong atau hanya whitespace), THEN THE Auth_Module SHALL memperlakukannya sebagai tidak terdefinisi dan melempar error yang menyebutkan nama variabel yang tidak valid.

---

### Requirement 2: Registrasi Akun Baru dengan Email dan Password

**User Story:** Sebagai siswa baru, saya ingin mendaftarkan akun menggunakan email dan kata sandi beserta data profil saya, agar saya dapat mengakses fitur-fitur LineChip yang terproteksi.

#### Acceptance Criteria

1. WHEN pengguna mengisi formulir registrasi dengan `name` (1–100 karakter), `email` (format RFC 5322 yang valid), `password` (minimal 6 karakter), dan `school` (1–200 karakter), lalu menekan tombol daftar, THE Auth_Module SHALL memanggil `AuthService.registerWithEmail(name, email, password, school)`.
2. WHEN `AuthService.registerWithEmail` berhasil, THE Auth_Module SHALL membuat dokumen User_Profile di Firestore dengan field: `uid`, `name`, `email`, `school`, `role: 'user'`, `createdAt`, dan `updatedAt`.
3. WHEN dokumen User_Profile berhasil dibuat, THE Auth_Module SHALL mengirimkan email verifikasi ke alamat email yang terdaftar dalam waktu maksimal 30 detik.
4. IF email sudah terdaftar di Firebase_Auth, THEN THE Auth_Module SHALL mengembalikan pesan error dalam Bahasa Indonesia yang mengindikasikan bahwa email sudah digunakan dan menyarankan pengguna untuk masuk atau menggunakan email lain, tanpa mengungkapkan informasi akun lain.
5. IF `name`, `email`, `school`, atau `password` kosong atau tidak memenuhi batas karakter yang ditentukan pada kriteria 1, THEN THE Auth_Module SHALL mengembalikan pesan error per-field dalam Bahasa Indonesia yang mengindikasikan field mana yang tidak valid, dan SHALL NOT memanggil `AuthService.registerWithEmail`.
6. IF `password` kurang dari 6 karakter, THEN THE Auth_Module SHALL mengembalikan pesan error dalam Bahasa Indonesia yang mengindikasikan panjang minimum kata sandi, dan SHALL NOT memanggil `AuthService.registerWithEmail`.
7. IF `AuthService.registerWithEmail` gagal karena alasan selain duplikasi email (misalnya kegagalan jaringan atau Firestore tidak tersedia), THEN THE Auth_Module SHALL mengembalikan pesan error umum dalam Bahasa Indonesia yang mengindikasikan kegagalan registrasi dan menyarankan pengguna untuk mencoba lagi, serta SHALL NOT menyimpan data parsial di Firestore.
8. WHILE registrasi sedang diproses, THE RegisterClient SHALL menampilkan indikator loading dan menonaktifkan tombol submit hingga proses selesai atau gagal.
9. THE Auth_Module SHALL tidak menyimpan kata sandi mentah di Firestore maupun log aplikasi.
10. FOR ALL data input registrasi, THE Auth_Module SHALL melakukan sanitasi dengan menghapus karakter kontrol dan tag HTML sebelum menyimpan ke Firestore untuk mencegah injeksi data berbahaya.

---

### Requirement 3: Login dengan Email dan Password

**User Story:** Sebagai siswa yang sudah punya akun, saya ingin masuk menggunakan email dan kata sandi, agar saya dapat melanjutkan aktivitas belajar saya di LineChip.

#### Acceptance Criteria

1. WHEN pengguna mengisi email dan kata sandi lalu menekan tombol masuk, THE Auth_Module SHALL memvalidasi bahwa kolom email tidak kosong dan memiliki format email yang valid (mengandung karakter `@` dan domain), serta kolom kata sandi tidak kosong, sebelum memproses login.
2. WHEN pengguna mengisi email dan kata sandi yang valid dan menekan tombol masuk, THE Auth_Module SHALL memanggil `AuthService.loginWithEmail(email, password)`.
3. WHEN `AuthService.loginWithEmail` berhasil, THE Auth_Module SHALL memperbarui AuthContext dengan data pengguna terautentikasi dan mengarahkan pengguna ke halaman yang semula dituju (atau halaman utama jika tidak ada redirect target).
4. IF kombinasi email/kata sandi tidak cocok, THEN THE Auth_Module SHALL menampilkan pesan error dalam Bahasa Indonesia yang menginformasikan bahwa email atau kata sandi salah dan meminta pengguna memeriksa kembali, tanpa mengosongkan kolom yang telah diisi.
5. IF akun pengguna dinonaktifkan, THEN THE Auth_Module SHALL menampilkan pesan error dalam Bahasa Indonesia yang menginformasikan bahwa akun telah dinonaktifkan dan mengarahkan pengguna untuk menghubungi administrator, tanpa mengosongkan kolom yang telah diisi.
6. IF `AuthService.loginWithEmail` gagal karena layanan tidak tersedia atau koneksi terputus, THEN THE Auth_Module SHALL menampilkan pesan error dalam Bahasa Indonesia yang menginformasikan bahwa terjadi gangguan sementara dan meminta pengguna mencoba lagi, serta mempertahankan nilai input yang telah diisi.
7. WHILE proses login berlangsung, THE LoginClient SHALL menampilkan indikator loading dan menonaktifkan tombol submit hingga respons diterima atau batas waktu 10 detik tercapai.
8. WHEN login berhasil dan opsi "Ingat saya 30 hari" aktif, THE Auth_Module SHALL membuat Session_Cookie dengan masa berlaku 30 hari via endpoint API server.
9. WHEN login berhasil dan opsi "Ingat saya 30 hari" tidak aktif, THE Auth_Module SHALL membuat Session_Cookie dengan masa berlaku sesi browser (session cookie).

---

### Requirement 4: Login dengan Google OAuth

**User Story:** Sebagai siswa, saya ingin dapat masuk menggunakan akun Google saya, agar proses login lebih cepat tanpa perlu mengingat kata sandi khusus.

#### Acceptance Criteria

1. WHEN pengguna menekan tombol "Masuk dengan Akun Google", THE Auth_Module SHALL menginisiasi alur Google OAuth melalui Firebase_Auth menggunakan `GoogleAuthProvider`.
2. WHEN Google OAuth berhasil untuk pengguna baru, THE Auth_Module SHALL membuat dokumen User_Profile di Firestore dalam waktu maksimal 5 detik dengan field: `uid` (dari Firebase_Auth), `name` (dari Google account), `email` (dari Google account), `school` (string kosong sebagai nilai default), `role: 'user'`, `createdAt`, dan `updatedAt`.
3. WHEN Google OAuth berhasil untuk pengguna yang sudah terdaftar, THE Auth_Module SHALL memuat User_Profile yang ada dari Firestore dalam waktu maksimal 5 detik tanpa menimpa nilai field `name`, `school`, atau `role` yang sudah ada.
4. IF pengguna membatalkan alur Google OAuth sebelum autentikasi selesai, THEN THE Auth_Module SHALL kembali ke halaman login dengan state halaman sebelumnya dipertahankan tanpa menampilkan pesan error.
5. IF Google OAuth gagal karena error jaringan atau Firebase, THEN THE Auth_Module SHALL menampilkan pesan error dalam Bahasa Indonesia yang menginformasikan kegagalan masuk dengan Google dan meminta pengguna mencoba lagi, serta mempertahankan nilai input yang telah diisi di halaman login.
6. IF pembuatan dokumen User_Profile di Firestore gagal setelah Google OAuth berhasil, THEN THE Auth_Module SHALL mencatat error tersebut dan menampilkan pesan error dalam Bahasa Indonesia yang meminta pengguna mencoba masuk kembali, tanpa membiarkan pengguna dalam state terautentikasi tanpa profil.

---

### Requirement 5: Penyimpanan dan Pengambilan Profil Pengguna di Firestore

**User Story:** Sebagai platform, saya ingin data profil pengguna tersimpan di Firestore dan dapat diakses secara konsisten, agar fitur-fitur seperti leaderboard dan personalisasi dapat menampilkan informasi yang akurat.

#### Acceptance Criteria

1. THE Auth_Module SHALL mendefinisikan tipe `UserProfile` di `features/auth/types/` yang mencakup field: `uid: string`, `name: string`, `email: string`, `school: string`, `role: 'user' | 'admin'`, `createdAt: Timestamp`, `updatedAt: Timestamp`.
2. WHEN pengguna berhasil login, THE Auth_Module SHALL mengambil dokumen User_Profile terkini dari Firestore dalam waktu maksimal 3 detik dan menyimpannya di AuthContext.
3. IF dokumen User_Profile tidak ditemukan saat login, THEN THE Auth_Module SHALL membuat dokumen User_Profile baru dengan nilai: `uid` dari Firebase_Auth, `email` dari Firebase_Auth, `name` dari Firebase_Auth `displayName` atau string kosong jika tidak tersedia, `school` sebagai string kosong, `role: 'user'`, `createdAt` dan `updatedAt` sebagai timestamp saat ini.
4. IF `updateUserProfile` dipanggil dengan `uid` yang tidak memiliki dokumen di Firestore, THEN THE AuthService SHALL mengembalikan error yang mengindikasikan dokumen tidak ditemukan, tanpa membuat dokumen baru.
5. THE AuthService SHALL menyediakan fungsi `updateUserProfile(uid, partialProfile)` yang hanya mengizinkan pembaruan field `name`, `email`, dan `school`, serta memperbarui field `updatedAt` secara otomatis ke timestamp saat ini.
6. WHILE pengguna terautentikasi, THE Auth_Module SHALL menjaga sinkronisasi profil di AuthContext dengan dokumen Firestore menggunakan listener real-time, dengan propagasi perubahan ke AuthContext dalam waktu maksimal 5 detik setelah perubahan terjadi di Firestore.

---

### Requirement 6: Manajemen Peran dengan Custom Claims

**User Story:** Sebagai administrator platform, saya ingin dapat menetapkan peran `admin` kepada akun tertentu, agar halaman dan fitur manajemen hanya dapat diakses oleh orang yang berwenang.

#### Acceptance Criteria

1. THE Auth_Module SHALL menyediakan API Route `POST /api/auth/set-role` yang hanya dapat diakses oleh pengguna dengan Custom_Claims `role: 'admin'`, untuk menetapkan atau mengubah peran pengguna lain.
2. WHEN permintaan ke `/api/auth/set-role` diterima dengan `uid` target dan nilai `role` yang valid (salah satu dari: `'admin'` atau `'user'`), THE Admin_SDK SHALL menggunakan `setCustomUserClaims(uid, { role })` untuk memperbarui Custom_Claims pada token pengguna target.
3. WHEN `setCustomUserClaims` berhasil dieksekusi, THE Auth_Module SHALL memperbarui field `role` di dokumen User_Profile Firestore milik pengguna target agar nilainya identik dengan Custom_Claims yang baru ditetapkan.
4. WHEN ID_Token pengguna diverifikasi di server, THE Auth_Module SHALL membaca Custom_Claims dari token yang telah diverifikasi untuk menentukan peran, tanpa melakukan query tambahan ke Firestore.
5. IF pengguna yang tidak memiliki Custom_Claims `role: 'admin'` mengirimkan permintaan ke `/api/auth/set-role`, THEN THE Auth_Module SHALL mengembalikan respons HTTP 403 dengan pesan error dalam Bahasa Indonesia yang menjelaskan bahwa akses ditolak karena pengguna tidak memiliki izin admin, tanpa memproses perubahan peran apapun.
6. IF permintaan ke `/api/auth/set-role` tidak menyertakan `uid` target atau nilai `role` tidak termasuk dalam daftar peran yang valid, THEN THE Auth_Module SHALL mengembalikan respons HTTP 400 dengan pesan error dalam Bahasa Indonesia yang menjelaskan parameter yang tidak valid, tanpa memproses perubahan peran apapun.
7. IF `setCustomUserClaims` gagal dieksekusi atau pembaruan dokumen User_Profile Firestore gagal, THEN THE Auth_Module SHALL mengembalikan respons HTTP 500 dengan pesan error dalam Bahasa Indonesia, dan field `role` di Firestore SHALL tetap pada nilai sebelum permintaan diproses.

---

### Requirement 7: Proteksi Route via Next.js Middleware

**User Story:** Sebagai platform, saya ingin pengguna yang belum login otomatis diarahkan ke halaman login ketika mengakses halaman terproteksi, agar konten edukasi tidak dapat diakses tanpa autentikasi.

#### Acceptance Criteria

1. THE Middleware SHALL memproteksi route-route berikut: `/leaderboard`, `/game-virus`, `/intline-run`, `/garis-bilangan`, `/materi`, dan semua sub-route di bawahnya.
2. WHEN pengguna yang belum terautentikasi mengakses Protected_Route, THE Middleware SHALL mengarahkan pengguna ke `/login?redirect=<path_asli_yang_di-URL-encode>`, dengan panjang path asli tidak melebihi 2000 karakter.
3. WHEN pengguna yang sudah terautentikasi mengakses `/login` atau `/register`, THE Middleware SHALL mengarahkan pengguna ke halaman utama (`/`).
4. WHEN pengguna tanpa peran `admin` mengakses Admin_Route, THE Middleware SHALL mengarahkan pengguna ke halaman utama `/` dengan query parameter `error=unauthorized`.
5. THE Middleware SHALL memverifikasi keberadaan Session_Cookie dari header request untuk menentukan status autentikasi; jika Session_Cookie tidak ada atau tidak valid secara sintaksis, Middleware SHALL memperlakukan pengguna sebagai tidak terautentikasi.
6. THE Middleware SHALL menggunakan konfigurasi `matcher` di `middleware.ts` yang mengecualikan path statis seperti `/_next/`, `/favicon.ico`, `/public/`, dan file dengan ekstensi `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.ico`, `.css`, `.js`.
7. IF tidak ada Admin_Route yang dikonfigurasi, THEN THE Middleware SHALL melewati pemeriksaan admin dan tidak mengarahkan pengguna manapun berdasarkan peran.

---

### Requirement 8: Verifikasi Token Server-Side via Firebase Admin SDK

**User Story:** Sebagai platform, saya ingin setiap permintaan ke API Route yang sensitif diverifikasi di sisi server, agar data pengguna terlindungi dari akses tidak sah meskipun token klien dimanipulasi.

#### Acceptance Criteria

1. THE Admin_SDK SHALL menyediakan fungsi `verifySessionCookie(cookie: string)` di `features/auth/services/firebase.admin.ts` yang memverifikasi Session_Cookie dan mengembalikan decoded claims yang mencakup minimal `uid` (string, non-empty), `email` (string, format email valid), `role` (string, dari Custom_Claims), dan `email_verified` (boolean).
2. WHEN Session_Cookie valid, THE Admin_SDK SHALL mengembalikan objek decoded claims dalam waktu tidak lebih dari 2000ms sejak fungsi dipanggil.
3. IF Session_Cookie tidak valid, kadaluarsa, atau telah dicabut, THEN THE Admin_SDK SHALL melempar error yang tertangkap oleh API Route, yang kemudian mengembalikan respons HTTP 401 dengan body berisi pesan error yang mengindikasikan kegagalan autentikasi, tanpa mengekspos detail internal token.
4. THE Auth_Module SHALL menyediakan Higher-Order Function `withAuth(handler)` yang memverifikasi Session_Cookie dari request header atau cookie sebelum meneruskan eksekusi ke `handler`, dan Higher-Order Function `withAdminAuth(handler)` yang memverifikasi Session_Cookie dan memvalidasi bahwa `role` dalam decoded claims bernilai `"admin"` sebelum meneruskan eksekusi ke `handler`.
5. IF verifikasi di dalam `withAuth` atau `withAdminAuth` gagal, THEN THE Auth_Module SHALL mengembalikan respons HTTP 401 tanpa meneruskan eksekusi ke `handler`.
6. IF `role` dalam decoded claims bukan `"admin"` saat menggunakan `withAdminAuth`, THEN THE Auth_Module SHALL mengembalikan respons HTTP 403 tanpa meneruskan eksekusi ke `handler`.
7. WHEN API Route `POST /api/auth/session` menerima request dengan ID_Token yang valid, THE Auth_Module SHALL memverifikasi ID_Token via Admin_SDK dan mengeluarkan Session_Cookie dengan atribut `httpOnly`, masa berlaku maksimal 14 hari, dan atribut `secure` aktif pada environment production.
8. IF ID_Token yang diterima oleh `POST /api/auth/session` tidak valid atau kadaluarsa, THEN THE Auth_Module SHALL mengembalikan respons HTTP 401 dengan pesan error yang mengindikasikan token tidak valid, tanpa mengeluarkan Session_Cookie.
9. WHEN API Route `POST /api/auth/logout` dipanggil dengan Session_Cookie yang valid, THE Auth_Module SHALL menghapus Session_Cookie dari browser dan mencabut sesi Firebase terkait via Admin_SDK dalam satu operasi atomik, kemudian mengembalikan respons HTTP 200.
10. IF `POST /api/auth/logout` dipanggil tanpa Session_Cookie atau dengan Session_Cookie tidak valid, THEN THE Auth_Module SHALL tetap menghapus cookie dari browser dan mengembalikan respons HTTP 200 tanpa melempar error ke klien.

---

### Requirement 9: AuthContext dan Auth State Management di Klien

**User Story:** Sebagai developer komponen, saya ingin mengakses status autentikasi pengguna dari mana saja di pohon komponen React tanpa prop-drilling, agar komponen UI dapat bereaksi terhadap perubahan auth state secara konsisten.

#### Acceptance Criteria

1. WHEN komponen AuthProvider di-mount, THE AuthProvider SHALL berlangganan pada perubahan `onAuthStateChanged` dari Firebase_Auth dan memperbarui AuthContext secara otomatis; WHEN AuthProvider di-unmount, THE AuthProvider SHALL berhenti berlangganan dari listener tersebut.
2. THE AuthContext SHALL mengekspos nilai-nilai berikut: `user: FirebaseUser | null`, `profile: UserProfile | null`, `loading: boolean`, `error: string | null`.
3. THE useAuth hook SHALL mengembalikan nilai AuthContext dan melempar error dengan pesan yang mengindikasikan bahwa hook digunakan di luar AuthProvider jika AuthContext tidak tersedia.
4. WHILE Firebase_Auth sedang memuat state awal, THE AuthProvider SHALL mengatur `loading: true` agar komponen yang bergantung dapat menampilkan skeleton atau loading state.
5. WHEN pengguna logout, THE AuthContext SHALL mengatur `user` ke `null`, `profile` ke `null`, `error` ke `null`, dan `loading` ke `false`.
6. THE AuthProvider SHALL dipasang di level `app/layout.tsx` atau `components/AppShell.tsx` agar seluruh pohon komponen dapat mengakses AuthContext.
7. IF pengambilan User_Profile dari Firestore gagal setelah pengguna berhasil login, THEN THE AuthContext SHALL mengatur `error` ke pesan error yang deskriptif dalam Bahasa Indonesia dan `profile` ke `null`, sementara `user` tetap berisi data Firebase_Auth yang valid.

---

### Requirement 10: Logout

**User Story:** Sebagai pengguna, saya ingin dapat keluar dari akun saya dengan aman, agar sesi saya benar-benar berakhir dan tidak dapat disalahgunakan.

#### Acceptance Criteria

1. WHEN pengguna memicu aksi logout, THE Auth_Module SHALL memanggil fungsi logout yang melakukan penghapusan sesi autentikasi pada Firebase_Auth klien dan penghapusan Session_Cookie di server secara berurutan.
2. WHEN logout berhasil, THE Auth_Module SHALL mengarahkan pengguna ke halaman utama dalam waktu maksimal 2 detik sejak aksi logout dipicu.
3. WHEN logout berhasil, THE AuthContext SHALL memperbarui state `user` dan `profile` ke `null` sebelum pengalihan halaman terjadi.
4. IF penghapusan Session_Cookie di server gagal karena error jaringan, THEN THE Auth_Module SHALL tetap membersihkan state autentikasi lokal di klien, memperbarui state `user` dan `profile` ke `null`, dan mengarahkan pengguna ke halaman utama dalam waktu maksimal 2 detik.
5. WHILE proses logout sedang berlangsung, THE Auth_Module SHALL menonaktifkan tombol atau kontrol yang memicu aksi logout untuk mencegah pemanggilan ganda.

---

### Requirement 11: Reset Kata Sandi

**User Story:** Sebagai siswa yang lupa kata sandinya, saya ingin menerima email berisi tautan reset kata sandi, agar saya dapat mengakses kembali akun saya tanpa bantuan administrator.

#### Acceptance Criteria

1. WHEN pengguna menekan tautan "Lupa Kata Sandi?" di halaman login, THE Auth_Module SHALL menampilkan antarmuka input email reset kata sandi dalam waktu maksimal 1 detik.
2. WHEN pengguna memasukkan alamat email dengan format valid (mengandung karakter `@` dan domain) dan mengonfirmasi, THE Auth_Module SHALL mengirimkan permintaan reset kata sandi melalui Firebase_Auth ke alamat email tersebut.
3. IF email yang dimasukkan tidak mengandung karakter `@` atau tidak memiliki domain, THEN THE Auth_Module SHALL menampilkan pesan kesalahan format email dalam Bahasa Indonesia sebelum mengirimkan permintaan, dan permintaan reset tidak dikirim.
4. WHEN permintaan reset kata sandi berhasil dikirim (termasuk ketika email tidak terdaftar), THE Auth_Module SHALL menampilkan pesan sukses dalam Bahasa Indonesia yang menyatakan bahwa instruksi reset telah dikirim jika email terdaftar, tanpa mengonfirmasi keberadaan akun.
5. IF permintaan reset kata sandi gagal dikirim karena error Firebase selain email tidak terdaftar, THEN THE Auth_Module SHALL menampilkan pesan error dalam Bahasa Indonesia yang menyatakan bahwa pengiriman gagal dan meminta pengguna mencoba kembali, serta mempertahankan nilai email yang telah dimasukkan pada kolom input.
6. WHILE permintaan reset kata sandi sedang diproses, THE Auth_Module SHALL menonaktifkan tombol konfirmasi untuk mencegah pengiriman permintaan ganda.

---

### Requirement 12: Persistensi Sesi dan Penanganan Token Refresh

**User Story:** Sebagai pengguna yang memilih "Ingat saya", saya ingin tetap masuk meskipun menutup dan membuka kembali browser, agar saya tidak perlu login berulang kali.

#### Acceptance Criteria

1. THE Auth_Module SHALL menggunakan `browserLocalPersistence` sebagai default persistence Firebase_Auth di klien.
2. WHEN Session_Cookie mendekati kadaluarsa (kurang dari 1 hari tersisa), THE Auth_Module SHALL memperbarui Session_Cookie secara otomatis menggunakan ID_Token terbaru.
3. WHEN ID_Token kadaluarsa, THE Auth_Module SHALL mendapatkan ID_Token yang diperbarui menggunakan `getIdToken(true)` dari Firebase_Auth sebelum melakukan panggilan API yang membutuhkan autentikasi.
4. IF Session_Cookie tidak ada, tidak valid secara sintaksis, atau telah dicabut oleh admin, THEN THE Middleware SHALL memperlakukan pengguna sebagai tidak terautentikasi dan mengeluarkan satu respons redirect ke `/login`.
5. THE Auth_Module SHALL menyediakan fungsi `getValidIdToken()` di AuthService yang mengembalikan ID_Token yang masih valid, dengan melakukan refresh otomatis menggunakan `getIdToken(true)` jika diperlukan.
6. IF `getValidIdToken()` gagal melakukan refresh token (misalnya sesi telah dicabut atau tidak ada koneksi), THEN THE Auth_Module SHALL melempar error yang mengindikasikan kegagalan refresh token, sehingga komponen pemanggil dapat menangani kondisi unauthenticated.

---

### Requirement 13: Integrasi dengan Komponen UI yang Sudah Ada

**User Story:** Sebagai developer, saya ingin Firebase logic terhubung ke LoginClient dan RegisterClient yang sudah ada tanpa merombak tampilan atau struktur komponen tersebut, agar integrasi tidak merusak desain yang sudah disetujui.

#### Acceptance Criteria

1. THE Auth_Module SHALL menyediakan callback `onSubmit` via props atau hook yang dapat dipasang ke LoginClient dan RegisterClient tanpa mengubah JSX atau styling yang ada.
2. WHEN AuthService mengembalikan error, THE Auth_Module SHALL mengonversi Firebase error code ke pesan Bahasa Indonesia: error yang berkaitan dengan field spesifik (email/password) diteruskan ke `setErrors`, sedangkan error yang bersifat umum (jaringan, server) diteruskan ke `setToast`.
3. THE Auth_Module SHALL tidak mengimpor atau memodifikasi file `LoginClient.tsx`, `RegisterClient.tsx`, `AuthShared.tsx`, `LoginRightPanel.tsx`, atau `RegisterRightPanel.tsx` secara langsung.
4. THE Auth_Module SHALL menyediakan hook `useLoginForm()` dan `useRegisterForm()` di `features/auth/hooks/` yang mengabstraksi semua logika submission, loading, dan error agar dapat dikonsumsi oleh LoginClient dan RegisterClient.
5. WHEN hook `useLoginForm()` atau `useRegisterForm()` digunakan, THE Auth_Module SHALL mengembalikan objek dengan tipe berikut: `{ onSubmit: (...args) => Promise<void>, loading: boolean, errors: Record<string, string>, toast: { message: string; type: 'success' | 'error' } | null }`.
6. WHILE `loading` bernilai `true` pada hook `useLoginForm()` atau `useRegisterForm()`, THE Auth_Module SHALL mengabaikan panggilan tambahan ke `onSubmit` untuk mencegah pengiriman form ganda.

---

### Requirement 14: Struktur Kode Feature-Based dan Tanpa Redundancy

**User Story:** Sebagai developer, saya ingin modul autentikasi terorganisir dalam struktur feature-based yang jelas, agar mudah di-maintain, di-test, dan dikembangkan di masa depan tanpa duplikasi kode.

#### Acceptance Criteria

1. THE Auth_Module SHALL menggunakan struktur direktori berikut secara konsisten:
   ```
   features/auth/
   ├── services/         # Firebase client & admin init, AuthService functions
   ├── hooks/            # useAuth, useLoginForm, useRegisterForm
   ├── context/          # AuthContext, AuthProvider
   ├── types/            # UserProfile, AuthUser, AuthError types
   └── utils/            # Error code mapping, token helpers
   ```
2. THE Auth_Module SHALL tidak menempatkan panggilan Firebase SDK secara langsung di dalam file komponen React (`components/` atau `app/`).
3. THE Auth_Module SHALL mengekspor semua public API melalui satu barrel file `features/auth/index.ts`.
4. THE AuthService SHALL menyediakan fungsi-fungsi murni yang dapat di-mock dalam unit test tanpa ketergantungan pada DOM atau React.
5. THE Auth_Module SHALL mendefinisikan semua Firebase error code yang relevan di `features/auth/utils/errorMessages.ts` beserta terjemahan Bahasa Indonesia-nya.

---

### Requirement 15: Error Handling dan Feedback Pengguna

**User Story:** Sebagai siswa, saya ingin mendapatkan pesan yang jelas dan dalam Bahasa Indonesia ketika terjadi kesalahan saat login atau registrasi, agar saya tahu apa yang harus dilakukan selanjutnya.

#### Acceptance Criteria

1. THE Auth_Module SHALL memetakan semua Firebase Authentication error code yang relevan ke pesan Bahasa Indonesia yang deskriptif.
2. WHEN terjadi error jaringan selama operasi autentikasi, THE Auth_Module SHALL menampilkan pesan: *"Tidak dapat terhubung ke server. Periksa koneksi internet Anda."*
3. WHEN terjadi error yang tidak dikenali, THE Auth_Module SHALL menampilkan pesan fallback: *"Terjadi kesalahan yang tidak terduga. Coba lagi atau hubungi dukungan."* dan mencatat detail error ke console (development) atau layanan logging (production).
4. IF pengguna mencoba operasi autentikasi lebih dari 5 kali berturut-turut dan gagal, THEN THE Auth_Module SHALL menampilkan pesan: *"Terlalu banyak percobaan. Coba lagi dalam beberapa menit."*
5. THE Auth_Module SHALL menggunakan komponen `Toast` yang sudah ada di `components/auth/AuthShared.tsx` untuk menampilkan notifikasi sukses dan error.
