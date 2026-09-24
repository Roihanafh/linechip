# Requirements Document

## Introduction

Fitur **Admin Dashboard** menyediakan antarmuka manajemen back-office khusus untuk pengguna berperan `admin` pada platform LineChip. Dashboard mencakup tiga area utama:

1. **Overview Dashboard** — halaman ringkasan statistik platform (jumlah pengguna, pengguna aktif, skor tertinggi global, distribusi game).
2. **Manajemen Pengguna** — tabel seluruh pengguna terdaftar, halaman detail profil, kemampuan menonaktifkan/mengaktifkan kembali akun, dan penghapusan akun.
3. **Reset Leaderboard** — fitur untuk mereset data skor leaderboard (semua pengguna atau per-game) dengan konfirmasi eksplisit sebelum tindakan destruktif dieksekusi.

Semua route admin dilindungi route guard berbasis session cookie; pengguna non-admin diarahkan kembali ke halaman utama. Dashboard menggunakan pola Next.js App Router, Server Components, dan API Route yang sudah ada di proyek.

---

## Glossary

- **Admin_Dashboard**: Sistem antarmuka manajemen yang hanya dapat diakses oleh pengguna dengan `role: "admin"`.
- **Route_Guard**: Mekanisme proteksi route yang memeriksa klaim `role` dari session cookie menggunakan `verifySessionCookie` yang sudah ada di `features/auth/services/firebase.admin.ts`.
- **Admin_Layout**: Layout Next.js yang membungkus semua halaman `/admin/*`, bertugas menjalankan Route_Guard di sisi server.
- **Overview_Page**: Halaman `/admin` yang menampilkan statistik ringkasan platform.
- **User_Management_Page**: Halaman `/admin/users` yang menampilkan tabel semua pengguna.
- **User_Detail_Page**: Halaman `/admin/users/[uid]` yang menampilkan profil lengkap satu pengguna beserta kontrol tindakan.
- **Leaderboard_Reset_Page**: Halaman `/admin/leaderboard-reset` yang menampilkan kontrol reset skor.
- **UserProfile**: Dokumen Firestore di koleksi `users/{uid}` dengan field: `uid`, `name`, `email`, `school`, `photoURL`, `role`, `totalScore`, `createdAt`, `updatedAt`.
- **Admin_API**: Kumpulan Next.js API Routes di bawah `/api/admin/*` yang menggunakan `withAdminAuth` untuk otorisasi server-side.
- **Confirmation_Dialog**: Modal konfirmasi dengan teks deskriptif tindakan, tombol batal, dan tombol konfirmasi; wajib hadir sebelum setiap tindakan destruktif.
- **Admin_Seed_Script**: Script Node.js yang dijalankan sekali (one-shot) menggunakan Firebase Admin SDK untuk membuat akun admin pertama di Firebase Auth dan dokumen `users/{uid}` di Firestore, serta menetapkan custom claim `role: "admin"` pada token Firebase Auth.
- **Custom_Claim**: Klaim tambahan yang ditetapkan pada token Firebase Auth menggunakan `setCustomUserClaims` dari Firebase Admin SDK; digunakan oleh `verifySessionCookie` untuk membaca `role` tanpa query Firestore tambahan.
- **Disabled_Account**: Akun pengguna yang telah dinonaktifkan oleh admin; pengguna tidak dapat login hingga akun diaktifkan kembali. Diimplementasikan dengan Firebase Auth `disabled` flag.
- **Stat_Card**: Komponen UI kartu yang menampilkan satu metrik dengan label dan nilai numerik.
- **Selected_User_Reset**: Operasi reset `totalScore` ke `0` pada satu atau lebih pengguna yang dipilih secara eksplisit oleh admin dari daftar.
- **Full_Leaderboard_Reset**: Operasi reset `totalScore` ke `0` pada seluruh dokumen di koleksi `users`, menghasilkan leaderboard yang sepenuhnya kosong.

---

## Requirements

### Requirement 1: Proteksi Route Admin

**User Story:** Sebagai admin, saya ingin semua halaman dashboard admin terlindungi otentikasi dan otorisasi berbasis peran, sehingga hanya saya yang dapat mengakses area manajemen.

#### Acceptance Criteria

1. WHEN pengguna mengakses URL yang dimulai dengan `/admin`, THE Admin_Layout SHALL memverifikasi session cookie menggunakan `verifySessionCookie` di sisi server sebelum merender konten halaman apapun.
2. IF session cookie tidak ada atau tidak valid, THEN THE Admin_Layout SHALL mengalihkan pengguna ke `/login` dengan query parameter `?redirect=/admin` tanpa mengirimkan konten halaman admin ke klien.
3. IF session cookie valid tetapi klaim `role` bukan `"admin"`, THEN THE Admin_Layout SHALL mengalihkan pengguna ke `/` tanpa mengirimkan konten halaman admin ke klien.
4. IF `verifySessionCookie` gagal karena layanan autentikasi tidak tersedia, THEN THE Admin_Layout SHALL mengalihkan pengguna ke `/login` dengan query parameter `?redirect=/admin` dan memperlakukan kondisi tersebut setara dengan session tidak valid.
5. THE Admin_Dashboard SHALL menampilkan link navigasi untuk berpindah ke Overview_Page, User_Management_Page, dan Leaderboard_Reset_Page, di mana setiap link hanya dapat diklik saat pengguna berada pada halaman yang berbeda dari tujuan link tersebut.

---

### Requirement 2: Overview Dashboard — Statistik Platform

**User Story:** Sebagai admin, saya ingin melihat ringkasan statistik platform dalam satu halaman, sehingga saya dapat memahami kondisi penggunaan platform secara cepat.

#### Acceptance Criteria

1. WHEN admin mengakses `/admin`, THE Overview_Page SHALL menampilkan empat Stat_Card dengan label dan nilai: (a) total pengguna terdaftar, (b) jumlah pengguna dengan `totalScore > 0`, (c) skor tertinggi di antara semua pengguna, dan (d) jumlah pengguna dengan status akun dinonaktifkan — masing-masing menampilkan angka bulat non-negatif.
2. WHEN data statistik sedang diambil dari server, THE Overview_Page SHALL menampilkan skeleton loading placeholder pada setiap Stat_Card sebagai pengganti nilai angka, selama proses pengambilan data berlangsung.
3. IF pengambilan data statistik gagal, THEN THE Overview_Page SHALL menampilkan pesan error yang mengindikasikan kegagalan pemuatan data dan sebuah tombol berlabel "Coba Lagi" yang, ketika diklik, memulai ulang pengambilan data statistik dari awal.
4. WHEN Overview_Page dimuat, THE Admin_API SHALL menghitung keempat nilai statistik menggunakan query Firestore `getCountFromServer` tanpa membaca field dokumen individual, dan mengembalikan keempat nilai dalam satu respons.
5. THE Overview_Page SHALL menampilkan tabel yang memuat tepat sepuluh baris pengguna dengan `totalScore` tertinggi, diurutkan dari skor tertinggi ke terendah, dengan kolom: nama pengguna (maksimal 50 karakter ditampilkan), nama sekolah (maksimal 50 karakter ditampilkan), dan nilai `totalScore`.
6. IF jumlah pengguna dengan `totalScore > 0` kurang dari sepuluh, THEN THE Overview_Page SHALL menampilkan hanya pengguna yang tersedia pada tabel tanpa baris kosong atau placeholder.

---

### Requirement 3: Manajemen Pengguna — Daftar Pengguna

**User Story:** Sebagai admin, saya ingin melihat daftar semua pengguna terdaftar dengan informasi ringkas, sehingga saya dapat mengawasi dan mengelola akun pengguna platform.

#### Acceptance Criteria

1. WHEN admin mengakses `/admin/users`, THE User_Management_Page SHALL menampilkan tabel dengan kolom: nomor urut, nama, email, sekolah, `totalScore`, status akun (aktif/nonaktif), dan tanggal registrasi dalam format DD/MM/YYYY.
2. THE User_Management_Page SHALL menerapkan pagination dengan maksimal 20 entri per halaman menggunakan cursor-based pagination, dan SHALL menampilkan kontrol navigasi halaman (sebelumnya/berikutnya) yang dinonaktifkan apabila tidak ada halaman lebih lanjut.
3. WHEN admin memasukkan kata kunci minimal 2 karakter di kolom pencarian, THE User_Management_Page SHALL memfilter daftar dalam waktu paling lambat 500 milidetik setelah karakter terakhir diketik, mencocokkan nama atau email pengguna secara case-insensitive.
4. IF kata kunci pencarian kurang dari 2 karakter, THEN THE User_Management_Page SHALL menampilkan kembali seluruh daftar pengguna tanpa filter.
5. WHEN admin mengklik nama pengguna pada tabel, THE User_Management_Page SHALL menavigasi ke User_Detail_Page untuk pengguna yang dipilih.
6. IF daftar pengguna kosong atau pencarian tidak menemukan hasil, THEN THE User_Management_Page SHALL menampilkan pesan yang menyatakan tidak ada pengguna ditemukan dan menyembunyikan tabel.
7. WHILE data daftar pengguna sedang diambil dari Firestore, THE User_Management_Page SHALL menampilkan skeleton loading sebanyak baris yang sama dengan ukuran halaman (maksimal 20 baris) sebagai pengganti isi tabel.
8. IF pengambilan data daftar pengguna dari Firestore gagal, THEN THE User_Management_Page SHALL menampilkan pesan error yang menginformasikan kegagalan pemuatan data dan menyediakan opsi untuk mencoba ulang.

---

### Requirement 4: Manajemen Pengguna — Detail & Tindakan

**User Story:** Sebagai admin, saya ingin melihat profil lengkap satu pengguna dan dapat menonaktifkan, mengaktifkan kembali, atau menghapus akun mereka, sehingga saya dapat menangani kasus pelanggaran atau akun bermasalah.

#### Acceptance Criteria

1. WHEN admin mengakses `/admin/users/[uid]` dengan uid yang valid, THE User_Detail_Page SHALL menampilkan semua field UserProfile: nama, email, sekolah, foto profil, peran, `totalScore`, status akun (aktif/nonaktif), tanggal dibuat dalam format DD/MM/YYYY HH:mm, dan tanggal diperbarui dalam format DD/MM/YYYY HH:mm.
2. IF uid pada URL tidak ditemukan di Firestore, THEN THE User_Detail_Page SHALL menampilkan pesan "Pengguna tidak ditemukan" dan menyediakan link untuk kembali ke User_Management_Page.
3. WHEN pengguna yang ditampilkan memiliki status akun aktif, THE User_Detail_Page SHALL menampilkan tombol "Nonaktifkan Akun" dan menyembunyikan tombol "Aktifkan Akun".
4. WHEN pengguna yang ditampilkan memiliki status akun nonaktif, THE User_Detail_Page SHALL menampilkan tombol "Aktifkan Akun" dan menyembunyikan tombol "Nonaktifkan Akun".
5. WHEN admin mengklik "Nonaktifkan Akun" atau "Aktifkan Akun", THE User_Detail_Page SHALL menampilkan Confirmation_Dialog yang menyebutkan nama pengguna dan tindakan yang akan dilakukan sebelum eksekusi.
6. WHEN admin mengonfirmasi tindakan nonaktifkan/aktifkan, THE Admin_API SHALL memanggil Firebase Auth Admin SDK (`updateUser`) untuk mengubah flag `disabled` sesuai tindakan yang diminta, lalu memperbarui field `updatedAt` di Firestore, dan THE User_Detail_Page SHALL memperbarui tampilan status akun tanpa reload halaman penuh.
7. WHEN admin mengklik "Hapus Pengguna", THE User_Detail_Page SHALL menampilkan Confirmation_Dialog dengan teks peringatan bahwa tindakan ini tidak dapat dibatalkan dan seluruh data pengguna akan dihapus permanen, sebelum eksekusi apapun dilakukan.
8. WHEN admin mengonfirmasi penghapusan, THE Admin_API SHALL menghapus akun dari Firebase Auth terlebih dahulu, kemudian menghapus dokumen dari Firestore; hanya setelah kedua langkah berhasil, THE User_Detail_Page SHALL menavigasi kembali ke User_Management_Page.
9. IF penghapusan dari Firebase Auth berhasil tetapi penghapusan dokumen Firestore gagal, THEN THE Admin_API SHALL mengembalikan error 500 dan THE User_Detail_Page SHALL menampilkan pesan error yang menyarankan admin untuk menghubungi dukungan teknis.
10. IF Admin_API mengembalikan error saat operasi nonaktifkan/aktifkan/hapus dalam waktu lebih dari 5000 ms atau respons error diterima, THEN THE User_Detail_Page SHALL menampilkan pesan error spesifik dan status akun pengguna tidak berubah dari kondisi sebelum tindakan.
11. THE Admin_API SHALL menolak operasi nonaktifkan dan hapus pada akun dengan `role: "admin"` dengan respons HTTP 403, dan THE User_Detail_Page SHALL menampilkan pesan yang menginformasikan bahwa akun admin tidak dapat dimodifikasi melalui panel ini.

---

### Requirement 5: Reset Leaderboard

**User Story:** Sebagai admin, saya ingin dapat mereset data skor leaderboard — baik untuk pengguna tertentu yang dipilih maupun untuk semua pengguna sekaligus — sehingga saya dapat memulai kompetisi baru atau mengoreksi data yang salah.

#### Acceptance Criteria

1. WHEN admin mengakses `/admin/leaderboard-reset`, THE Leaderboard_Reset_Page SHALL menampilkan dua mode reset: "Reset Pengguna Tertentu" dan "Reset Semua Leaderboard".
2. WHEN admin memilih mode "Reset Pengguna Tertentu", THE Leaderboard_Reset_Page SHALL menampilkan tabel daftar semua pengguna dengan kolom: nama, email, sekolah, dan `totalScore` saat ini, beserta checkbox pada setiap baris untuk memilih pengguna.
3. WHEN admin memilih satu atau lebih pengguna melalui checkbox dan mengklik tombol "Reset Skor Terpilih", THE Leaderboard_Reset_Page SHALL menampilkan Confirmation_Dialog yang menyebutkan jumlah pengguna yang dipilih dan menyatakan bahwa `totalScore` mereka akan diatur ke `0`.
4. WHEN admin mengonfirmasi "Reset Skor Terpilih", THE Admin_API SHALL memperbarui field `totalScore` ke `0` hanya pada dokumen pengguna yang dipilih, lalu mengembalikan jumlah dokumen yang diperbarui.
5. WHEN admin memilih mode "Reset Semua Leaderboard" dan mengklik tombol eksekusi, THE Leaderboard_Reset_Page SHALL menampilkan Confirmation_Dialog yang menyatakan bahwa `totalScore` SEMUA pengguna akan diatur ke `0` dan leaderboard akan sepenuhnya kosong, serta menegaskan bahwa tindakan ini tidak dapat dibatalkan.
6. WHEN admin mengonfirmasi "Reset Semua Leaderboard", THE Admin_API SHALL memperbarui field `totalScore` ke `0` pada semua dokumen di koleksi `users`, lalu mengembalikan jumlah total dokumen yang diperbarui.
7. WHILE Admin_API sedang memproses operasi reset (baik parsial maupun penuh), THE Leaderboard_Reset_Page SHALL menampilkan indikator loading dan menonaktifkan semua tombol reset untuk mencegah pengiriman duplikat.
8. WHEN Admin_API berhasil menyelesaikan operasi reset, THE Leaderboard_Reset_Page SHALL menampilkan pesan sukses yang menyebutkan jumlah pengguna yang datanya direset dan memperbarui nilai `totalScore` yang ditampilkan pada tabel daftar pengguna.
9. IF Admin_API mengembalikan error selama operasi reset, THEN THE Leaderboard_Reset_Page SHALL menampilkan pesan error yang mengindikasikan kegagalan operasi dan memastikan tidak ada perubahan parsial yang tersimpan pada data leaderboard.
10. IF pengguna yang mengakses `/admin/leaderboard-reset` tidak memiliki peran admin yang valid, THEN THE Leaderboard_Reset_Page SHALL mengalihkan pengguna ke halaman utama tanpa menampilkan konten halaman.
11. WHEN admin mengklik tombol batal atau menutup Confirmation_Dialog sebelum mengonfirmasi, THE Leaderboard_Reset_Page SHALL menutup dialog dan tidak melakukan perubahan apapun pada data leaderboard.
12. IF admin belum memilih pengguna manapun pada mode "Reset Pengguna Tertentu", THEN THE Leaderboard_Reset_Page SHALL menonaktifkan tombol "Reset Skor Terpilih" hingga minimal satu pengguna dipilih.

---

### Requirement 6: Admin API — Endpoint Manajemen

**User Story:** Sebagai sistem, saya ingin semua operasi mutasi data admin dieksekusi melalui API routes yang terotorisasi di sisi server, sehingga keamanan data pengguna terjamin.

#### Acceptance Criteria

1. THE Admin_API SHALL menggunakan `withAdminAuth` dari `features/auth/services/firebase.admin.ts` pada semua endpoint untuk memverifikasi bahwa pemohon memiliki `role: "admin"` sebelum memproses permintaan apapun dalam request handler.
2. WHEN Admin_API menerima permintaan yang valid dan berhasil diproses, THE Admin_API SHALL merespons dalam waktu tidak lebih dari 5000 ms dengan status HTTP 200 dan body respons yang mengonfirmasi operasi yang dilakukan.
3. THE Admin_API SHALL memvalidasi semua input permintaan sebelum memproses operasi, di mana `uid` wajib berupa non-empty string dengan panjang 1–128 karakter dan `action` harus merupakan salah satu nilai enum yang didefinisikan dalam kontrak API, serta mengembalikan respons 400 dengan pesan error yang mengidentifikasi field mana yang tidak valid jika validasi gagal.
4. THE Admin_API SHALL menggunakan Firebase Admin SDK (`getAdminAuth`, `getAdminDb`) dari `features/auth/services/firebase.admin.ts` untuk semua operasi Firestore dan Firebase Auth, tanpa menggunakan Firebase client SDK pada sisi server.
5. IF operasi Firestore atau Firebase Auth gagal karena error jaringan atau internal, THEN THE Admin_API SHALL mengembalikan respons 500 dengan pesan error yang tidak mengekspos stack trace, nama file, atau detail internal implementasi, dan memastikan tidak ada perubahan data parsial yang tersimpan.
6. IF pemohon tidak memiliki `role: "admin"` atau token tidak dapat diverifikasi, THEN THE Admin_API SHALL mengembalikan status HTTP 401 untuk token tidak ada atau tidak valid, atau 403 untuk token valid tetapi role tidak mencukupi, tanpa memproses operasi apapun.

---

### Requirement 7: Antarmuka Admin — Aksesibilitas & Navigasi

**User Story:** Sebagai admin, saya ingin dashboard dapat dioperasikan dengan keyboard dan screen reader, sehingga antarmuka memenuhi standar aksesibilitas minimum.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL menyediakan navigasi sidebar yang dapat dioperasikan dengan keyboard, di mana tombol Tab berpindah fokus antar item navigasi, tombol Enter atau Space mengaktifkan item yang difokus, dan tombol Escape menutup submenu atau dropdown yang sedang terbuka.
2. WHEN Confirmation_Dialog ditampilkan, THE Confirmation_Dialog SHALL memindahkan fokus keyboard ke elemen interaktif pertama dalam dialog dalam waktu tidak lebih dari 100 ms setelah dialog muncul, dan mengembalikan fokus ke elemen tombol yang memicu dialog tersebut ketika dialog ditutup.
3. THE Admin_Dashboard SHALL menyertakan atribut `role="dialog"`, `aria-labelledby` yang merujuk ke elemen judul dialog, dan `aria-describedby` yang merujuk ke elemen deskripsi pada setiap Confirmation_Dialog yang dirender.
4. WHEN tindakan admin sedang diproses, THE Admin_Dashboard SHALL menetapkan atribut `disabled` pada tombol aksi yang memicu proses tersebut dan menampilkan indikator visual berupa spinner atau teks status yang terlihat di dalam atau bersebelahan dengan tombol selama proses berlangsung.
5. THE Admin_Dashboard SHALL menggunakan elemen semantik HTML `<nav>` untuk blok navigasi, `<main>` untuk konten utama, `<table>` untuk data tabular, dan `<th scope="col">` atau `<th scope="row">` pada semua header tabel agar dapat diinterpretasikan oleh teknologi asistif.
6. IF Admin_Dashboard dirender pada ukuran viewport kurang dari 768 px lebar, THEN THE Admin_Dashboard SHALL tetap menyediakan semua kontrol navigasi yang dapat dijangkau dengan keyboard tanpa memerlukan scroll horizontal.

---

### Requirement 8: Penyediaan Akun Admin Pertama

**User Story:** Sebagai developer, saya ingin ada mekanisme untuk membuat akun admin pertama di Firebase Auth dan Firestore, sehingga dashboard admin dapat diakses tanpa bergantung pada antarmuka Firebase Console secara manual.

#### Acceptance Criteria

1. THE Admin_Seed_Script SHALL tersedia sebagai file `scripts/seed-admin.ts` yang dapat dijalankan dengan perintah `npx ts-node scripts/seed-admin.ts` dari root proyek.
2. WHEN Admin_Seed_Script dijalankan, THE Admin_Seed_Script SHALL membaca kredensial email dan password admin dari argumen baris perintah atau variabel environment `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, dan `ADMIN_SCHOOL`, dan SHALL menolak dijalankan jika salah satu nilai tersebut tidak ada atau kosong.
3. WHEN Admin_Seed_Script dijalankan dengan kredensial yang valid, THE Admin_Seed_Script SHALL membuat akun di Firebase Auth menggunakan `getAdminAuth().createUser({ email, password, displayName })`, lalu menetapkan Custom_Claim `role: "admin"` menggunakan `getAdminAuth().setCustomUserClaims(uid, { role: 'admin' })`.
4. WHEN akun Firebase Auth berhasil dibuat, THE Admin_Seed_Script SHALL membuat dokumen `users/{uid}` di Firestore dengan field: `uid`, `name` (dari `ADMIN_NAME`), `email`, `school` (dari `ADMIN_SCHOOL`), `role: "admin"`, `totalScore: 0`, `createdAt: FieldValue.serverTimestamp()`, dan `updatedAt: FieldValue.serverTimestamp()`.
5. IF email yang diberikan sudah terdaftar di Firebase Auth, THEN THE Admin_Seed_Script SHALL menampilkan pesan error yang menginformasikan bahwa email sudah digunakan dan menghentikan eksekusi tanpa membuat data duplikat.
6. IF dokumen `users/{uid}` sudah ada di Firestore setelah akun Firebase Auth berhasil dibuat, THEN THE Admin_Seed_Script SHALL menimpa dokumen tersebut dengan data admin yang benar menggunakan `set` dengan opsi `merge: false`.
7. WHEN Admin_Seed_Script berhasil menyelesaikan semua langkah, THE Admin_Seed_Script SHALL mencetak ke stdout: uid akun yang dibuat, email, dan konfirmasi bahwa Custom_Claim dan dokumen Firestore telah berhasil dibuat.
8. THE Admin_Seed_Script SHALL menggunakan `getAdminAuth` dan `getAdminDb` dari `features/auth/services/firebase.admin.ts` yang sudah ada dan SHALL memuat variabel environment dari file `.env.local` menggunakan `dotenv` sebelum inisialisasi Firebase Admin SDK.
