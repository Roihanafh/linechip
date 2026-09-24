# Requirements Document

## Introduction

Fitur **Admin User Management** melengkapi dashboard admin yang sudah ada dengan kemampuan tambahan untuk membuat akun pengguna baru secara manual dan otomatisasi redirect berbasis peran saat login berhasil. Admin saat ini dapat melihat, menonaktifkan, mengaktifkan kembali, dan menghapus akun pengguna melalui `/admin/users` dan `/admin/users/[uid]`, tetapi tidak dapat membuat akun baru. Selain itu, saat pengguna dengan role `admin` login melalui halaman `/login`, mereka harus diarahkan otomatis ke `/admin` alih-alih ke halaman utama `/`.

Fitur ini menambahkan:

1. **Admin-Created User Registration** — endpoint API dan UI untuk admin membuat akun pengguna baru dengan email, password, nama, dan sekolah.
2. **Role-Based Login Redirect** — logika redirect otomatis saat login berhasil: admin → `/admin`, pengguna biasa → `/`.

Semua operasi tetap dilindungi dengan `withAdminAuth` di sisi server. Dashboard menggunakan pola yang sama dengan fitur admin-dashboard yang sudah ada: Next.js App Router, Server Components untuk data fetching, dan Client Components untuk interaksi.

---

## Glossary

- **Admin_User_Management**: Modul tambahan di Admin_Dashboard yang mencakup pembuatan akun pengguna baru oleh admin dan redirect berbasis peran saat login.
- **Create_User_Form**: Formulir pada halaman `/admin/users/new` tempat admin memasukkan email, password (sementara), nama, dan sekolah untuk membuat akun pengguna baru.
- **Admin_Created_Account**: Akun pengguna yang dibuat melalui Admin_User_Management; selalu memiliki `role: "user"`, tidak pernah `role: "admin"`.
- **Temporary_Password**: Password awal yang ditetapkan oleh admin saat pembuatan akun; pengguna diharapkan mengubahnya setelah login pertama (tidak ditegakkan secara teknis di MVP, hanya rekomendasi UX).
- **Role_Based_Redirect**: Mekanisme yang memeriksa `role` dari profil pengguna setelah login berhasil dan mengarahkan ke `/admin` jika `role === "admin"`, atau ke `/` untuk `role === "user"`.
- **Admin_Seed_Script**: Script `scripts/seed-admin.ts` yang sudah ada; digunakan untuk membuat akun admin pertama menggunakan Firebase Admin SDK.
- **withAdminAuth**: Higher-order function middleware yang sudah ada di `features/auth/services/firebase.admin.ts` untuk memverifikasi session cookie dan memastikan `role === "admin"` sebelum memproses request di API routes.
- **UserProfile**: Dokumen Firestore di koleksi `users/{uid}` dengan field: `uid`, `name`, `email`, `school`, `photoURL`, `role`, `totalScore`, `createdAt`, `updatedAt`, `disabled`.
- **Firebase_Auth_Account**: Akun autentikasi yang dikelola oleh Firebase Authentication; diciptakan menggunakan Firebase Admin SDK (`createUser`) atau Firebase Client SDK (`createUserWithEmailAndPassword`).
- **Admin_Dashboard**: Sistem dashboard admin yang sudah ada di `/admin/*` dengan route guard berbasis session cookie.
- **User_Management_Page**: Halaman `/admin/users` yang sudah ada; menampilkan tabel semua pengguna dengan pagination.
- **Create_User_Button**: Tombol "Buat Pengguna Baru" pada User_Management_Page yang menavigasi ke `/admin/users/new`.

---

## Requirements

### Requirement 1: Admin-Created User Registration — UI & Navigation

**User Story:** Sebagai admin, saya ingin dapat membuat akun pengguna baru langsung dari dashboard admin, sehingga saya tidak perlu meminta pengguna untuk mendaftar sendiri atau mengakses Firebase Console secara manual.

#### Acceptance Criteria

1. WHEN admin mengakses `/admin/users`, THE User_Management_Page SHALL menampilkan tombol "Buat Pengguna Baru" di bagian atas tabel daftar pengguna, yang dapat diklik untuk menavigasi ke `/admin/users/new`.
2. WHEN admin mengakses `/admin/users/new`, THE Create_User_Form SHALL menampilkan empat field input: email (type=email), password sementara (type=password dengan toggle visibility), nama lengkap (type=text), dan sekolah (type=text), beserta tombol "Buat Akun" dan link "Batal" yang kembali ke `/admin/users`.
3. THE Create_User_Form SHALL memvalidasi setiap field sebelum submit: email harus cocok dengan pola `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, password minimal 6 karakter dan maksimal 128 karakter, nama lengkap tidak boleh kosong setelah di-trim dan maksimal 100 karakter, sekolah tidak boleh kosong setelah di-trim dan maksimal 100 karakter, dan SHALL menampilkan pesan error spesifik di bawah masing-masing field yang tidak valid tanpa mengirim request ke server.
4. WHEN admin mengisi semua field dengan valid dan mengklik "Buat Akun", THE Create_User_Form SHALL menonaktifkan semua field dan tombol, menampilkan indikator loading pada tombol "Buat Akun", dan mengirim request `POST /api/admin/users` dengan body JSON berisi `{ email, password, name, school }`.
5. IF pembuatan akun berhasil (respons HTTP 2xx), THEN THE Create_User_Form SHALL menampilkan pesan sukses yang menyebutkan email pengguna yang baru dibuat dan secara otomatis menavigasi kembali ke `/admin/users` setelah 2000 ms.
6. IF server mengembalikan respons HTTP 400, THEN THE Create_User_Form SHALL menampilkan pesan error dari body respons API di bawah field email, mengaktifkan kembali semua field dan tombol, dan mempertahankan nilai semua field yang telah diisi tanpa mereset.
7. IF server mengembalikan respons HTTP 500 atau tidak ada respons dalam 10000 ms, THEN THE Create_User_Form SHALL menampilkan pesan error "Gagal membuat akun. Silakan coba lagi." di atas tombol "Buat Akun", mengaktifkan kembali semua field dan tombol, dan mempertahankan nilai semua field yang telah diisi tanpa mereset.

---

### Requirement 2: Admin-Created User Registration — API Endpoint

**User Story:** Sebagai sistem, saya ingin API endpoint yang aman dan terotorisasi untuk admin membuat akun pengguna baru, sehingga semua operasi pembuatan akun terpusat dan terlindungi.

#### Acceptance Criteria

1. THE endpoint `POST /api/admin/users` SHALL dilindungi dengan `withAdminAuth` dan SHALL mengembalikan respons 401 jika pemohon tidak menyertakan session cookie yang valid atau tidak memiliki `role: "admin"`.
2. WHEN endpoint menerima request dengan body JSON, THE endpoint SHALL memvalidasi: email harus sesuai format, password minimal 6 karakter dan maksimal 256 karakter, name dan school minimal 1 karakter setelah trim.
3. IF validasi gagal, THEN THE endpoint SHALL mengembalikan respons 400 dengan body `{ error: string }` yang mendeskripsikan field mana yang tidak valid, tanpa memanggil Firebase Admin SDK.
4. WHEN validasi berhasil, THE endpoint SHALL membuat akun Firebase Auth baru dengan email, password, dan displayName yang diberikan, lalu menetapkan custom claim `role: "user"` pada akun tersebut.
5. WHEN akun Firebase Auth berhasil dibuat, THE endpoint SHALL membuat dokumen Firestore `users/{uid}` dengan field: `uid`, `name` (setelah sanitize), `email`, `school` (setelah sanitize), `role: "user"`, `totalScore: 0`, `disabled: false`, `createdAt`, `updatedAt`.
6. IF email yang diberikan sudah terdaftar di Firebase Auth, THEN THE endpoint SHALL mengembalikan respons 400 dengan body `{ error: 'Email sudah terdaftar. Gunakan email yang berbeda.' }` tanpa membuat dokumen Firestore apapun.
7. IF Firebase Auth gagal membuat akun karena alasan selain email duplikat, THEN THE endpoint SHALL mengembalikan respons 500 dengan body `{ error: 'Gagal membuat akun pengguna. Silakan coba lagi.' }` tanpa membuat dokumen Firestore apapun.
8. IF pembuatan dokumen Firestore gagal setelah akun Firebase Auth berhasil dibuat, THEN THE endpoint SHALL mencoba menghapus akun Firebase Auth yang baru saja dibuat sebagai rollback, dan SHALL mengembalikan respons 500 dengan body `{ error: 'Gagal membuat akun pengguna. Silakan coba lagi.' }` terlepas dari berhasil tidaknya rollback.
9. WHEN pembuatan akun dan dokumen Firestore berhasil, THE endpoint SHALL mengembalikan respons 201 dengan body `{ ok: true, uid: string, email: string }`.
10. THE endpoint SHALL mencatat semua error ke console dan SHALL tidak menyertakan stack trace, nama file, atau detail implementasi internal dalam body respons error yang dikirim ke klien.

---

### Requirement 3: Role-Based Login Redirect

**User Story:** Sebagai admin, saya ingin diarahkan langsung ke dashboard admin setelah login berhasil, sehingga saya tidak perlu secara manual menavigasi dari halaman utama ke `/admin`.

#### Acceptance Criteria

1. WHEN pengguna berhasil login melalui `/login` (baik email/password maupun Google OAuth), THE login handler SHALL membaca dokumen Firestore `users/{uid}` untuk mendapatkan field `role` setelah session cookie berhasil dibuat.
2. IF `role === "admin"` dan tidak ada query parameter `?redirect` yang merujuk ke path yang diawali `/admin`, THEN THE login handler SHALL mengarahkan pengguna ke `/admin`.
3. IF `role === "admin"` dan terdapat query parameter `?redirect` yang merujuk ke path yang diawali `/admin`, THEN THE login handler SHALL mengarahkan pengguna ke URL redirect tersebut.
4. IF `role === "user"` atau `role` tidak terdefinisi, THEN THE login handler SHALL mengarahkan pengguna ke nilai `?redirect` jika ada, atau ke `/` jika tidak ada.
5. IF terdapat query parameter `?redirect` yang merujuk ke path yang diawali `/admin` dan pengguna bukan admin, THEN THE login handler SHALL mengabaikan parameter tersebut dan mengarahkan pengguna ke `/`.
6. IF pembacaan dokumen Firestore `users/{uid}` gagal atau memakan waktu lebih dari 5000 ms, THEN THE login handler SHALL memperlakukan pengguna sebagai `role: "user"` dan mengarahkan ke `/`.
7. THE role-based redirect logic SHALL diterapkan pada kedua metode login (email/password dan Google OAuth) menggunakan fungsi helper bersama yang menerima role dan redirect parameter sebagai input.

---

### Requirement 4: Admin-Created User Integration

**User Story:** Sebagai admin, saya ingin akun yang saya buat melalui dashboard muncul langsung di tabel daftar pengguna dan dapat dikelola seperti akun biasa, sehingga tidak ada perbedaan teknis antara akun yang dibuat admin dan akun yang dibuat melalui registrasi mandiri.

#### Acceptance Criteria

1. WHEN admin berhasil membuat akun pengguna baru melalui `/admin/users/new` dan diarahkan kembali ke `/admin/users`, THE User_Management_Page SHALL menampilkan baris baru untuk pengguna tersebut dengan nilai: nama, email, sekolah, totalScore=0, status=aktif, dan tanggal pembuatan yang sesuai.
2. IF akun Firebase Auth berhasil dibuat namun pembuatan dokumen Firestore gagal, THEN THE sistem SHALL menghapus akun Firebase Auth yang baru dibuat (rollback) sehingga tidak ada akun parsial yang tersisa, dan THE Create_User_Form SHALL menampilkan pesan error kepada admin.
3. THE Admin_Created_Account SHALL memiliki dokumen Firestore dengan tepat field-field berikut dan nilai awal: `uid` (string), `name` (string, dari input), `email` (string, dari input), `school` (string, dari input), `role: "user"`, `totalScore: 0`, `disabled: false`, `createdAt` (timestamp server), `updatedAt` (timestamp server).
4. THE Admin_Created_Account SHALL dapat diakses melalui `/admin/users/[uid]` untuk melihat detail profil.
5. WHEN admin mengakses `/admin/users/[uid]` untuk Admin_Created_Account, THE halaman SHALL memungkinkan admin untuk menonaktifkan atau mengaktifkan kembali akun tersebut sesuai dengan Acceptance Criteria pada Requirement yang mengatur tindakan disable/enable.
6. IF Admin_Created_Account memiliki totalScore > 0, THEN THE leaderboard SHALL menampilkan akun tersebut dalam urutan ranking yang sama seperti akun lain dengan skor yang sama, tanpa penanda visual yang membedakannya dari akun lain.
7. WHEN admin membuat akun baru melalui `/admin/users/new`, THE Overview_Page SHALL mencerminkan pertambahan `totalUsers` pada kunjungan berikutnya ke halaman tersebut.

---

### Requirement 5: Password Security & Best Practices

**User Story:** Sebagai sistem, saya ingin password sementara yang ditetapkan admin tidak ditampilkan kembali setelah akun dibuat, dan saya ingin pengguna dapat mengubah password mereka sendiri, sehingga keamanan akun terjaga.

#### Acceptance Criteria

1. WHEN admin mengakses `/admin/users/new`, THE Create_User_Form SHALL menampilkan field password dengan ikon toggle visibility yang dapat diklik untuk menampilkan atau menyembunyikan karakter password.
2. WHEN akun berhasil dibuat, THE endpoint `POST /api/admin/users` SHALL mengembalikan respons yang tidak menyertakan field password dalam body response, hanya menyertakan `ok`, `uid`, dan `email`.
3. WHEN akun berhasil dibuat, THE sistem SHALL tidak menyimpan nilai password pengguna di Firestore; password hanya dikelola oleh Firebase Auth.
4. WHEN Create_User_Form dirender, THE Admin_Dashboard SHALL menampilkan pesan informasi yang menyarankan admin untuk menyampaikan password sementara kepada pengguna melalui saluran komunikasi terpisah, serta menyarankan pengguna untuk mengubah password setelah login pertama.
5. IF pengguna yang akunnya dibuat oleh admin mengakses halaman `/login`, THEN THE halaman login SHALL menampilkan opsi "Lupa Kata Sandi" yang dapat digunakan pengguna tersebut untuk mengatur ulang password mereka secara mandiri.
6. IF admin mencoba submit Create_User_Form dengan password kurang dari 6 karakter, THEN THE Create_User_Form SHALL mencegah pengiriman request ke server dan menampilkan pesan error yang mengindikasikan bahwa password harus minimal 6 karakter.
7. IF endpoint `POST /api/admin/users` gagal membuat akun, THEN THE endpoint SHALL mengembalikan respons error tanpa menyertakan nilai password dalam body response, dan data pengguna tidak tersimpan di Firestore.

---

### Requirement 6: Input Validation & Error Handling

**User Story:** Sebagai sistem, saya ingin semua input dari admin divalidasi dan disanitasi dengan ketat, sehingga data pengguna yang dibuat konsisten dan aman dari injection atau karakter berbahaya.

#### Acceptance Criteria

1. THE endpoint `POST /api/admin/users` SHALL memanggil fungsi `sanitizeInput` (yang sudah ada di `features/auth/services/authService.ts`) pada field `name` dan `school` sebelum menyimpan ke Firestore untuk menghapus control characters dan tag HTML.
2. THE Create_User_Form SHALL memvalidasi format email menggunakan regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` di sisi klien sebelum submit, dan THE endpoint SHALL memvalidasi ulang format email di sisi server menggunakan regex yang sama sebelum memanggil Firebase Admin SDK.
3. IF field `name` atau `school` setelah trim dan sanitize menjadi string kosong, THEN THE endpoint SHALL mengembalikan respons 400 dengan body `{ error: 'Nama dan sekolah tidak boleh kosong.' }`.
4. IF field `password` memiliki panjang kurang dari 6 karakter, THEN THE endpoint SHALL mengembalikan respons 400 dengan body `{ error: 'Password harus minimal 6 karakter.' }` sebelum memanggil Firebase Admin SDK.
5. THE Create_User_Form SHALL mencegah submit ganda dengan menonaktifkan tombol "Buat Akun" dan semua field saat request sedang diproses (state `loading === true`), dan SHALL mengaktifkan kembali form hanya setelah respons diterima atau error terjadi.
6. IF Firebase Admin SDK melempar error selain `auth/email-already-in-use` (misal `auth/invalid-email` atau error jaringan), THEN THE endpoint SHALL mencatat error ke console dan mengembalikan respons 500 dengan pesan error generik tanpa mengekspos detail teknis ke klien.

---

### Requirement 7: Accessibility & UX — Create User Form

**User Story:** Sebagai admin, saya ingin formulir pembuatan pengguna dapat dioperasikan dengan keyboard dan screen reader, serta memberikan feedback visual yang jelas, sehingga antarmuka memenuhi standar aksesibilitas.

#### Acceptance Criteria

1. THE Create_User_Form SHALL menggunakan elemen `<form>` semantic dengan atribut `noValidate` untuk mencegah validasi HTML5 native dan menggunakan validasi custom yang menampilkan pesan error yang ramah pengguna.
2. WHEN field input kehilangan fokus (`onBlur`) dan berisi nilai yang tidak valid, THE Create_User_Form SHALL menampilkan pesan error spesifik di bawah field tersebut dalam waktu tidak lebih dari 100 ms dengan warna teks merah (#ef4444) dan ikon peringatan.
3. WHEN field input berisi nilai valid, THE Create_User_Form SHALL menampilkan ikon checkmark hijau (#10b981) di sebelah kanan field untuk memberikan feedback positif.
4. THE Create_User_Form SHALL dapat disubmit dengan menekan tombol Enter saat fokus berada di field manapun dalam form, dan tombol "Batal" dapat diaktifkan dengan menekan tombol Escape.
5. THE Create_User_Form SHALL menetapkan atribut `aria-invalid="true"` pada field yang memiliki error, dan `aria-describedby` yang merujuk ke elemen pesan error di bawah field tersebut agar screen reader dapat membacakan error.
6. WHEN request sedang diproses, THE Create_User_Form SHALL menampilkan spinner loading di dalam tombol "Buat Akun" beserta teks "Membuat Akun..." dan menetapkan atribut `disabled` pada tombol untuk mencegah submit ganda.
7. THE Create_User_Form SHALL menampilkan pesan sukses atau error dalam sebuah banner di bagian atas form dengan `role="alert"` dan `aria-live="polite"` agar screen reader mengumumkan pesan tersebut secara otomatis.

---

### Requirement 8: Admin Privilege Enforcement

**User Story:** Sebagai sistem, saya ingin memastikan hanya admin yang dapat membuat akun pengguna baru, dan admin tidak dapat membuat akun admin baru melalui dashboard (hanya melalui seed script), sehingga privilege admin terkontrol ketat.

#### Acceptance Criteria

1. THE endpoint `POST /api/admin/users` SHALL menggunakan `withAdminAuth` untuk memverifikasi bahwa pemohon memiliki `role: "admin"` sebelum memproses request, dan SHALL mengembalikan respons 401 atau 403 jika pemohon tidak terotorisasi.
2. THE Create_User_Form SHALL selalu menetapkan `role: "user"` pada akun yang dibuat; TIDAK ADA opsi untuk admin memilih role saat pembuatan akun (role `"admin"` hanya dapat dibuat melalui Admin_Seed_Script atau Firebase Console).
3. IF admin mencoba membuat akun dengan email yang sudah terdaftar sebagai admin (meskipun validasi ini tidak eksplisit diperlukan karena Firebase Auth akan menolak email duplikat), THEN THE endpoint SHALL mengembalikan error 400 dengan pesan "Email sudah terdaftar. Gunakan email yang berbeda."
4. THE Admin_Dashboard SHALL melindungi halaman `/admin/users/new` dengan route guard yang sama seperti halaman admin lainnya (via `app/admin/layout.tsx` yang sudah ada), sehingga pengguna non-admin tidak dapat mengakses formulir pembuatan pengguna.
5. THE endpoint `POST /api/admin/users` SHALL mencatat setiap percobaan pembuatan akun (berhasil maupun gagal) ke console dengan format `[POST /api/admin/users] Admin {adminUid} created user {newUid} with email {email}` atau `[POST /api/admin/users] Admin {adminUid} failed to create user: {errorReason}`.

---

### Requirement 9: Integration dengan Existing Features

**User Story:** Sebagai sistem, saya ingin fitur admin-user-management terintegrasi mulus dengan fitur admin-dashboard dan firebase-auth-module yang sudah ada, tanpa menimbulkan konflik atau duplikasi kode.

#### Acceptance Criteria

1. THE Admin_User_Management SHALL menggunakan fungsi helper yang sama dengan fitur registrasi mandiri: `sanitizeInput` dari `features/auth/services/authService.ts`, `getAdminAuth` dan `getAdminDb` dari `features/auth/services/firebase.admin.ts`, dan `validateUid` dari `lib/admin/utils.ts`.
2. THE Create_User_Form SHALL menggunakan komponen UI yang sama dengan halaman admin lainnya: `FloatingInput` (jika cocok) atau komponen input baru yang konsisten dengan desain visual dashboard, `ConfirmationDialog` tidak diperlukan karena pembuatan akun tidak destruktif.
3. THE endpoint `POST /api/admin/users` SHALL mengembalikan format error yang konsisten dengan endpoint admin lainnya: `{ error: string }` untuk error response, dan SHALL menggunakan status code HTTP yang konsisten (400 untuk validasi, 403 untuk otorisasi, 500 untuk server error).
4. THE Admin_User_Management SHALL mencatat metrik pembuatan akun di statistik Overview_Page tanpa perlu query atau agregasi tambahan (karena `totalUsers` sudah dihitung menggunakan `getCountFromServer` pada koleksi `users`).
5. THE Admin_Created_Account SHALL muncul di endpoint `GET /api/admin/users` dengan struktur `AdminUserRow` yang sama seperti akun lain, tanpa field tambahan yang menandakan akun tersebut dibuat oleh admin (tidak ada perbedaan teknis antara akun admin-created dan self-registered).

---

## Notes

- Requirement 3 (Role-Based Login Redirect) memerlukan modifikasi di `features/auth/services/authService.ts` pada fungsi `loginWithEmail` dan `loginWithGoogle`, serta `features/auth/hooks/useLoginForm.ts` untuk membaca role dari Firestore setelah session cookie dibuat.
- Requirement 2 (API Endpoint) menggunakan pola rollback yang sama dengan registrasi mandiri di `authService.ts` untuk menjaga konsistensi: jika Firestore gagal, hapus akun Auth yang baru dibuat.
- Password sementara yang ditetapkan admin tidak disimpan di Firestore dan tidak dapat dibaca kembali setelah akun dibuat; admin harus mencatat password sementara secara manual jika diperlukan untuk diberitahukan ke pengguna.
- Halaman `/admin/users/new` adalah Server Component yang merender Create_User_Form sebagai Client Component untuk handling form state, validasi, dan submit.
- Field `disabled: false` secara eksplisit diset saat pembuatan akun untuk konsistensi dengan struktur data yang sudah ada (requirement dari admin-dashboard bahwa Firestore harus memiliki field `disabled` untuk query `getCountFromServer`).
- Tidak ada fitur "kirim email otomatis dengan password sementara" di MVP ini; admin harus memberitahu pengguna password mereka secara manual.
