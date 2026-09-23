# Requirements Document

## Introduction

Fitur ini mengimplementasikan modul **Leaderboard** pada aplikasi **linechip** — platform edukasi matematika berbasis Next.js untuk siswa SMP. Modul ini menggantikan halaman `/leaderboard` yang saat ini menggunakan data statis dengan implementasi nyata berbasis Firestore.

Leaderboard menampilkan 10 pengguna teratas berdasarkan `totalScore` dari koleksi Firestore `users/{uid}`. Jika pengguna yang sedang login tidak termasuk dalam top 10, posisinya tetap ditampilkan secara terpisah di bawah tabel agar pemain selalu tahu peringkat mereka. Jika pengguna masuk dalam top 10, baris miliknya diberi highlight khusus di dalam tabel.

## Glossary

- **Leaderboard_Service**: Modul `features/leaderboard/leaderboardService.ts` yang membaca data peringkat dari Firestore.
- **Leaderboard_Page**: Halaman Next.js di `/leaderboard` (`app/leaderboard/page.tsx`).
- **LeaderboardClient**: Komponen client di `app/leaderboard/LeaderboardClient.tsx` yang mengelola state dan rendering.
- **LeaderboardEntry**: Data satu pemain dalam leaderboard — meliputi `uid`, `rank`, `name`, `school`, `photoURL`, dan `totalScore`.
- **Top10**: 10 entri teratas berdasarkan `totalScore` secara descending.
- **Current_User_Entry**: Entri `LeaderboardEntry` milik pengguna yang sedang login.
- **Own_Rank_Card**: Kartu terpisah di bawah tabel yang menampilkan posisi pengguna saat ini bila peringkatnya > 10.
- **Highlight_Row**: Baris dalam tabel top 10 yang diberi latar belakang dan gaya berbeda untuk menandai pengguna yang sedang login.
- **Rank_Badge**: Elemen visual yang menampilkan nomor peringkat (1–10) dalam tabel.
- **Podium**: Area visual di bagian atas halaman yang menampilkan tiga besar dengan hierarki tinggi–sedang–rendah.
- **UserProfile**: Tipe `UserProfile` dari `features/auth/types/index.ts`, berisi `uid`, `name`, `school`, `photoURL`, dan `totalScore`.
- **Avatar**: Komponen `components/profile/Avatar.tsx` yang menampilkan foto profil atau inisial sebagai fallback.
- **totalScore**: Field numerik pada dokumen Firestore `users/{uid}` yang menyimpan akumulasi poin pemain.
- **Firestore_Query**: Query Firestore yang mengambil koleksi `users` diurutkan berdasarkan `totalScore` secara descending dengan limit.

---

## Requirements

### Requirement 1: Pengambilan Data Leaderboard dari Firestore

**User Story:** Sebagai pemain, saya ingin melihat peringkat nyata berdasarkan skor Firestore, sehingga kompetisi antar pemain mencerminkan capaian yang sesungguhnya.

#### Acceptance Criteria

1. THE `Leaderboard_Service` SHALL membaca koleksi `users` dari Firestore, diurutkan berdasarkan `totalScore` secara descending, dengan limit 10 untuk menghasilkan `Top10`.
2. WHEN query Firestore berhasil, THE `Leaderboard_Service` SHALL mengembalikan array `LeaderboardEntry[]` dengan panjang maksimum 10, setiap entri berisi `uid`, `rank` (1-indexed), `name`, `school`, `photoURL`, dan `totalScore`.
3. WHEN `totalScore` pada dokumen Firestore bernilai `undefined` atau tidak ada, THE `Leaderboard_Service` SHALL memperlakukan nilai tersebut sebagai `0` saat mengurutkan dan menampilkan.
4. IF query Firestore gagal (network error atau permission error), THEN THE `Leaderboard_Service` SHALL mengembalikan error yang dapat ditangani oleh `LeaderboardClient` untuk ditampilkan sebagai UI error state.
5. THE `Leaderboard_Service` SHALL menggunakan Firebase client SDK yang sudah tersedia di `features/auth/services/firebase.client.ts` untuk mendapatkan instance Firestore.

### Requirement 2: Tampilan Top 10 dalam Tabel Peringkat

**User Story:** Sebagai pemain, saya ingin melihat 10 pemain teratas dengan jelas, sehingga saya bisa mengetahui posisi terbaik yang perlu saya kejar.

#### Acceptance Criteria

1. THE `LeaderboardClient` SHALL menampilkan tepat 10 entri (atau kurang jika total pemain < 10) dalam tabel peringkat.
2. THE `LeaderboardClient` SHALL menampilkan setiap entri dengan: nomor peringkat (`rank`), avatar (`Avatar` component), nama (`name`), sekolah (`school`), dan skor (`totalScore`) yang diformat dengan pemisah ribuan.
3. THE `LeaderboardClient` SHALL menampilkan `Rank_Badge` pada setiap baris dengan gaya visual yang membedakan peringkat 1, 2, dan 3 dari peringkat 4–10 menggunakan warna emas, perak, dan perunggu.
4. WHEN data sedang dimuat dari Firestore, THE `LeaderboardClient` SHALL menampilkan skeleton loading state sebagai pengganti tabel peringkat.
5. IF query Firestore menghasilkan error, THEN THE `LeaderboardClient` SHALL menampilkan pesan error dalam Bahasa Indonesia dengan tombol "Coba Lagi" yang memicu ulang query.
6. WHEN koleksi `users` kosong atau tidak ada pengguna dengan `totalScore > 0`, THE `LeaderboardClient` SHALL menampilkan pesan empty state dalam Bahasa Indonesia.

### Requirement 3: Podium Visual Tiga Besar

**User Story:** Sebagai pemain, saya ingin melihat hierarki visual yang jelas untuk tiga juara teratas, sehingga pencapaian terbaik mendapat penghargaan yang menonjol.

#### Acceptance Criteria

1. THE `LeaderboardClient` SHALL menampilkan `Podium` yang menempatkan peringkat 1 di tengah dengan ketinggian paling tinggi, peringkat 2 di kiri dengan ketinggian sedang, dan peringkat 3 di kanan dengan ketinggian paling rendah.
2. THE `LeaderboardClient` SHALL menampilkan komponen `Avatar` untuk setiap pemain di `Podium` dengan ukuran lebih besar untuk peringkat 1 dibanding peringkat 2 dan 3.
3. THE `LeaderboardClient` SHALL menampilkan nama, skor, dan label sekolah untuk setiap pemain di `Podium`.
4. WHEN data top 3 memiliki kurang dari 3 entri (misalnya hanya ada 1 atau 2 pemain), THE `LeaderboardClient` SHALL merender `Podium` hanya dengan slot yang terisi data, bukan menampilkan slot kosong dengan data placeholder.
5. THE `LeaderboardClient` SHALL menampilkan ikon mahkota 👑 di atas slot peringkat 1 pada `Podium`.

### Requirement 4: Highlight Pengguna yang Masuk Top 10

**User Story:** Sebagai pemain yang masuk top 10, saya ingin baris saya diberi penanda yang jelas, sehingga saya langsung bisa menemukan posisi saya di tabel.

#### Acceptance Criteria

1. WHEN pengguna yang sedang login memiliki peringkat 1–10, THE `LeaderboardClient` SHALL menerapkan `Highlight_Row` pada baris entri milik pengguna tersebut dalam tabel.
2. THE `Highlight_Row` SHALL menggunakan latar belakang warna `intblue-light` (`#EAF1FF`) dan border `intblue` untuk membedakannya secara visual dari baris lain.
3. THE `Highlight_Row` SHALL menyertakan label teks **"Kamu"** atau ikon identifikasi di samping nama pengguna agar mudah dikenali secara visual.
4. WHEN pengguna tidak login (guest), THE `LeaderboardClient` SHALL tidak menerapkan `Highlight_Row` pada baris manapun.

### Requirement 5: Tampilan Peringkat Pengguna di Luar Top 10

**User Story:** Sebagai pemain yang berada di peringkat di atas 10, saya ingin tetap melihat posisi saya saat ini, sehingga saya termotivasi untuk naik peringkat tanpa harus scrolling ke bawah.

#### Acceptance Criteria

1. WHEN pengguna yang sedang login memiliki `totalScore` tetapi peringkatnya > 10, THE `Leaderboard_Service` SHALL mengambil data entri pengguna tersebut beserta peringkatnya yang tepat.
2. WHEN peringkat pengguna > 10, THE `LeaderboardClient` SHALL menampilkan `Own_Rank_Card` di bawah tabel top 10 yang menampilkan: peringkat saat ini, avatar, nama, sekolah, dan `totalScore` pengguna.
3. THE `Own_Rank_Card` SHALL menggunakan gaya visual berbeda (border `intblue`, latar belakang `intblue-light`) untuk membedakannya dari tabel utama namun tetap konsisten dengan palet warna aplikasi.
4. WHEN pengguna tidak login atau pengguna belum memiliki skor (totalScore = 0 atau tidak ada), THE `LeaderboardClient` SHALL menampilkan kartu ajakan bermain sebagai pengganti `Own_Rank_Card`, dengan tautan ke halaman materi atau game.
5. WHEN pengguna yang sedang login berada di peringkat 1–10, THE `LeaderboardClient` SHALL tidak menampilkan `Own_Rank_Card` karena posisi sudah terlihat di tabel utama.

### Requirement 6: Penentuan Peringkat Pengguna dari Firestore

**User Story:** Sebagai developer, saya ingin logika penentuan peringkat yang akurat, sehingga nomor peringkat yang ditampilkan konsisten dengan data aktual Firestore.

#### Acceptance Criteria

1. THE `Leaderboard_Service` SHALL menentukan peringkat setiap pengguna berdasarkan jumlah dokumen di koleksi `users` yang memiliki `totalScore` lebih besar dari `totalScore` pengguna tersebut, ditambah 1.
2. WHEN dua atau lebih pengguna memiliki `totalScore` yang sama, THE `Leaderboard_Service` SHALL memperlakukan mereka sebagai peringkat yang sama (tidak ada tie-breaking berdasarkan field lain).
3. THE `Leaderboard_Service` SHALL menghitung peringkat `Current_User_Entry` dengan query `countQuery` yang menghitung dokumen dengan `totalScore > userScore`, kemudian menambah 1.
4. IF pengguna tidak login, THEN THE `Leaderboard_Service` SHALL tidak melakukan query peringkat pengguna dan mengembalikan `null` untuk `Current_User_Entry`.

### Requirement 7: Rendering Halaman dan Loading State

**User Story:** Sebagai pemain, saya ingin leaderboard terasa cepat dan responsif, sehingga pengalaman membuka halaman peringkat tidak terasa lambat.

#### Acceptance Criteria

1. THE `Leaderboard_Page` SHALL menggunakan arsitektur Server Component + Client Component: `page.tsx` sebagai Server Component yang merender `LeaderboardClient` sebagai client boundary.
2. WHEN halaman `/leaderboard` pertama kali dimuat, THE `LeaderboardClient` SHALL memulai pengambilan data dari Firestore secara paralel untuk `Top10` dan `Current_User_Entry`.
3. WHEN data sedang dimuat, THE `LeaderboardClient` SHALL menampilkan skeleton loading state untuk `Podium`, tabel, dan `Own_Rank_Card` secara bersamaan.
4. THE `LeaderboardClient` SHALL hanya me-render ulang bagian yang datanya berubah — pengambilan data `Top10` dan `Current_User_Entry` berjalan independen satu sama lain.
5. THE `Leaderboard_Page` SHALL menyertakan metadata `title: "Leaderboard"` dan `description` dalam Bahasa Indonesia untuk SEO.

### Requirement 8: Aksesibilitas Leaderboard

**User Story:** Sebagai pengguna dengan kebutuhan aksesibilitas, saya ingin leaderboard dapat diakses dengan screen reader dan keyboard, sehingga semua pengguna mendapat pengalaman yang setara.

#### Acceptance Criteria

1. THE `LeaderboardClient` SHALL menggunakan elemen `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, dan `<td>` yang semantik untuk tabel peringkat, sehingga screen reader dapat membaca struktur peringkat dengan benar.
2. THE `Highlight_Row` SHALL menyertakan atribut `aria-label="Peringkatmu"` atau menyertakan teks visually hidden yang menyatakan bahwa baris tersebut adalah milik pengguna saat ini.
3. THE `Own_Rank_Card` SHALL menyertakan `aria-label` yang mendeskripsikan posisi pengguna, misalnya `"Peringkatmu saat ini: ke-[N]"`.
4. THE `Leaderboard_Page` SHALL memiliki heading hierarki yang benar: satu `<h1>` untuk judul halaman dan `<h2>` untuk sub-bagian seperti podium dan tabel.
5. THE komponen `Avatar` yang sudah ada SHALL digunakan untuk setiap entri leaderboard dengan prop `name` yang terisi untuk memastikan `aria-label` foto profil selalu tersedia.

### Requirement 9: Integrasi dengan Sistem Auth yang Ada

**User Story:** Sebagai developer, saya ingin leaderboard menggunakan sistem auth yang sudah ada, sehingga tidak ada duplikasi logika autentikasi.

#### Acceptance Criteria

1. THE `LeaderboardClient` SHALL menggunakan hook `useAuth` dari `features/auth` untuk mendapatkan `user` dan `profile` dari `AuthContext`.
2. WHEN `loading` dari `useAuth` bernilai `true`, THE `LeaderboardClient` SHALL menampilkan skeleton loading state sambil menunggu status autentikasi.
3. THE `LeaderboardClient` SHALL menggunakan `user.uid` dari `useAuth` untuk menentukan apakah baris leaderboard tertentu perlu mendapat `Highlight_Row` atau `Own_Rank_Card`.
4. THE `Leaderboard_Service` SHALL tidak bergantung pada session cookie atau Admin SDK — cukup menggunakan Firebase client SDK karena data `users` yang dibaca adalah data publik dalam konteks Firestore Security Rules.
