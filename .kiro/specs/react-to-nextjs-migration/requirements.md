# Requirements Document

## Introduction

Migrasi arsitektur seluruh mockup React+Vite ("Game leaderboard mockup") ke project produksi Next.js ("linechip") tanpa mengubah desain visual maupun perilaku interaktif yang sudah ada. Mockup menjadi *source of truth* visual; project Next.js menjadi implementasi produksi. Migrasi mencakup delapan halaman, semua komponen bersama, sistem styling (Tailwind CSS v4 dengan custom theme), font, dan routing — menggunakan Next.js App Router dengan Server Components sebagai default dan Client Components hanya saat diperlukan interaktivitas.

## Glossary

- **Mockup**: Project sumber `c:\d\Erly\lomba\Game leaderboard mockup` (React + Vite).
- **Target**: Project tujuan `c:\d\Erly\lomba\linechip` (Next.js App Router).
- **App_Router**: Sistem routing berbasis direktori `app/` di Next.js.
- **Server_Component**: React component yang di-render di server; default di App Router.
- **Client_Component**: React component dengan direktif `"use client"`; digunakan saat membutuhkan state, efek, atau event handler browser.
- **Custom_Theme**: Variabel warna, font, dan design token yang didefinisikan di `globals.css` dengan blok `@theme`.
- **TieredChips**: Komponen bersama yang merender chip berlapis (1, 10, 100, 1K) untuk nilai bilangan bulat.
- **DecomposedChips**: Komponen bersama turunan TieredChips yang merender representasi visual tiered dari sebuah nilai.
- **Navbar**: Komponen navigasi global dengan tautan Beranda, Materi, Leaderboard, dan Tentang.
- **Footer**: Komponen footer global dengan tautan navigasi dan kredit.
- **AnimPhase**: Tipe enumerasi fase animasi (`idle`, `charging`, `exploding`, `settled`) pada Game Virus.
- **Zero_Pair**: Konsep matematis di mana chip positif dan negatif dengan nilai sama saling meniadakan.
- **Page_Route**: Pasangan URL path dan segmen direktori App Router yang merepresentasikannya.

---

## Requirements

### Requirement 1: Setup Proyek dan Sistem Styling

**User Story:** Sebagai developer, saya ingin sistem styling di project Next.js identik dengan mockup, sehingga semua komponen yang dimigrasikan tampil secara visual tanpa perbedaan.

#### Acceptance Criteria

1. THE Target SHALL mendefinisikan custom theme Tailwind CSS v4 di `app/globals.css` menggunakan blok `@theme` dengan variabel warna berikut: `--color-intblue: #2F6FED`, `--color-intblue-dark: #1E4FC4`, `--color-intblue-light: #EAF1FF`, `--color-intpink: #EC4899`, `--color-intpink-dark: #BE185D`, `--color-intpink-light: #FCE7F3`, `--color-success: #22C55E`, `--color-error: #EF4444`, `--color-surface: #F8FAFC`, `--color-border: #E2E8F0`.
2. THE Target SHALL mendefinisikan variabel font di `app/globals.css` menggunakan blok `@theme`: `--font-heading` untuk Baloo 2, `--font-sans` untuk Plus Jakarta Sans, `--font-mono` untuk JetBrains Mono.
3. THE Target SHALL memuat Google Fonts (Baloo 2, Plus Jakarta Sans, JetBrains Mono) melalui mekanisme Next.js (`next/font/google`) atau `<link>` di layout, sehingga font tersedia sebelum render pertama.
4. THE Target SHALL menerapkan `font-family` default body ke Plus Jakarta Sans dan background default ke `#ffffff` dengan warna teks `#1e293b`.
5. THE Target SHALL mendefinisikan gaya scrollbar kustom (`width: 6px`, thumb warna `#cbd5e1`, radius `3px`) identik dengan mockup di `app/globals.css`.
6. THE Target SHALL mempertahankan `@import "tailwindcss"` sebagai baris pertama di `app/globals.css` sesuai konvensi Tailwind CSS v4.

---

### Requirement 2: Layout Global (Navbar dan Footer)

**User Story:** Sebagai pengguna, saya ingin navigasi dan footer yang konsisten di semua halaman, sehingga saya dapat berpindah halaman dengan mudah dari mana saja.

#### Acceptance Criteria

1. THE App_Router SHALL menampilkan Navbar dan Footer di semua halaman melalui `app/layout.tsx` sebagai root layout.
2. THE Navbar SHALL menampilkan logo LineChip (ikon SVG garis bilangan + teks "LineChip") yang dapat diklik dan mengarahkan pengguna ke halaman beranda (`/`).
3. THE Navbar SHALL menampilkan tautan navigasi: Beranda (`/`), Materi (`/materi`), Leaderboard (`/leaderboard`), Tentang (`/tentang`).
4. THE Navbar SHALL menerapkan gaya `sticky top-0 z-50` dengan backdrop blur agar tetap terlihat saat pengguna menggulir halaman.
5. THE Navbar SHALL menandai tautan yang aktif sesuai rute halaman yang sedang ditampilkan dengan gaya `bg-intblue-light text-intblue font-semibold`.
6. THE Navbar SHALL menampilkan tombol "Mulai Belajar" yang mengarahkan pengguna ke `/materi` pada tampilan desktop.
7. WHEN lebar viewport kurang dari breakpoint `md`, THE Navbar SHALL menyembunyikan tautan desktop dan menampilkan tombol hamburger yang membuka menu mobile.
8. THE Footer SHALL menampilkan logo, deskripsi singkat, tautan menu, dan tautan Simulasi & Game.
9. THE Navbar SHALL diimplementasikan sebagai Client_Component karena membutuhkan state untuk menu mobile dan deteksi rute aktif.

---

### Requirement 3: Halaman Landing (`/`)

**User Story:** Sebagai calon pengguna, saya ingin melihat halaman utama yang menarik dengan informasi lengkap tentang platform, sehingga saya termotivasi untuk mulai belajar.

#### Acceptance Criteria

1. THE App_Router SHALL merender halaman landing di rute `/` melalui `app/page.tsx`.
2. THE Landing_Page SHALL menampilkan hero section dengan judul, tagline, ilustrasi SVG maskot, tombol CTA "Mulai Belajar" yang mengarah ke `/materi`, dan tombol "Leaderboard" yang mengarah ke `/leaderboard`.
3. THE Landing_Page SHALL menampilkan tiga statistik di hero section: jumlah siswa aktif, rating pengguna, dan jumlah mode interaktif.
4. THE Landing_Page SHALL menampilkan empat kartu fitur (Garis Bilangan, Model Chip, Antibodi vs Kuman, Game Garis Bilangan) sebagai tautan navigasi ke halaman masing-masing.
5. THE Landing_Page SHALL menampilkan alur belajar empat langkah (Pilih Materi → Pelajari Visualisasi → Mainkan Game → Raih Peringkat).
6. THE Landing_Page SHALL menampilkan banner CTA di bagian bawah dengan background `bg-intblue` yang mengajak pengguna mulai belajar.
7. THE Landing_Page SHALL diimplementasikan sebagai Server_Component karena tidak membutuhkan state atau event handler browser.

---

### Requirement 4: Halaman Materi (`/materi`)

**User Story:** Sebagai siswa, saya ingin memilih topik dan metode belajar yang sesuai, sehingga saya bisa belajar secara terarah.

#### Acceptance Criteria

1. THE App_Router SHALL merender halaman materi di rute `/materi` melalui `app/materi/page.tsx`.
2. THE Materi_Page SHALL menampilkan dua kartu besar (Penjumlahan dan Pengurangan) dengan tautan ke sub-halaman Garis Bilangan dan Model Chip.
3. THE Materi_Page SHALL menampilkan bagian promosi game dengan tautan ke `/game-virus` dan `/intline-run`.
4. THE Materi_Page SHALL diimplementasikan sebagai Server_Component.

---

### Requirement 5: Halaman Simulasi Garis Bilangan (`/garis-bilangan`)

**User Story:** Sebagai siswa, saya ingin melihat animasi langkah-per-langkah di garis bilangan, sehingga saya dapat memahami konsep penjumlahan dan pengurangan secara visual.

#### Acceptance Criteria

1. THE App_Router SHALL merender halaman di rute `/garis-bilangan` melalui `app/garis-bilangan/page.tsx`.
2. THE GarisBilangan_Page SHALL memungkinkan pengguna memilih dua bilangan bulat (masing-masing dalam rentang −10 hingga +10) dan operator (`+` atau `−`).
3. THE GarisBilangan_Page SHALL menampilkan garis bilangan SVG horizontal dengan skala dari −15 hingga +15.
4. WHEN pengguna menekan tombol "Mulai", THE GarisBilangan_Page SHALL memainkan animasi langkah-per-langkah yang menggerakkan penanda dari 0 ke bilangan pertama, lalu dari bilangan pertama ke hasil akhir.
5. THE GarisBilangan_Page SHALL menampilkan panah berwarna `intblue` untuk pergerakan ke arah positif (kanan) dan `intpink` untuk pergerakan ke arah negatif (kiri).
6. THE GarisBilangan_Page SHALL menyediakan kontrol Mulai, Jeda, Reset, dan slider kecepatan animasi (0.5× hingga 3×).
7. THE GarisBilangan_Page SHALL menampilkan panel penjelasan teks yang mendeskripsikan langkah animasi yang sedang berlangsung.
8. WHEN animasi selesai, THE GarisBilangan_Page SHALL menampilkan hasil akhir dengan penanda hijau (`bg-success`) pada garis bilangan.
9. THE GarisBilangan_Page SHALL diimplementasikan sebagai Client_Component karena membutuhkan `useState`, `useEffect`, dan `useMemo`.

---

### Requirement 6: Halaman Simulasi Model Chip (`/model-chip`)

**User Story:** Sebagai siswa, saya ingin memvisualisasikan konsep zero-pair dengan chip positif dan negatif, sehingga saya dapat memahami penjumlahan bilangan bulat secara konkret.

#### Acceptance Criteria

1. THE App_Router SHALL merender halaman di rute `/model-chip` melalui `app/model-chip/page.tsx`.
2. THE ModelChip_Page SHALL menampilkan dua input angka (chip positif 0–9999 dan chip negatif 0–9999).
3. WHEN pengguna memasukkan nilai, THE ModelChip_Page SHALL menampilkan representasi DecomposedChips yang sesuai secara real-time.
4. WHEN pengguna menekan "Pasangkan Otomatis", THE ModelChip_Page SHALL menghitung jumlah zero-pair, menandai chip yang dinetralkan dengan gaya `dimmed`, dan menampilkan sisa chip beserta hasil akhirnya.
5. THE ModelChip_Page SHALL menampilkan legenda tingkatan chip (1, 10, 100, 1K) untuk tipe `ab` (antibodi).
6. THE ModelChip_Page SHALL diimplementasikan sebagai Client_Component karena membutuhkan `useState`.

---

### Requirement 7: Halaman Game Antibodi vs Kuman (`/game-virus`)

**User Story:** Sebagai siswa, saya ingin memainkan game drag-and-drop chip ke Reaktor Netral, sehingga saya dapat belajar penjumlahan bilangan bulat dengan cara yang menyenangkan.

#### Acceptance Criteria

1. THE App_Router SHALL merender halaman di rute `/game-virus` melalui `app/game-virus/page.tsx`.
2. THE GameVirus_Page SHALL menampilkan tata letak tiga kolom: Kolam Antibodi (kiri), Reaktor Netral (tengah), Kolam Kuman (kanan).
3. THE GameVirus_Page SHALL memungkinkan pengguna menambahkan chip ke Bilangan 1 atau Bilangan 2 melalui klik pada tombol pool atau drag-and-drop ke zona bilangan.
4. THE GameVirus_Page SHALL menampilkan chip Antibodi (`ab`) bertipe positif dengan nilai tier 1, 10, 100, atau 1000, dan chip Kuman (`ku`) bertipe negatif dengan nilai tier yang sama.
5. THE GameVirus_Page SHALL memungkinkan pengguna memilih target bilangan (Bil.1 atau Bil.2) untuk setiap tipe chip melalui toggle target.
6. WHEN pengguna menekan "Hitung Hasil", THE GameVirus_Page SHALL menjalankan animasi tiga fase: `charging` (650ms), `exploding` (700ms), `settled` (1400ms), lalu menampilkan hasil akhir.
7. THE GameVirus_Page SHALL menampilkan pratinjau persamaan real-time (e.g., `+5 + (−3) = ?`) saat chip ditambahkan.
8. THE GameVirus_Page SHALL menyediakan tombol "Urungkan terakhir" yang menghapus chip terakhir yang ditambahkan.
9. THE GameVirus_Page SHALL menyediakan tombol "Reset Ulang" yang mengosongkan semua chip dan status.
10. THE GameVirus_Page SHALL menampilkan legenda tingkatan chip (Ab dan Ku) di bagian atas halaman.
11. THE GameVirus_Page SHALL diimplementasikan sebagai Client_Component karena membutuhkan state kompleks dan event handler drag-and-drop.

---

### Requirement 8: Halaman Game IntLine Run (`/intline-run`)

**User Story:** Sebagai siswa, saya ingin melihat placeholder game IntLine Run dengan skor dan tombol mulai, sehingga saya dapat mengetahui keberadaan game ini sebelum implementasinya selesai.

#### Acceptance Criteria

1. THE App_Router SHALL merender halaman di rute `/intline-run` melalui `app/intline-run/page.tsx`.
2. THE IntLineRun_Page SHALL menampilkan area placeholder game dengan ikon play dan label "Area Game LineChip Run — akan dimuat di sini" menggunakan gaya border dashed.
3. THE IntLineRun_Page SHALL menampilkan panel skor sesi dan rekor terbaik (347 sebagai nilai placeholder).
4. THE IntLineRun_Page SHALL menampilkan kartu tips yang menautkan ke `/garis-bilangan`.
5. THE IntLineRun_Page SHALL menampilkan tombol "Mulai Bermain" di bawah area placeholder.
6. THE IntLineRun_Page SHALL diimplementasikan sebagai Server_Component karena tidak membutuhkan state browser.

---

### Requirement 9: Halaman Leaderboard (`/leaderboard`)

**User Story:** Sebagai siswa, saya ingin melihat peringkat saya relatif terhadap siswa lain, sehingga saya termotivasi untuk meningkatkan skor.

#### Acceptance Criteria

1. THE App_Router SHALL merender halaman di rute `/leaderboard` melalui `app/leaderboard/page.tsx`.
2. THE Leaderboard_Page SHALL menampilkan tab periode: Mingguan, Bulanan, dan Sepanjang Masa.
3. WHEN pengguna memilih tab periode, THE Leaderboard_Page SHALL menampilkan data peringkat yang sesuai dengan periode tersebut.
4. THE Leaderboard_Page SHALL menampilkan podium tiga besar dengan urutan visual silver (kiri), gold (tengah), bronze (kanan) dan tinggi podium proporsional terhadap peringkat.
5. THE Leaderboard_Page SHALL menampilkan tabel peringkat lengkap (top 10) dengan kolom: nama, kelas, level, bintang, streak, akurasi, skor, dan indikator tren.
6. THE Leaderboard_Page SHALL menampilkan filter kategori: Semua Mode, Garis Bilangan, Model Chip, dan Game.
7. THE Leaderboard_Page SHALL menampilkan kartu "Posisimu saat ini" di bawah tabel peringkat.
8. THE Leaderboard_Page SHALL menampilkan tabel level dan syarat poin (Grandmaster hingga Beginner).
9. THE Leaderboard_Page SHALL diimplementasikan sebagai Client_Component karena membutuhkan `useState` untuk tab periode dan filter kategori.

---

### Requirement 10: Halaman Tentang (`/tentang`)

**User Story:** Sebagai pengguna, saya ingin membaca informasi tentang platform dan tim pengembang, sehingga saya dapat memahami latar belakang dan tujuan LineChip.

#### Acceptance Criteria

1. THE App_Router SHALL merender halaman di rute `/tentang` melalui `app/tentang/page.tsx`.
2. THE Tentang_Page SHALL menampilkan deskripsi platform LineChip dan penjelasan dua metode visualisasi (garis bilangan dan model chip zero-pair).
3. THE Tentang_Page SHALL menampilkan daftar tujuan platform dalam empat item dengan ikon emoji.
4. THE Tentang_Page SHALL menampilkan kartu tim pengembang dengan nama, peran, dan avatar emoji untuk setiap anggota tim.
5. THE Tentang_Page SHALL menampilkan kartu institusi dengan keterangan hak cipta.
6. THE Tentang_Page SHALL diimplementasikan sebagai Server_Component karena tidak membutuhkan state browser.

---

### Requirement 11: Komponen Bersama TieredChips

**User Story:** Sebagai developer, saya ingin komponen chip berlapis yang dapat digunakan ulang di beberapa halaman, sehingga representasi visual bilangan bulat konsisten di seluruh aplikasi.

#### Acceptance Criteria

1. THE Target SHALL mengimplementasikan modul `TieredChips` di `components/TieredChips.tsx` yang mengekspor: tipe `Tier` (1 | 10 | 100 | 1000), konstanta `TIERS`, `TIER_LABEL`, fungsi `decompose`, fungsi `chipClasses`, dan komponen `DecomposedChips`.
2. THE `decompose` function SHALL menerima bilangan bulat non-negatif dan mengembalikan array `{ tier: Tier; count: number }[]` yang merepresentasikan dekomposisi nilai ke dalam tingkatan 1000, 100, 10, 1.
3. FOR ALL nilai non-negatif `v`, `decompose(v).reduce((s, g) => s + g.tier * g.count, 0)` SHALL sama dengan `Math.floor(Math.abs(v))` (round-trip property dekomposisi).
4. THE `DecomposedChips` component SHALL menerima props: `value` (number), `type` ('ab' | 'ku'), `phase` (AnimPhase, opsional, default 'idle'), `dimmed` (boolean, opsional, default false), `maxPerTier` (number, opsional, default 9).
5. WHEN `dimmed` bernilai `true`, THE `DecomposedChips` component SHALL menerapkan kelas `opacity-30 scale-90` pada setiap chip yang ditampilkan.
6. WHEN `phase` bernilai `'charging'`, THE `DecomposedChips` component SHALL menerapkan kelas `animate-pulse` pada setiap chip.
7. WHEN `phase` bernilai `'exploding'`, THE `DecomposedChips` component SHALL menerapkan kelas `scale-0 opacity-0` pada setiap chip.
8. WHEN `count` melebihi `maxPerTier` untuk sebuah tier, THE `DecomposedChips` component SHALL menampilkan `maxPerTier` chip diikuti label `×{count}` dengan gaya teks `text-xs font-mono text-slate-400`.
9. THE `chipClasses` function SHALL mengembalikan string kelas Tailwind yang berbeda untuk tipe `'ab'` (tema intblue) dan tipe `'ku'` (tema intpink) per tingkatan tier.

---

### Requirement 12: Routing dan Navigasi

**User Story:** Sebagai pengguna, saya ingin dapat berpindah antar halaman dengan URL yang bermakna, sehingga saya dapat membagikan tautan ke halaman tertentu.

#### Acceptance Criteria

1. THE App_Router SHALL mendefinisikan delapan rute: `/`, `/materi`, `/garis-bilangan`, `/model-chip`, `/game-virus`, `/intline-run`, `/leaderboard`, `/tentang`, masing-masing sebagai segmen direktori `app/` terpisah.
2. THE Target SHALL menggunakan `next/link` untuk semua tautan navigasi internal, bukan elemen `<a>` biasa.
3. THE Target SHALL menggunakan `next/navigation` (`useRouter`, `usePathname`) di komponen yang membutuhkan navigasi programatik atau deteksi rute aktif.
4. IF pengguna mengakses rute yang tidak terdefinisi, THE App_Router SHALL menampilkan halaman 404 default Next.js.
5. THE Target SHALL tidak menggunakan router berbasis state (seperti pola `useState<Page>` di mockup) — semua navigasi harus berbasis URL.

---

### Requirement 13: Kualitas Kode dan Verifikasi

**User Story:** Sebagai developer, saya ingin memastikan kode yang dimigrasikan bebas dari error TypeScript dan linting, sehingga project siap untuk deployment produksi.

#### Acceptance Criteria

1. THE Target SHALL lulus `npm run lint` tanpa error (hanya warning yang diizinkan).
2. THE Target SHALL lulus `npm run build` tanpa error TypeScript atau build error.
3. THE Target SHALL tidak menggunakan tipe `any` secara eksplisit; semua tipe harus didefinisikan secara eksplisit atau diinfer oleh TypeScript.
4. THE Target SHALL mengekspor semua page component sebagai default export.
5. THE Target SHALL menambahkan direktif `"use client"` hanya pada komponen yang benar-benar membutuhkan API browser (`useState`, `useEffect`, event handler, drag-and-drop).
6. IF sebuah komponen tidak membutuhkan interaktivitas browser, THE Target SHALL mengimplementasikannya sebagai Server_Component tanpa direktif `"use client"`.
7. THE Target SHALL menggunakan komponen bersama (`Navbar`, `Footer`, `TieredChips`, `DecomposedChips`) di semua halaman yang relevan untuk mematuhi prinsip DRY.
