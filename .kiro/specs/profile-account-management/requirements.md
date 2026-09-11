# Requirements Document

## Introduction

Modul **Profile & Account Management** menambahkan kemampuan manajemen akun pengguna pada platform edukasi LineChip. Fitur ini mencakup halaman profil yang dapat diedit, upload foto profil ke Firebase Storage, alur Forgot Password via Firebase Authentication, serta integrasi account dropdown ke Navbar yang sudah ada.

Modul dibangun mengikuti arsitektur feature-based yang sudah digunakan di `features/auth/` — memisahkan UI, service layer, hooks, types, dan utilitas. Design system LineChip (custom CSS + Tailwind, palet warna `intblue`, animasi `.rise-in` / `.animate-check-pop`, komponen `FloatingInput`, `Toast`) dipakai secara konsisten. Sistem mendukung dua authentication provider: Email/Password dan Google Sign-In — dengan penanganan yang berbeda untuk masing-masing.

---

## Glossary

- **Profile_Module**: Keseluruhan fitur Profile & Account Management yang diimplementasikan di `features/profile/`.
- **Profile_Page**: Halaman di `/profile` yang menampilkan dan memungkinkan pengguna mengedit data profil.
- **Profile_Service**: Layer service di `features/profile/services/profileService.ts` yang mengabstraksi semua operasi Firestore dan Firebase Storage.
- **Storage_Service**: Layer service di `features/profile/services/storageService.ts` yang mengabstraksi operasi Firebase Storage untuk foto profil.
- **useProfile**: Custom hook yang mengelola state dan operasi profil di `features/profile/hooks/useProfile.ts`.
- **useAccountDropdown**: Custom hook yang mengelola state dropdown akun di Navbar di `features/profile/hooks/useAccountDropdown.ts`.
- **Avatar**: Representasi visual identitas pengguna — foto yang diupload, inisial nama, atau ikon fallback.
- **Fallback_Avatar**: Elemen UI yang ditampilkan ketika foto profil tidak tersedia atau gagal dimuat; menggunakan inisial nama pengguna di atas latar berwarna turunan dari `intblue`.
- **Photo_Upload**: Proses memilih, memvalidasi, mengompresi, dan mengunggah foto profil ke Firebase Storage.
- **Forgot_Password_Flow**: Alur pengiriman email reset kata sandi via Firebase Authentication, dapat diakses dari halaman `/login` maupun dari halaman profil.
- **Account_Dropdown**: Menu dropdown di Navbar yang tampil saat pengguna mengklik Avatar; berisi tautan ke Profile_Page dan tombol Logout.
- **Auth_Provider**: Authentication provider yang digunakan pengguna untuk mendaftar — nilai yang valid adalah `'password'` (Email/Password) atau `'google.com'` (Google Sign-In).
- **Password_User**: Pengguna yang terdaftar menggunakan Email/Password (Auth_Provider = `'password'`).
- **Google_User**: Pengguna yang terdaftar menggunakan Google Sign-In (Auth_Provider = `'google.com'`).
- **UserProfile**: Dokumen Firestore di koleksi `users/{uid}` — tipe yang sudah ada di `features/auth/types/index.ts`.
- **AuthContext**: React Context yang sudah ada di `features/auth/context/` yang menyediakan `user`, `profile`, `loading`, dan `error`.
- **Firebase_Auth**: Layanan Firebase Authentication — sudah ada dan dikonfigurasi di `features/auth/services/firebase.client.ts`.
- **Firestore**: Cloud Firestore — sudah ada, menyimpan dokumen `users/{uid}`.
- **Firebase_Storage**: Firebase Storage — layanan baru yang ditambahkan untuk menyimpan foto profil di `profile-photos/{uid}/avatar`.
- **Toast**: Komponen notifikasi yang sudah ada di `components/auth/AuthShared.tsx`.
- **FloatingInput**: Komponen input floating-label yang sudah ada di `components/auth/AuthShared.tsx`.
- **Navbar**: Komponen navigasi yang sudah ada di `components/Navbar.tsx`.
- **AppShell**: Wrapper yang sudah ada di `components/AppShell.tsx` yang mem-mount `AuthProvider`.

---

## Requirements

### Requirement 1: Halaman Profil — Tampilan Data Pengguna

**User Story:** Sebagai pengguna LineChip yang sudah login, saya ingin melihat data profil saya di halaman khusus, agar saya dapat mengetahui informasi akun yang tersimpan di platform.

#### Acceptance Criteria

1. THE Profile_Page SHALL dapat diakses melalui rute `/profile` dan hanya untuk pengguna yang terautentikasi; WHEN pengguna belum login mengakses `/profile`, THE Profile_Page SHALL mengarahkan pengguna ke `/login?redirect=/profile`.
2. WHEN pengguna yang terautentikasi membuka `/profile`, THE Profile_Page SHALL menampilkan data dari `UserProfile` yang tersedia di `AuthContext` dalam waktu maksimal 500ms setelah halaman dimuat.
3. THE Profile_Page SHALL menampilkan field berikut: foto profil (Avatar), nama lengkap (`name`), email (`email`), kelas & sekolah (`school`), dan tanggal bergabung (`createdAt`) yang diformat dalam format Bahasa Indonesia (mis. "12 Januari 2025").
4. THE Profile_Page SHALL menampilkan badge Auth_Provider yang menunjukkan metode login pengguna — "Email & Kata Sandi" untuk Password_User dan "Google Account" untuk Google_User.
5. WHILE `AuthContext.loading` bernilai `true`, THE Profile_Page SHALL menampilkan skeleton loading yang sesuai dengan layout halaman, mencakup placeholder Avatar, placeholder teks untuk setiap field, dan placeholder badge Auth_Provider.
6. IF `AuthContext.profile` bernilai `null` setelah loading selesai dan `AuthContext.user` tidak `null`, THEN THE Profile_Page SHALL menampilkan pesan error dalam Bahasa Indonesia yang menyatakan profil tidak dapat dimuat beserta tombol "Muat Ulang" untuk memicu refresh dari Firestore.
7. THE Profile_Page SHALL menggunakan design system LineChip yang konsisten: font `Plus Jakarta Sans`, warna `intblue` (#2F6FED) untuk aksi utama, latar `#f8fafc`, border `#e2e8f0`, dan animasi `.rise-in` untuk elemen masuk.

---

### Requirement 2: Edit Profil — Perubahan Data Teks

**User Story:** Sebagai pengguna, saya ingin mengubah nama lengkap dan kelas/sekolah saya, agar data profil saya tetap akurat.

#### Acceptance Criteria

1. THE Profile_Page SHALL menyediakan tombol "Edit Profil" yang menampilkan mode edit; WHEN mode edit aktif, field `name` dan `school` SHALL menjadi input yang dapat diedit menggunakan komponen `FloatingInput`.
2. WHEN pengguna menyimpan perubahan profil, THE Profile_Module SHALL memvalidasi bahwa `name` tidak kosong dan memiliki panjang 1–100 karakter, dan `school` tidak kosong dan memiliki panjang 1–200 karakter, sebelum memanggil `Profile_Service.updateProfile`.
3. IF validasi gagal, THEN THE Profile_Module SHALL menampilkan pesan error per-field dalam Bahasa Indonesia menggunakan pola yang konsisten dengan `FloatingInput`, dan SHALL NOT memanggil `Profile_Service.updateProfile`.
4. WHEN `Profile_Service.updateProfile` berhasil dipanggil, THE Profile_Module SHALL memperbarui field `name` dan `school` di dokumen Firestore `users/{uid}` beserta `updatedAt` sebagai timestamp saat ini.
5. WHEN pembaruan Firestore berhasil, THE Profile_Module SHALL menampilkan notifikasi sukses via komponen `Toast` dengan pesan "Profil berhasil diperbarui" dan menutup mode edit.
6. IF `Profile_Service.updateProfile` gagal karena error Firestore atau koneksi, THEN THE Profile_Module SHALL menampilkan notifikasi error via komponen `Toast` dengan pesan dalam Bahasa Indonesia dan mempertahankan nilai input yang telah diisi.
7. WHILE proses penyimpanan berlangsung, THE Profile_Page SHALL menampilkan indikator loading pada tombol simpan dan menonaktifkan semua field input untuk mencegah perubahan ganda.
8. THE Profile_Module SHALL melakukan sanitasi input `name` dan `school` dengan menghapus karakter kontrol dan tag HTML sebelum dikirim ke Firestore, menggunakan fungsi `sanitizeInput` yang sudah ada di `features/auth/services/authService.ts`.
9. THE Profile_Page SHALL menyediakan tombol "Batal" dalam mode edit yang mengembalikan semua field ke nilai awal sebelum pengeditan tanpa memanggil `Profile_Service.updateProfile`.

---

### Requirement 3: Upload dan Manajemen Foto Profil

**User Story:** Sebagai pengguna, saya ingin mengunggah foto profil saya, agar identitas visual saya di platform lebih personal.

#### Acceptance Criteria

1. THE Profile_Page SHALL menyediakan area klik/tap pada Avatar untuk membuka dialog pemilihan file foto; file yang diterima dibatasi pada tipe MIME `image/jpeg`, `image/png`, `image/webp`, dan `image/gif`.
2. IF pengguna memilih file dengan tipe MIME selain yang diizinkan, THEN THE Profile_Module SHALL menampilkan pesan error via `Toast` dalam Bahasa Indonesia yang menyebutkan format yang diizinkan, dan SHALL NOT memproses upload.
3. IF pengguna memilih file dengan ukuran lebih dari 5MB sebelum kompresi, THEN THE Profile_Module SHALL menampilkan pesan error via `Toast` dalam Bahasa Indonesia yang menyebutkan batas ukuran, dan SHALL NOT memproses upload.
4. WHEN pengguna memilih file foto yang valid, THE Profile_Module SHALL mengompresi gambar menggunakan `Canvas` API browser (tidak memerlukan library eksternal) sebelum upload, dengan target ukuran output tidak lebih dari 300KB dan dimensi maksimal 400×400 piksel dengan aspek rasio dipertahankan (cover crop ke 400×400).
5. WHEN kompresi selesai, THE Storage_Service SHALL mengupload hasil kompresi ke Firebase Storage pada path `profile-photos/{uid}/avatar` dengan Content-Type `image/jpeg`, menggantikan file sebelumnya jika ada.
6. WHILE upload berlangsung, THE Profile_Page SHALL menampilkan overlay progress pada Avatar dengan persentase upload yang dihitung dari `UploadTask.on('state_changed')` dan menonaktifkan area klik Avatar untuk mencegah upload ganda.
7. WHEN upload berhasil, THE Storage_Service SHALL mendapatkan download URL dari Firebase Storage dan THE Profile_Service SHALL memperbarui field `photoURL` di dokumen Firestore `users/{uid}` beserta `updatedAt`, lalu memperbarui tampilan Avatar dengan URL baru.
8. WHEN upload berhasil, THE Profile_Module SHALL menampilkan notifikasi sukses via `Toast` dengan pesan "Foto profil berhasil diperbarui".
9. IF upload ke Firebase Storage gagal, THEN THE Storage_Service SHALL mengembalikan pesan error dalam Bahasa Indonesia, THE Profile_Module SHALL menampilkan pesan via `Toast`, dan foto profil lama tetap ditampilkan tanpa perubahan.
10. WHEN foto profil berhasil diupload, THE Profile_Module SHALL memperbarui tampilan Avatar di Navbar melalui `AuthContext` atau state yang di-share, tanpa perlu reload halaman.
11. THE Profile_Page SHALL menampilkan Fallback_Avatar (inisial huruf pertama `name` di atas lingkaran berlatar `intblue`) ketika field `photoURL` di `UserProfile` kosong, null, atau gambar gagal dimuat karena broken link.

---

### Requirement 4: Forgot Password dari Halaman Profil

**User Story:** Sebagai Password_User, saya ingin dapat meminta email reset kata sandi langsung dari halaman profil, agar saya dapat mengubah kata sandi tanpa harus logout terlebih dahulu.

#### Acceptance Criteria

1. WHERE Auth_Provider pengguna adalah `'password'`, THE Profile_Page SHALL menampilkan tombol "Ubah / Reset Kata Sandi" di bagian Account Security.
2. WHEN Password_User menekan tombol "Ubah / Reset Kata Sandi", THE Profile_Module SHALL memanggil `sendPasswordResetEmail` via Firebase_Auth ke alamat email yang terdaftar pada akun.
3. WHEN pengiriman email reset berhasil, THE Profile_Module SHALL menampilkan notifikasi sukses via `Toast` dengan pesan dalam Bahasa Indonesia yang menyatakan bahwa email instruksi reset kata sandi telah dikirim ke alamat email pengguna.
4. IF pengiriman email reset gagal karena error Firebase selain `auth/user-not-found`, THEN THE Profile_Module SHALL menampilkan notifikasi error via `Toast` dengan pesan dalam Bahasa Indonesia yang meminta pengguna mencoba lagi.
5. WHILE permintaan reset sedang diproses, THE Profile_Module SHALL menonaktifkan tombol "Ubah / Reset Kata Sandi" untuk mencegah pengiriman ganda.
6. WHERE Auth_Provider pengguna adalah `'google.com'`, THE Profile_Page SHALL TIDAK menampilkan tombol "Ubah / Reset Kata Sandi" dan SHALL menampilkan informasi yang menjelaskan bahwa kata sandi dikelola oleh Google Account.

---

### Requirement 5: Identifikasi Authentication Provider

**User Story:** Sebagai platform, saya ingin dapat mengidentifikasi metode login pengguna, agar tampilan opsi account management yang ditampilkan selalu relevan dengan provider yang digunakan.

#### Acceptance Criteria

1. THE Profile_Module SHALL menyediakan fungsi `getAuthProvider(user: FirebaseUser): 'password' | 'google.com' | 'unknown'` di `features/profile/utils/providerUtils.ts` yang membaca `user.providerData` dari `FirebaseUser` untuk menentukan Auth_Provider.
2. WHEN `getAuthProvider` dipanggil dengan `FirebaseUser` yang memiliki `providerData[0].providerId === 'password'`, THE Profile_Module SHALL mengembalikan nilai `'password'`.
3. WHEN `getAuthProvider` dipanggil dengan `FirebaseUser` yang memiliki `providerData[0].providerId === 'google.com'`, THE Profile_Module SHALL mengembalikan nilai `'google.com'`.
4. IF `user.providerData` kosong atau provider yang ada tidak dikenali, THEN `getAuthProvider` SHALL mengembalikan nilai `'unknown'`.
5. THE Profile_Page SHALL memanggil `getAuthProvider` menggunakan `user` dari `AuthContext` dan menggunakan hasilnya untuk menentukan bagian Account Security yang ditampilkan.
6. THE Profile_Module SHALL memastikan bahwa field `photoURL` di `UserProfile` Firestore tetap dapat diisi untuk Google_User — Google_User tidak diblokir dari upload foto profil kustom yang akan menggantikan foto Google mereka.

---

### Requirement 6: Account Dropdown di Navbar

**User Story:** Sebagai pengguna yang sudah login, saya ingin melihat avatar dan nama saya di Navbar dan dapat mengakses menu akun dengan cepat, agar navigasi ke profil dan logout terasa natural.

#### Acceptance Criteria

1. WHEN `AuthContext.user` tidak `null` dan `AuthContext.loading` selesai, THE Navbar SHALL menampilkan Avatar pengguna di sisi kanan navbar menggantikan tombol "Mulai Belajar" yang ada.
2. THE Navbar SHALL menampilkan foto profil (`photoURL` dari `UserProfile`) jika tersedia, atau Fallback_Avatar (inisial `name`) jika `photoURL` kosong atau gagal dimuat.
3. WHEN `AuthContext.user` adalah `null`, THE Navbar SHALL menampilkan tombol "Masuk" yang mengarahkan ke `/login` di posisi yang sebelumnya ditempati tombol "Mulai Belajar".
4. WHEN pengguna mengklik Avatar di Navbar, THE Navbar SHALL menampilkan Account_Dropdown yang berisi: nama pengguna (dari `UserProfile.name`), email (dari `UserProfile.email`), tautan "Profil Saya" yang mengarah ke `/profile`, dan tombol "Keluar".
5. WHEN pengguna mengklik "Profil Saya" di Account_Dropdown, THE Navbar SHALL menutup Account_Dropdown dan mengarahkan pengguna ke `/profile`.
6. WHEN pengguna mengklik "Keluar" di Account_Dropdown, THE Navbar SHALL memanggil fungsi `logout` dari `features/auth/services/authService.ts` yang sudah ada, menampilkan loading state pada tombol Keluar selama proses berlangsung, dan menutup Account_Dropdown setelah logout selesai.
7. WHEN Account_Dropdown terbuka, pengguna mengklik di luar area dropdown, THEN THE Navbar SHALL menutup Account_Dropdown.
8. THE Account_Dropdown SHALL dapat diakses menggunakan keyboard: tombol `Escape` menutup dropdown, tautan dan tombol di dalam dropdown dapat difokus via `Tab`.
9. WHILE `AuthContext.loading` bernilai `true`, THE Navbar SHALL menampilkan skeleton placeholder di posisi Avatar dengan dimensi 32×32 piksel dan sudut membulat, tanpa menampilkan baik Avatar maupun tombol "Masuk".
10. THE Account_Dropdown SHALL menggunakan design system LineChip: latar putih, `border-border`, `shadow-sm`, sudut `rounded-xl`, font `Plus Jakarta Sans`, warna aksi `intblue`, dan animasi masuk yang konsisten dengan `.rise-in` atau `fade-slide-in`.
11. THE Navbar Account_Dropdown SHALL responsif: pada tampilan mobile (layar < 768px), Account_Dropdown ditampilkan sebagai item tambahan di dalam menu mobile yang sudah ada, bukan sebagai popup terpisah.

---

### Requirement 7: State Management dan Konsistensi Data

**User Story:** Sebagai platform, saya ingin perubahan data profil (termasuk foto) langsung terrefleksi di seluruh aplikasi tanpa reload, agar pengalaman pengguna terasa seamless.

#### Acceptance Criteria

1. THE Profile_Module SHALL menggunakan `AuthContext` yang sudah ada sebagai sumber kebenaran tunggal (single source of truth) untuk `UserProfile`; perubahan profil disimpan ke Firestore dan kemudian dipropagasi ke komponen lain melalui listener real-time Firestore yang sudah ada di `AuthProvider`.
2. WHEN `UserProfile.photoURL` diperbarui di Firestore setelah upload foto berhasil, THE AuthProvider SHALL mempropagasi perubahan ke seluruh komponen yang mengonsumsi `AuthContext` dalam waktu maksimal 5 detik, termasuk Avatar di Navbar, tanpa memerlukan reload halaman.
3. WHEN `UserProfile.name` atau `UserProfile.school` diperbarui di Firestore, THE AuthProvider SHALL mempropagasi perubahan tersebut ke seluruh komponen yang mengonsumsi `AuthContext` dalam waktu maksimal 5 detik.
4. THE Profile_Module SHALL TIDAK menduplikasi state `UserProfile` di luar `AuthContext`; `useProfile` hook hanya boleh membaca dari `AuthContext` dan menyediakan action dispatch ke service layer.
5. IF `AuthContext.error` tidak `null` saat Profile_Page diakses, THEN THE Profile_Page SHALL menampilkan pesan error dalam Bahasa Indonesia sesuai nilai `AuthContext.error` beserta tombol "Muat Ulang".

---

### Requirement 8: Struktur Kode Feature-Based dan Pemisahan Concerns

**User Story:** Sebagai developer, saya ingin modul profil terorganisir dalam struktur feature-based yang konsisten dengan modul auth yang sudah ada, agar codebase mudah di-maintain dan dikembangkan.

#### Acceptance Criteria

1. THE Profile_Module SHALL menggunakan struktur direktori berikut:
   ```
   features/profile/
   ├── services/
   │   ├── profileService.ts     # Operasi Firestore: read/update profil
   │   └── storageService.ts     # Operasi Firebase Storage: upload foto
   ├── hooks/
   │   ├── useProfile.ts         # State dan aksi halaman profil
   │   └── useAccountDropdown.ts # State dropdown Navbar
   ├── types/
   │   └── index.ts              # Tipe spesifik Profile_Module
   ├── utils/
   │   ├── providerUtils.ts      # getAuthProvider, getInitials
   │   └── imageUtils.ts         # Kompresi gambar via Canvas API
   └── index.ts                  # Barrel export
   ```
2. THE Profile_Module SHALL TIDAK menempatkan panggilan Firebase SDK secara langsung di dalam file komponen React (`components/` atau `app/`); semua operasi Firebase harus melalui `Profile_Service` atau `Storage_Service`.
3. THE Profile_Module SHALL mengekspor semua public API melalui barrel file `features/profile/index.ts`.
4. THE Profile_Module SHALL mendefinisikan tipe `ProfileUpdatePayload`, `PhotoUploadResult`, dan `ProfileError` di `features/profile/types/index.ts`.
5. THE Profile_Module SHALL menggunakan `getFirebaseClient()` yang sudah ada di `features/auth/services/firebase.client.ts` untuk mendapatkan instance `auth`, `db`, dan `storage` — tidak menginisialisasi ulang Firebase.
6. THE Profile_Module SHALL menggunakan `getStorage(app)` dari `firebase/storage` dengan mengambil `app` dari `getFirebaseClient()` untuk mendapatkan instance Firebase Storage.
7. THE Profile_Module SHALL TIDAK mengimpor langsung dari `features/auth/services/firebase.client.ts` di dalam komponen UI; impor Firebase hanya diperbolehkan di dalam layer service (`features/profile/services/`).

---

### Requirement 9: Aksesibilitas dan UX

**User Story:** Sebagai pengguna dengan kebutuhan aksesibilitas, saya ingin dapat menggunakan semua fitur profil menggunakan keyboard dan screen reader, agar pengalaman saya setara dengan pengguna lainnya.

#### Acceptance Criteria

1. THE Profile_Page SHALL menyertakan atribut `aria-label` yang deskriptif pada semua elemen interaktif (tombol edit, area upload foto, tombol simpan, tombol batal, tombol reset kata sandi).
2. THE Avatar upload area SHALL memiliki atribut `role="button"` dan `aria-label="Ubah foto profil"` serta dapat diaktifkan via tombol `Enter` dan `Space`.
3. WHEN terjadi error validasi pada form edit profil, THE Profile_Page SHALL meneruskan deskripsi error ke atribut `aria-describedby` pada field input yang berkaitan, agar screen reader dapat mengumumkan error tersebut.
4. WHEN `Toast` notifikasi ditampilkan, THE Toast SHALL memiliki `role="status"` dan `aria-live="polite"` agar kontennya diumumkan oleh screen reader (sudah ada di komponen `Toast` yang existing — harus diverifikasi dan dipertahankan).
5. THE Profile_Page SHALL memastikan contrast ratio minimal 4.5:1 antara teks dan latar pada semua state (normal, hover, disabled, error) sesuai WCAG 2.1 AA, menggunakan palet warna LineChip yang sudah ada.
6. THE Account_Dropdown SHALL menerapkan manajemen fokus yang benar: WHEN Account_Dropdown terbuka, fokus SHALL berpindah ke item pertama di dalam dropdown; WHEN Account_Dropdown ditutup via `Escape`, fokus SHALL kembali ke Avatar trigger.

---

### Requirement 10: Validasi dan Keamanan

**User Story:** Sebagai platform, saya ingin semua input dan operasi di modul profil divalidasi dengan benar, agar data yang tersimpan di Firestore dan Storage selalu bersih dan sistem terlindungi dari penyalahgunaan.

#### Acceptance Criteria

1. THE Profile_Service.updateProfile SHALL memvalidasi bahwa `uid` yang diterima adalah string non-empty sebelum melakukan operasi Firestore, dan SHALL melempar `ProfileError` jika `uid` kosong.
2. THE Profile_Service.updateProfile SHALL mengizinkan pembaruan field `name`, `school`, dan `photoURL` saja; field lain seperti `uid`, `role`, `email` (via profil teks, bukan email provider), dan `createdAt` SHALL diabaikan meskipun disertakan dalam payload.
3. THE Storage_Service SHALL memvalidasi bahwa file yang akan diupload memiliki tipe MIME `image/jpeg`, `image/png`, `image/webp`, atau `image/gif` sebelum memulai kompresi atau upload.
4. THE Storage_Service SHALL memvalidasi bahwa ukuran file asli tidak melebihi 5MB (5.242.880 byte) sebelum kompresi; IF melebihi batas tersebut, THEN THE Storage_Service SHALL melempar `ProfileError` dengan pesan dalam Bahasa Indonesia.
5. THE Profile_Module SHALL menggunakan `sanitizeInput` (dari `features/auth/services/authService.ts`) pada semua field teks sebelum ditulis ke Firestore untuk mencegah injeksi data berbahaya.
6. THE Storage_Service SHALL menggunakan path Firebase Storage yang terikat ke `uid` pengguna yang terautentikasi saat ini (`profile-photos/{currentUser.uid}/avatar`) untuk mencegah penulisan ke path milik pengguna lain.
7. IF operasi Firebase Storage atau Firestore gagal karena `permission-denied`, THEN THE Profile_Module SHALL menampilkan pesan error dalam Bahasa Indonesia yang menginformasikan bahwa akses ditolak, tanpa mengekspos detail technical error.

---

### Requirement 11: Penanganan Error dan Loading States

**User Story:** Sebagai pengguna, saya ingin mendapatkan umpan balik yang jelas dan konsisten di setiap kondisi — loading, sukses, error, dan empty state — agar saya tahu apa yang sedang terjadi di setiap saat.

#### Acceptance Criteria

1. THE Profile_Module SHALL menangani minimal empat state berikut untuk setiap operasi async: `idle`, `loading`, `success`, dan `error` — dan merepresentasikan masing-masing state secara visual yang berbeda di UI.
2. WHEN foto profil gagal dimuat karena broken URL, THE Profile_Page SHALL secara otomatis beralih ke Fallback_Avatar menggunakan event handler `onError` pada elemen `<img>`.
3. IF `Profile_Service` atau `Storage_Service` melempar error yang tidak dikenali, THEN THE Profile_Module SHALL menampilkan pesan fallback dalam Bahasa Indonesia: *"Terjadi kesalahan yang tidak terduga. Coba lagi atau hubungi dukungan."*
4. THE Profile_Module SHALL memetakan Firebase Storage error code yang relevan ke pesan Bahasa Indonesia, termasuk `storage/unauthorized`, `storage/quota-exceeded`, `storage/retry-limit-exceeded`, dan `storage/object-not-found`.
5. WHILE upload foto profil berlangsung, THE Profile_Page SHALL menampilkan persentase progress yang diperbarui secara real-time berdasarkan event `state_changed` dari Firebase Storage `UploadTask`.
6. THE Profile_Page SHALL menampilkan empty state yang informatif dalam Bahasa Indonesia ketika field `school` pada profil masih berupa string kosong (kondisi Google_User baru yang belum mengisi sekolah), dengan ajakan untuk melengkapi profil.

