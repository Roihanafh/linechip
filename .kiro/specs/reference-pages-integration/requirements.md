# Requirements Document

## Introduction

Integrasi empat halaman dari folder referensi (`c:\d\Erly\lomba\referensi`) ke dalam project Next.js produksi (`c:\d\Erly\lomba\linechip`). Halaman yang diintegrasikan mencakup halaman autentikasi (Login, Register), halaman 404 khusus, dan halaman Battle Lab (Virus vs Antibody) versi lanjutan. Setiap halaman diintegrasikan menggunakan konvensi App Router Next.js, design system yang sudah ada (Tailwind CSS v4, warna `intblue`/`intpink`, font Plus Jakarta Sans/JetBrains Mono/Baloo 2), dan komponen bersama (`Navbar`, `Footer`) yang sudah ada — sambil mempertahankan semua tampilan visual dan perilaku interaktif dari referensi.

## Glossary

- **App_Router**: Sistem routing berbasis direktori `app/` di Next.js yang sudah digunakan di project `linechip`.
- **Server_Component**: React component yang dirender di server; default di App Router, tidak membutuhkan `"use client"`.
- **Client_Component**: React component dengan direktif `"use client"`; digunakan untuk state, efek, atau event handler browser.
- **Design_System**: Sistem warna, font, dan token desain yang didefinisikan di `app/globals.css` (`intblue`, `intpink`, dll.).
- **RightPanel**: Komponen dekoratif visual yang dirender di sisi kanan halaman Login dan Register pada tampilan desktop (lebar ≥ lg), berisi ilustrasi SVG dan chip animasi. Diambil dari folder referensi `imports/`.
- **FloatingInput**: Komponen input dengan label mengambang (floating label) dan ikon kiri yang digunakan di halaman Login dan Register.
- **Toast**: Komponen notifikasi sementara yang muncul di atas halaman dan otomatis hilang setelah beberapa detik.
- **VirusAntibodyPage**: Halaman Battle Lab interaktif di mana pengguna memilih karakter Virus dan Antibody berdasarkan nilai tempat, lalu menjalankan animasi pertarungan.
- **BattlePhase**: Tipe enumerasi fase animasi pertarungan: `ready`, `approach`, `impact`, `result`.
- **PlaceValue**: Tipe enumerasi nilai tempat: `satuan` (×1), `puluhan` (×10), `ratusan` (×100), `ribuan` (×1000).
- **NotFoundPage**: Halaman 404 kustom dengan parallax mouse-tracking, glyphs matematika melayang, dan tombol navigasi kembali.
- **CSS_Animations**: Kelas animasi kustom (`rise-in`, `soft-bob`, `float-drift`, `float-drift-slow`, `battle-float`, `battle-shake`, `defeat-left`, `defeat-right`, `victory-pop`, `lift`, `arena-enter`, `glitch-hover`, `glow-pulse`, `spin-slow`, `spin-slow-rev`, `animate-check-pop`, `animate-fade-slide-in`, `animate-slide-in-down`, `grid-drift`) yang dibutuhkan oleh halaman-halaman referensi.
- **Material_Symbols**: Font ikonik Google Material Symbols Outlined yang digunakan oleh halaman Login, Register, dan 404 melalui tag `<link>` di head.
- **Google_Auth**: Tombol login/daftar dengan akun Google (UI-only, tidak terhubung ke backend nyata pada fase ini).

---

## Requirements

### Requirement 1: Animasi CSS Kustom dan Google Material Symbols

**User Story:** Sebagai developer, saya ingin semua animasi kustom dan ikon Material Symbols tersedia secara global, sehingga halaman-halaman referensi dapat tampil dengan benar tanpa menambahkan dependensi baru per halaman.

#### Acceptance Criteria

1. THE Design_System SHALL mendefinisikan keyframe dan kelas animasi kustom berikut di `app/globals.css`: `rise-in` (fade + slide-up masuk dengan CSS variable `--d` sebagai delay), `soft-bob` (melayang naik-turun halus), `float-drift` (drift melingkar lambat), `float-drift-slow` (drift lebih lambat), `battle-float` (mengambang naik-turun untuk karakter battle), `battle-shake` (goyangan impact), `defeat-left` (keluar ke kiri saat kalah), `defeat-right` (keluar ke kanan saat kalah), `victory-pop` (scale pop saat menang), `lift` (hover translate-up ringan), `arena-enter` (fade masuk arena), `glitch-hover` (efek glitch teks pada hover), `glow-pulse` (glow berdenyut), `spin-slow` (rotasi lambat), `spin-slow-rev` (rotasi lambat berlawanan), `grid-drift` (pola grid bergerak), `animate-check-pop` (scale pop untuk checkmark), `animate-fade-slide-in` (fade + slide masuk untuk error/toast), `animate-slide-in-down` (slide masuk dari atas untuk toast), `gradient-text` (teks dengan gradient `intblue` ke `intpink`).
2. THE App_Router root layout (`app/layout.tsx`) SHALL memuat Google Material Symbols Outlined melalui tag `<link rel="stylesheet">` di `<head>` dengan URL `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block`.
3. THE Design_System SHALL memastikan font `Material Symbols Outlined` tersedia sebelum render pertama dengan menggunakan `display=block` pada URL font tersebut.

---

### Requirement 2: Panel Visual Kanan (RightPanel) untuk Login dan Register

**User Story:** Sebagai developer, saya ingin panel visual dekoratif yang diambil dari referensi tersedia sebagai komponen terpisah, sehingga halaman Login dan Register dapat menggunakannya tanpa duplikasi kode.

#### Acceptance Criteria

1. THE App_Router SHALL menyediakan komponen `LoginRightPanel` di `components/auth/LoginRightPanel.tsx` yang merender panel visual kanan dari referensi `imports/LineChipMasukAkunLight/index.tsx` — termasuk ilustrasi garis bilangan, chip animasi, dan badge pertarungan.
2. THE App_Router SHALL menyediakan komponen `RegisterRightPanel` di `components/auth/RegisterRightPanel.tsx` yang merender panel visual kanan dari referensi `imports/LineChipDaftarAkunLight/index.tsx` — termasuk ilustrasi level progress, badge XP, dan kartu aktivitas.
3. THE `LoginRightPanel` component SHALL menggunakan SVG inline (bukan import file `.ts` path) sehingga kompatibel dengan Next.js tanpa konfigurasi tambahan.
4. THE `RegisterRightPanel` component SHALL menggunakan SVG inline dan tidak mengimpor file gambar eksternal yang berpotensi gagal di lingkungan Next.js.
5. WHEN viewport lebih kecil dari breakpoint `lg`, THE RightPanel SHALL disembunyikan menggunakan kelas `hidden lg:flex`.

---

### Requirement 3: Halaman Login (`/login`)

**User Story:** Sebagai siswa, saya ingin dapat masuk ke akun LineChip menggunakan email dan kata sandi atau akun Google, sehingga kemajuan belajar saya tersimpan dan dapat dilanjutkan.

#### Acceptance Criteria

1. THE App_Router SHALL merender halaman Login di rute `/login` melalui `app/login/page.tsx`.
2. THE Login_Page SHALL menampilkan tata letak dua kolom: form autentikasi di kiri dan `LoginRightPanel` dekoratif di kanan (panel kanan hanya tampil pada viewport ≥ lg).
3. THE Login_Page SHALL menampilkan komponen `FloatingInput` untuk field "Alamat Email" (type `email`) dan "Kata Sandi" (type `password`) dengan label yang terangkat saat field terfokus atau terisi.
4. WHEN nilai email cocok dengan pola `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, THE Login_Page SHALL menampilkan indikator valid (ikon `check_circle` hijau) pada field email.
5. WHEN nilai kata sandi memiliki panjang ≥ 6 karakter, THE Login_Page SHALL menampilkan indikator valid pada field kata sandi.
6. THE Login_Page SHALL menampilkan tombol toggle show/hide password menggunakan ikon Material Symbols `visibility` / `visibility_off`.
7. THE Login_Page SHALL menampilkan checkbox "Ingat saya 30 hari" dengan UI kustom (kotak beranimasi dengan checkmark SVG saat dicentang).
8. THE Login_Page SHALL menampilkan tombol "Lupa Kata Sandi?" sebagai elemen interaktif (UI-only, tanpa fungsi reset password pada fase ini).
9. WHEN semua field valid dan pengguna menekan tombol "Masuk Sekarang", THE Login_Page SHALL menampilkan state loading (spinner + teks "Memproses...") selama 1,5 detik, kemudian menampilkan `Toast` sukses dengan pesan "Login berhasil! Selamat datang kembali."
10. IF pengguna menekan submit dengan field kosong atau tidak valid, THEN THE Login_Page SHALL menampilkan pesan error inline di bawah field yang bermasalah dengan animasi `animate-fade-slide-in`.
11. THE Login_Page SHALL menampilkan tombol "Masuk dengan Akun Google" (UI-only, tidak terhubung ke OAuth pada fase ini).
12. THE Login_Page SHALL menampilkan tautan "Daftar gratis di sini" yang mengarahkan pengguna ke `/register`.
13. THE Login_Page SHALL menampilkan badge keamanan "Koneksi terenkripsi SSL/TLS" menggunakan ikon Material Symbols `verified_user` di bagian bawah form.
14. THE Login_Page SHALL diimplementasikan sebagai Client_Component karena membutuhkan `useState` untuk state form, validasi real-time, dan animasi.
15. WHEN tombol "Masuk Sekarang" dinonaktifkan (tidak semua field valid), THE Login_Page SHALL menerapkan warna `bg-[#93c5fd]` dengan `cursor-not-allowed` pada tombol.

---

### Requirement 4: Halaman Register (`/register`)

**User Story:** Sebagai siswa baru, saya ingin mendaftarkan akun LineChip dengan nama, email/NISN, kelas/sekolah, dan kata sandi, sehingga saya dapat mulai menggunakan platform dan mencatat kemajuan belajar.

#### Acceptance Criteria

1. THE App_Router SHALL merender halaman Register di rute `/register` melalui `app/register/page.tsx`.
2. THE Register_Page SHALL menampilkan tata letak dua kolom: form pendaftaran di kiri (atau penuh pada viewport kecil) dan `RegisterRightPanel` dekoratif di kanan (panel kanan hanya tampil pada viewport ≥ lg dengan lebar 40%).
3. THE Register_Page SHALL menampilkan progress bar tiga langkah ("Identitas", "Keamanan", "Persetujuan") yang diperbarui secara real-time saat pengguna mengisi field.
4. THE Register_Page SHALL menampilkan field: Nama Lengkap, Email/NISN, Kelas & Sekolah (grid 2 kolom), Kata Sandi, dan Konfirmasi Kata Sandi (grid 2 kolom), semua menggunakan komponen `FloatingField` dengan label mengambang.
5. WHEN pengguna mengetik kata sandi, THE Register_Page SHALL menampilkan indikator kekuatan kata sandi (Lemah/Sedang/Kuat/Sangat Kuat) dengan bar visual empat segmen berwarna sesuai level kekuatan.
6. THE Register_Page SHALL menghitung kekuatan kata sandi berdasarkan empat kriteria: panjang ≥ 8 karakter (+1), huruf besar (+1), angka (+1), simbol (+1), dengan total skor 0–4.
7. THE Register_Page SHALL menampilkan checkbox persetujuan "Ketentuan Layanan" dan "Kebijakan Privasi" dengan UI kustom; tombol daftar dinonaktifkan sampai checkbox dicentang.
8. WHEN semua field valid dan checkbox dicentang, THE Register_Page SHALL mengaktifkan tombol "Daftar Akun Sekarang" dengan warna `bg-[#2563eb]` dan shadow penuh.
9. WHEN pengguna menekan tombol daftar dalam kondisi valid, THE Register_Page SHALL menampilkan state loading (spinner + "Mendaftarkan...") selama 1,5 detik, kemudian menampilkan `Toast` sukses.
10. IF validasi gagal saat submit, THEN THE Register_Page SHALL menampilkan pesan error inline di bawah field yang tidak valid.
11. THE Register_Page SHALL menampilkan tautan "Masuk di sini" yang mengarahkan pengguna ke `/login`.
12. THE Register_Page SHALL diimplementasikan sebagai Client_Component karena membutuhkan `useState` dan kalkulasi real-time kekuatan kata sandi.
13. WHEN konfirmasi kata sandi cocok dengan kata sandi dan panjang ≥ 8 karakter, THE Register_Page SHALL menampilkan ikon `check_circle` hijau pada field konfirmasi.

---

### Requirement 5: Halaman 404 Kustom

**User Story:** Sebagai pengguna yang mengakses URL yang tidak ada, saya ingin melihat halaman 404 yang sesuai branding LineChip dengan navigasi yang jelas, sehingga saya tidak bingung dan dapat kembali ke konten yang relevan.

#### Acceptance Criteria

1. THE App_Router SHALL merender halaman 404 kustom melalui `app/not-found.tsx` menggunakan fungsi `notFound()` dari Next.js atau sebagai file `not-found.tsx` di level root `app/`.
2. THE NotFound_Page SHALL menampilkan numerik "404" berukuran besar (110px mobile, 150px desktop) dengan efek gradient text (`intblue` ke `intpink`) dan efek `glow-pulse`.
3. THE NotFound_Page SHALL menampilkan dua ring dekoratif yang berputar di belakang numerik "404": satu ring garis putus-putus berwarna biru (`border-[#bfdbfe]`) yang berputar searah jarum jam, satu ring berwarna merah muda (`border-[#fecdd3]`) yang berputar berlawanan arah jarum jam.
4. WHEN pengguna menggerakkan mouse di atas area halaman, THE NotFound_Page SHALL menerapkan efek parallax pada numerik "404" menggunakan `requestAnimationFrame` — numerik bergerak mengikuti posisi kursor dengan pergerakan `tilt.x * 16px` horizontal dan `tilt.y * 16px` vertikal, serta rotasi 3D `perspective(900px) rotateY(tilt.x * 10deg) rotateX(-tilt.y * 10deg)` pada kontainer.
5. WHEN pengguna memindahkan mouse keluar dari area halaman, THE NotFound_Page SHALL mereset nilai tilt ke `{ x: 0, y: 0 }`.
6. THE NotFound_Page SHALL menampilkan lima glyph matematika/sains melayang (`∑`, `÷`, `√`, ikon biotech, `π`) dengan animasi `soft-bob` pada posisi tetap yang tersebar di latar halaman.
7. THE NotFound_Page SHALL menampilkan tombol "Kembali ke Beranda" yang mengarahkan pengguna ke rute `/` menggunakan `next/link` atau navigasi programatik.
8. THE NotFound_Page SHALL menampilkan tombol "Coba Battle Lab" yang mengarahkan pengguna ke rute `/game-virus`.
9. THE NotFound_Page SHALL menampilkan badge error code "Error 404 · Resource Not Found" dengan indikator pulsing merah di bagian bawah konten.
10. THE NotFound_Page SHALL menggunakan latar belakang `bg-[#f8fafc]` dengan tiga blob berwarna semi-transparan (biru dan merah muda) dan pola `grid-drift` yang bergerak halus.
11. THE NotFound_Page SHALL diimplementasikan sebagai Client_Component karena membutuhkan `useState` dan `useRef` untuk efek parallax mouse-tracking.
12. IF frame animasi parallax sedang aktif, THEN THE NotFound_Page SHALL membatalkan frame sebelumnya dengan `cancelAnimationFrame` sebelum memulai frame baru untuk menghindari penumpukan frame.

---

### Requirement 6: Halaman Battle Lab (`/game-virus` — Peningkatan)

**User Story:** Sebagai siswa, saya ingin memilih karakter Virus dan Antibody berdasarkan nilai tempat bilangan (satuan, puluhan, ratusan, ribuan), lalu menjalankan simulasi pertarungan animasi untuk memahami konsep perbandingan nilai bilangan.

#### Acceptance Criteria

1. THE App_Router SHALL memperbarui halaman Battle Lab di rute `/game-virus` dengan konten dari `referensi/pages/VirusAntibodyPage.tsx`.
2. THE VirusAntibody_Page SHALL menampilkan empat kartu pemilihan Antibody (Monoab, Bimoab, Polyab, Pentaab) berdasarkan nilai tempat dengan ilustrasi SVG inline untuk setiap karakter (IgG Y-shape, lengan Fab, pentamer IgM, dll.).
3. THE VirusAntibody_Page SHALL menampilkan empat kartu pemilihan Virus (Mikrovir, Sporovir, Dendrovir, Coronavir) berdasarkan nilai tempat dengan ilustrasi SVG inline untuk setiap karakter (duri radial, spike dengan kepala bulat, cabang dengan flagela, mahkota korona).
4. WHEN pengguna memilih kartu karakter, THE VirusAntibody_Page SHALL menandai kartu yang dipilih dengan border berwarna accent, shadow, dan checkmark animasi `animate-check-pop`.
5. THE VirusAntibody_Page SHALL menampilkan ringkasan pemilihan aktif (mini preview kedua karakter dengan label "VS") di header halaman.
6. THE VirusAntibody_Page SHALL menampilkan komponen `BattleArena` dengan latar gelap (`bg-[#0f172a]`) yang menampilkan kedua karakter berhadapan.
7. WHEN fase adalah `ready`, THE VirusAntibody_Page SHALL menampilkan tombol "Mulai Pertarungan" di bawah arena.
8. WHEN pengguna menekan "Mulai Pertarungan", THE VirusAntibody_Page SHALL menjalankan urutan animasi: fase `approach` (1.400ms) — kedua karakter bergerak saling mendekat `translateX(40px)` / `translateX(-40px)`; fase `impact` (600ms) — ring lingkaran putih mengembang, karakter bergoyang dengan animasi `battle-shake`; fase `result` (tersisa) — menampilkan pemenang berdasarkan `multiplier`.
9. WHEN multiplier Antibody lebih besar dari multiplier Virus, THE VirusAntibody_Page SHALL menetapkan pemenang `"antibody"`, menampilkan animasi `defeat-right` pada Virus dan `victory-pop` pada Antibody.
10. WHEN multiplier Virus lebih besar dari multiplier Antibody, THE VirusAntibody_Page SHALL menetapkan pemenang `"virus"`, menampilkan animasi `defeat-left` pada Antibody dan `victory-pop` pada Virus.
11. WHEN multiplier keduanya sama, THE VirusAntibody_Page SHALL menetapkan pemenang `"draw"` dan menampilkan pesan "Kekuatan setara — pertarungan berimbang!".
12. THE VirusAntibody_Page SHALL menampilkan banner hasil di bawah arena dengan teks deskriptif yang menyebut nama karakter dan perbandingan nilai (e.g., `1000 > 10 · Antibody Ribuan mengalahkan Virus Puluhan`).
13. WHEN fase adalah `result`, THE VirusAntibody_Page SHALL menampilkan tombol "Ulang" (mengulangi pertarungan dengan karakter yang sama) dan "Ganti Karakter" (mereset ke fase `ready`).
14. WHEN pengguna mengubah pilihan karakter saat fase bukan `ready`, THE VirusAntibody_Page SHALL mereset otomatis ke fase `ready` dan membatalkan semua timer yang aktif.
15. THE VirusAntibody_Page SHALL diimplementasikan sebagai Client_Component karena membutuhkan `useState`, `useRef`, `useCallback`, `useEffect`, dan timer pertarungan.
16. IF komponen di-unmount selama pertarungan berlangsung, THEN THE VirusAntibody_Page SHALL membersihkan semua `setTimeout` yang aktif untuk mencegah memory leak.

---

### Requirement 7: Navigasi Antar Halaman Autentikasi

**User Story:** Sebagai pengguna, saya ingin dapat berpindah antara halaman Login dan Register menggunakan tautan, sehingga saya tidak perlu mengetik URL secara manual.

#### Acceptance Criteria

1. THE Login_Page SHALL menampilkan tautan yang mengarahkan ke `/register` menggunakan komponen `next/link`.
2. THE Register_Page SHALL menampilkan tautan yang mengarahkan ke `/login` menggunakan komponen `next/link`.
3. THE Navbar SHALL tidak menampilkan tautan ke `/login` atau `/register` di navigasi utama (halaman autentikasi bersifat utilitas, bukan navigasi utama).
4. THE Login_Page dan Register_Page SHALL tetap merender `Navbar` dan `Footer` global melalui root layout, sehingga pengguna dapat navigasi ke bagian lain dari halaman autentikasi.
5. THE NotFound_Page SHALL merender tombol navigasi menggunakan `next/link` ke `/` dan `/game-virus` agar mendukung client-side navigation tanpa full page reload.

---

### Requirement 8: Desain Visual Konsisten dengan Design System

**User Story:** Sebagai pengguna, saya ingin halaman-halaman baru memiliki tampilan yang konsisten dengan halaman-halaman yang sudah ada di LineChip, sehingga pengalaman visual terasa mulus dan terpadu.

#### Acceptance Criteria

1. THE Login_Page dan Register_Page SHALL menggunakan warna `#2563eb` untuk aksen utama (tombol, border fokus, label aktif) yang selaras dengan `--color-intblue: #2F6FED` dari Design_System existing — perbedaan shade diterima karena merepresentasikan desain halaman autentikasi yang lebih spesifik.
2. THE Login_Page dan Register_Page SHALL menggunakan font `Plus Jakarta Sans` untuk teks body dan label, serta `JetBrains Mono` untuk label kode/badge — konsisten dengan variabel `--font-sans` dan `--font-mono` yang sudah didefinisikan.
3. THE NotFound_Page SHALL menggunakan gradien dari `#2563eb` ke `#ec4899` pada teks "404" — konsisten dengan palet `intblue` dan `intpink` yang sudah ada.
4. THE VirusAntibody_Page SHALL menggunakan warna rose/merah untuk elemen Virus dan warna blue untuk elemen Antibody — konsisten dengan palet `intpink` (Kuman) dan `intblue` (Antibodi) yang sudah digunakan di halaman `/game-virus` yang ada.
5. THE Login_Page dan Register_Page SHALL menggunakan latar belakang `bg-[#f8fafc]` yang sama dengan nilai `--color-surface` pada Design_System.
6. THE Design_System SHALL mempertahankan semua variabel warna dan font yang sudah ada di `app/globals.css` tanpa penghapusan atau perubahan nilai.

---

### Requirement 9: Aksesibilitas dan Responsivitas

**User Story:** Sebagai pengguna di berbagai perangkat, saya ingin semua halaman baru dapat digunakan dengan baik di mobile maupun desktop, dan dapat diakses oleh pengguna yang bergantung pada teknologi assistif.

#### Acceptance Criteria

1. THE Login_Page SHALL menggunakan elemen `<form>` dengan atribut `noValidate` dan memastikan setiap `<input>` memiliki `id` yang cocok dengan atribut `htmlFor` pada `<label>` terkait.
2. THE Register_Page SHALL memastikan semua `<input>` memiliki label yang terhubung secara eksplisit melalui `id`/`htmlFor`.
3. THE Login_Page dan Register_Page SHALL menampilkan pesan error dengan peran semantik yang jelas — pesan error muncul sebagai teks di bawah field yang bermasalah, bukan hanya melalui perubahan warna saja.
4. THE NotFound_Page SHALL menandai semua elemen dekoratif (blob, glyph, ring) dengan atribut `aria-hidden="true"` agar tidak dibaca oleh screen reader.
5. WHEN viewport lebih kecil dari breakpoint `sm` (640px), THE Login_Page SHALL menampilkan tata letak satu kolom penuh (form mengisi seluruh lebar).
6. WHEN viewport lebih kecil dari breakpoint `lg` (1024px), THE Login_Page dan Register_Page SHALL menyembunyikan RightPanel dekoratif dan menampilkan form dalam mode full-width.
7. THE VirusAntibody_Page SHALL menampilkan kartu pemilihan karakter dalam grid 2 kolom pada mobile dan 4 kolom pada desktop menggunakan kelas Tailwind responsif.
8. THE tombol toggle show/hide password SHALL memiliki atribut `aria-label` yang deskriptif ("Tampilkan kata sandi" / "Sembunyikan kata sandi") untuk aksesibilitas screen reader.
9. THE Login_Page SHALL menampilkan konten yang dapat di-scroll pada mobile tanpa overflow horizontal menggunakan `overflow-auto` pada kontainer.

---

### Requirement 10: Kualitas Kode dan Kompatibilitas Next.js

**User Story:** Sebagai developer, saya ingin semua halaman baru bebas error TypeScript dan kompatibel dengan App Router Next.js, sehingga project dapat di-build dan dideploy tanpa masalah.

#### Acceptance Criteria

1. THE Target SHALL lulus `npm run build` tanpa TypeScript error atau build error setelah integrasi keempat halaman baru.
2. THE Target SHALL lulus `npm run lint` tanpa error setelah integrasi.
3. THE Login_Page, Register_Page, NotFound_Page, dan VirusAntibody_Page SHALL tidak mengimpor modul yang tidak ada di project (tidak ada impor dari path `@/imports/LineChipMasukAkunLight` atau `@/imports/LineChipDaftarAkunLight` secara langsung — konten diintegrasikan sebagai komponen inline atau komponen lokal).
4. THE RightPanel components SHALL tidak mengimpor file gambar PNG dari folder referensi; semua visual SHALL direpresentasikan sebagai SVG inline atau gradien CSS.
5. THE Login_Page dan Register_Page SHALL tidak menggunakan pola `onNavigate` prop berbasis state (pola dari mockup React SPA); navigasi SHALL menggunakan `next/link` atau `useRouter` dari `next/navigation`.
6. THE NotFound_Page SHALL menggunakan `"use client"` directive karena membutuhkan `useState` dan `useRef` untuk parallax.
7. WHEN `npm run build` dijalankan, THE Target SHALL menghasilkan output tanpa warning terkait penggunaan `any` type yang eksplisit pada kode baru.
8. THE CSS_Animations yang ditambahkan ke `app/globals.css` SHALL menggunakan sintaks Tailwind CSS v4 (keyframe dengan `@keyframes` standar, kelas animasi dengan `@layer utilities` atau definisi langsung) yang kompatibel dengan Tailwind v4 yang digunakan project.
9. THE `not-found.tsx` SHALL ditempatkan di `app/not-found.tsx` sebagai halaman 404 global sesuai konvensi App Router Next.js.
10. THE Target SHALL menggunakan `"use client"` hanya pada komponen yang benar-benar membutuhkan interaktivitas browser; komponen murni visual SHALL diimplementasikan sebagai Server_Component.
