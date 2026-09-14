# Requirements Document

## Introduction

Modul **Model Chip Pengurangan** adalah halaman edukasi baru di aplikasi linechip yang mengajarkan pengurangan bilangan bulat menggunakan representasi chip (antibodi 🔵 vs kuman 🔴). Modul ini merupakan ekstensi dari modul penjumlahan (`/model-chip`) yang sudah ada.

Konsep matematika inti: `a − b = a + (−b)`. Angka kedua (pengurang) selalu dibalik tandanya sebelum animasi battle dimulai. Fase **transformasi** ditambahkan di antara input dan battle untuk memvisualisasikan pembalikan tanda tersebut.

---

## Glossary

- **Subtraction_Page**: Halaman Next.js di route `/model-chip/pengurangan` yang mengimplementasikan modul pengurangan model chip.
- **Subtraction_Hook**: Hook `useSubtractionTransform` yang mengelola logika konversi pengurang dan fase transformasi.
- **Transform_Panel**: Komponen `TransformPanel` yang menampilkan animasi flip/morph chip saat pengurang dibalik tandanya.
- **Subtraction_Input_Panel**: Versi `InputPanel` yang menampilkan operator `−` (bukan `+`) dan label sesuai konteks pengurangan.
- **Pengurang**: Bilangan kedua (bil2) yang dimasukkan pengguna; selalu dibalik tandanya sebelum dijumlahkan.
- **Konversi**: Operasi membalik tanda Pengurang: `b_konversi = −bil2`.
- **Fase Transformasi** (`"transform"`): Fase baru dalam `VizPhase` saat Pengurang sedang dibalik tandanya secara visual.
- **Fase Battle** (`"battle"`): Fase animasi zero-pair neutralization yang diwarisi dari modul penjumlahan.
- **Fase Center** (`"center"`): Fase transisi setelah semua zero-pair selesai, diwarisi dari modul penjumlahan.
- **Fase Done** (`"done"`): Fase akhir yang menampilkan hasil, diwarisi dari modul penjumlahan.
- **Fase Idle** (`"idle"`): Fase awal saat pengguna belum memulai animasi.
- **Zero-Pair**: Satu pasangan antibodi (+1) dan kuman (−1) yang saling menetralkan.
- **AnimMode**: Mode animasi — `"auto"` (otomatis) atau `"click"` (klik per pasangan).
- **VizPhase_Sub**: Tipe `VizPhase` yang diperluas dengan nilai `"transform"`: `"idle" | "transform" | "battle" | "center" | "done"`.
- **Antibodi**: Representasi bilangan positif, ditampilkan sebagai chip biru (🔵).
- **Kuman**: Representasi bilangan negatif, ditampilkan sebagai chip merah/pink (🔴).
- **Materi_Page**: Halaman `/materi` yang berisi daftar link ke semua modul pembelajaran.

---

## Requirements

### Requirement 1: Input dan Validasi Pengurangan

**User Story:** Sebagai siswa, saya ingin memasukkan dua bilangan bulat untuk operasi pengurangan, sehingga saya dapat memulai visualisasi `a − b`.

#### Acceptance Criteria

1. THE Subtraction_Page SHALL menampilkan dua input numerik bertipe `number` yang hanya menerima bilangan bulat (tanpa desimal) dengan rentang `[−9.999, +9.999]` untuk bil1 (minuend) dan bil2 (Pengurang).
2. THE Subtraction_Page SHALL menampilkan operator `−` (minus) di antara kedua input, bukan `+`.
3. WHEN pengguna mengubah nilai input dan VizPhase_Sub bukan `"idle"`, THE Subtraction_Page SHALL menjadikan kedua input sebagai read-only sehingga nilai tidak berubah.
4. WHEN nilai bil1 adalah `0` DAN nilai bil2 adalah `0`, THE Subtraction_Page SHALL menonaktifkan tombol "Kurangkan" sehingga tombol tidak dapat diklik.
5. WHEN nilai bil1 tidak sama dengan `0` ATAU nilai bil2 tidak sama dengan `0`, THE Subtraction_Page SHALL mengaktifkan tombol "Kurangkan" sehingga tombol dapat diklik.
6. IF nilai yang dimasukkan pengguna di luar rentang `[−9.999, +9.999]`, THEN THE Subtraction_Page SHALL membulatkan nilai ke batas terdekat (`−9.999` atau `+9.999`).
7. THE Subtraction_Input_Panel SHALL menampilkan label dengan nama tipe chip dan warna biru (`text-intblue`) jika bil1 positif, warna pink (`text-intpink`) jika bil1 negatif, dan warna abu-abu jika bil1 adalah nol.
8. THE Subtraction_Input_Panel SHALL menampilkan label `"Pengurang"` pada bil2 dengan warna biru (`text-intblue`) jika bil2 positif dan warna pink (`text-intpink`) jika bil2 negatif, mencerminkan nilai sebelum konversi.

---

### Requirement 2: Logika Konversi Pengurang

**User Story:** Sebagai siswa, saya ingin melihat bagaimana pengurang diubah menjadi lawannya, sehingga saya memahami konsep `a − b = a + (−b)`.

#### Acceptance Criteria

1. WHEN pengguna menekan tombol "Kurangkan" dengan bil2 tidak sama dengan `0`, THE Subtraction_Hook SHALL menghitung `b_konversi = −bil2` dan menyimpan hasilnya sebelum memulai animasi.
2. IF bil2 bernilai positif, THEN THE Subtraction_Hook SHALL menetapkan `b_konversi` sebagai nilai negatif yang sama besarnya dengan bil2, merepresentasikan Kuman.
3. IF bil2 bernilai negatif, THEN THE Subtraction_Hook SHALL menetapkan `b_konversi` sebagai nilai positif yang sama besarnya dengan bil2, merepresentasikan Antibodi.
4. IF bil2 bernilai `0`, THEN THE Subtraction_Hook SHALL menetapkan `b_konversi = 0` tanpa mengubah tanda, dan memperlakukan hasil operasi sebagai `bil1 + 0 = bil1`.
5. WHEN pengguna menekan tombol "Kurangkan", THE Subtraction_Hook SHALL menyimpan snapshot berisi `{ bil1, bil2_original: bil2, bil2_converted: b_konversi }` sebelum memulai animasi.
6. FOR ALL pasangan nilai bil1 dan bil2 yang valid, THE Subtraction_Hook SHALL memastikan `bil1 + b_konversi` sama dengan `bil1 − bil2` (properti round-trip konversi).

---

### Requirement 3: Fase Transformasi Visual

**User Story:** Sebagai siswa, saya ingin melihat animasi chip "berubah" saat pengurang dibalik tandanya, sehingga saya dapat memahami mengapa pengurangan sama dengan penjumlahan dengan lawan.

#### Acceptance Criteria

1. WHEN pengguna menekan tombol "Kurangkan" dan bil2 tidak sama dengan `0`, THE Subtraction_Page SHALL memasuki VizPhase_Sub `"transform"` sebelum `"battle"`.
2. WHEN VizPhase_Sub adalah `"transform"`, THE Transform_Panel SHALL menampilkan chip bil2 dengan animasi flip/morph yang menunjukkan perubahan tipe dari Antibodi ke Kuman atau dari Kuman ke Antibodi, sesuai tanda bil2.
3. WHEN VizPhase_Sub adalah `"transform"`, THE Transform_Panel SHALL menampilkan label teks dalam format `+N → −N` jika bil2 positif atau `−N → +N` jika bil2 negatif, di mana N adalah nilai absolut bil2.
4. WHEN VizPhase_Sub adalah `"transform"` dan AnimMode adalah `"auto"`, THE Subtraction_Page SHALL secara otomatis beralih ke VizPhase_Sub `"battle"` setelah seluruh animasi transformasi selesai, dalam durasi tidak lebih dari 1500ms pada kecepatan 1×.
5. WHEN VizPhase_Sub adalah `"transform"` dan AnimMode adalah `"click"`, THE Subtraction_Page SHALL menampilkan tombol "Lanjut ▶" dan menunggu pengguna menekan tombol tersebut sebelum beralih ke VizPhase_Sub `"battle"`.
6. WHEN bil2 sama dengan `0` dan pengguna menekan "Kurangkan", THE Subtraction_Page SHALL melewati VizPhase_Sub `"transform"` dan langsung beralih ke VizPhase_Sub `"done"` tanpa menampilkan Transform_Panel.
7. IF animasi transformasi chip tidak selesai dalam 3000ms pada kecepatan 1×, THEN THE Subtraction_Page SHALL membatalkan animasi, menampilkan chip dalam kondisi sudah bertransformasi, dan melanjutkan ke VizPhase_Sub `"battle"`.

---

### Requirement 4: Animasi Battle dan Netralisasi Zero-Pair

**User Story:** Sebagai siswa, saya ingin melihat proses netralisasi zero-pair antara bil1 dan bil2 yang telah dikonversi, sehingga saya dapat memahami hasil pengurangan.

#### Acceptance Criteria

1. WHEN VizPhase_Sub beralih ke `"battle"`, THE Subtraction_Page SHALL menggunakan `snapTotalPos = max(0, bil1) + max(0, b_konversi)` dan `snapTotalNeg = max(0, −bil1) + max(0, −b_konversi)` untuk menentukan jumlah chip yang bertempur.
2. WHEN `snapTotalPos` lebih dari `0` dan `snapTotalNeg` lebih dari `0`, THE Subtraction_Page SHALL menampilkan `ArenaPanel` dengan animasi zero-pair neutralization menggunakan komponen yang sudah ada tanpa modifikasi.
3. IF `snapTotalPos` sama dengan `0` ATAU `snapTotalNeg` sama dengan `0` setelah konversi, THEN THE Subtraction_Page SHALL menetapkan VizPhase_Sub ke `"done"` dalam satu siklus render tanpa menampilkan `ArenaPanel`.
4. THE Subtraction_Page SHALL menggunakan kembali komponen `ArenaBattle`, `ArenaCenter`, `ArenaDone`, `CharacterColumn`, `TierLegend` tanpa modifikasi.
5. THE Subtraction_Page SHALL menggunakan kembali utilitas `buildTierGroups`, `computeNextStep`, dan `computeInitialStep` tanpa modifikasi.
6. WHEN AnimMode adalah `"auto"`, THE Subtraction_Page SHALL menjalankan setiap pasangan zero-pair secara berurutan tanpa interaksi pengguna dengan jeda 100ms antar pasangan, hingga seluruh pasangan zero-pair habis diproses.
7. WHEN AnimMode adalah `"click"`, THE Subtraction_Page SHALL menampilkan tombol "Lanjut ▶" yang dinonaktifkan selama animasi pasangan berlangsung, mengaktifkan kembali tombol setelah pasangan selesai, dan menyembunyikan tombol setelah seluruh pasangan zero-pair habis diproses.

---

### Requirement 5: Tampilan Hasil (ResultPanel)

**User Story:** Sebagai siswa, saya ingin melihat hasil akhir pengurangan dalam format persamaan, sehingga saya dapat memverifikasi jawaban saya.

#### Acceptance Criteria

1. THE Subtraction_Page SHALL menampilkan `ResultPanel` yang menunjukkan persamaan lengkap dalam format `bil1 − bil2 = hasil`.
2. WHEN VizPhase_Sub adalah `"done"`, THE ResultPanel SHALL menampilkan nilai `remaining` sebagai hasil akhir, menggantikan placeholder `?`.
3. WHEN `remaining` bernilai lebih besar dari `0`, THE ResultPanel SHALL menampilkan nilai `remaining` dengan warna biru (`text-intblue`) disertai karakter Antibodi.
4. WHEN `remaining` bernilai kurang dari `0`, THE ResultPanel SHALL menampilkan nilai `remaining` dengan warna pink (`text-intpink`) disertai karakter Kuman.
5. WHEN `remaining` bernilai `0`, THE ResultPanel SHALL menampilkan nilai `0` dengan warna hijau (`text-success`) tanpa karakter Antibodi maupun Kuman.
6. WHILE VizPhase_Sub bukan `"done"`, THE ResultPanel SHALL menampilkan karakter `?` sebagai placeholder pada posisi hasil dalam persamaan.

---

### Requirement 6: Kontrol Animasi (Replay, Reset, Kecepatan)

**User Story:** Sebagai siswa, saya ingin mengulang dan mengontrol animasi, sehingga saya dapat belajar dengan kecepatan saya sendiri.

#### Acceptance Criteria

1. WHEN VizPhase_Sub adalah `"done"` atau snapshot tidak null, THE Subtraction_Input_Panel SHALL menampilkan tombol "Putar ulang ↺" yang dapat diklik untuk mengulang animasi dengan nilai yang sama.
2. WHEN pengguna menekan "Putar ulang ↺", THE Subtraction_Page SHALL mereset status animasi dan memulai ulang dari fase `"transform"` jika nilai `bil2` dari snapshot lebih dari `0`, atau dari fase `"battle"` jika `bil2` dari snapshot adalah `0`, menggunakan nilai bil1 dan bil2 dari snapshot.
3. WHEN VizPhase_Sub adalah `"done"` atau snapshot tidak null, THE Subtraction_Input_Panel SHALL menampilkan tombol "Input Kembali 🔄" yang dinonaktifkan selama animasi berlangsung.
4. WHEN pengguna menekan "Input Kembali 🔄", THE Subtraction_Page SHALL mereset bil1 dan bil2 ke nilai awal kosong, menghapus snapshot, dan mengembalikan panel ke VizPhase_Sub `"idle"` sehingga dapat menerima input baru.
5. WHEN VizPhase_Sub adalah `"battle"`, THE Subtraction_Input_Panel SHALL menampilkan kontrol kecepatan dengan pilihan `0.5×`, `1×`, `2×`, dengan `1×` sebagai pilihan default yang dipilih.
6. WHEN pengguna memilih kecepatan animasi, THE Subtraction_Page SHALL menerapkan kecepatan tersebut pada `PairReactionStage` saat ini dan semua pasangan berikutnya dalam sesi yang sama, di mana `0.5×` berarti durasi dua kali lipat dan `2×` berarti durasi setengahnya, hingga pengguna mereset ke `"idle"`.

---

### Requirement 7: Persistensi Mode Animasi

**User Story:** Sebagai siswa, saya ingin preferensi mode animasi saya tersimpan, sehingga saya tidak perlu mengaturnya ulang setiap kali membuka halaman.

#### Acceptance Criteria

1. WHEN pengguna memuat halaman `/model-chip/pengurangan`, THE Subtraction_Page SHALL membaca nilai `AnimMode` dari `sessionStorage` dengan key `"subtractionChipAnimMode"` dan menerapkannya jika nilainya adalah `"auto"` atau `"click"`.
2. IF key `"subtractionChipAnimMode"` tidak ditemukan di `sessionStorage` atau bernilai selain `"auto"` atau `"click"`, THEN THE Subtraction_Page SHALL menggunakan `"auto"` sebagai default.
3. WHEN pengguna mengubah `AnimMode` melalui kontrol UI yang tersedia, THE Subtraction_Page SHALL menyimpan nilai baru ke `sessionStorage` dengan key `"subtractionChipAnimMode"`.
4. IF `sessionStorage` tidak tersedia (SSR atau private browsing), THEN THE Subtraction_Page SHALL mengabaikan error tanpa exception yang tidak tertangani dan menggunakan default `"auto"`.

---

### Requirement 8: Routing dan Navigasi

**User Story:** Sebagai siswa, saya ingin mengakses modul pengurangan dari halaman materi dan dapat kembali dengan mudah, sehingga navigasi terasa konsisten.

#### Acceptance Criteria

1. THE Subtraction_Page SHALL dapat diakses melalui route `/model-chip/pengurangan` dengan respons HTTP 200 dan konten halaman yang dirender dalam 3 detik.
2. THE Subtraction_Page SHALL memiliki `layout.tsx` dengan metadata `title` bernilai `"Model Chip Pengurangan"` dan `description` yang memuat teks konsep `a − b = a + (−b)`.
3. WHEN pengguna menekan tombol back pada Subtraction_Page, THE System SHALL menavigasi pengguna ke halaman `/materi` tanpa kehilangan state navigasi browser.
4. THE Materi_Page SHALL menampilkan elemen link yang dapat diklik via keyboard menuju `/model-chip/pengurangan` di dalam bagian Pengurangan → Model Chip.
5. IF link pada bagian Pengurangan → Model Chip di Materi_Page mengarah ke URL selain `/model-chip/pengurangan`, THEN THE Materi_Page SHALL memperbarui href link tersebut menjadi `/model-chip/pengurangan`.

---

### Requirement 9: Aksesibilitas dan Informasi Kontekstual

**User Story:** Sebagai siswa, saya ingin memahami konsep pengurangan yang divisualisasikan, sehingga pembelajaran efektif.

#### Acceptance Criteria

1. THE Subtraction_Page SHALL menampilkan info banner yang memuat penjelasan: (1) bilangan positif = Antibodi 🔵, (2) bilangan negatif = Kuman 🔴, dan (3) pengurang selalu dibalik tandanya.
2. THE Subtraction_Page SHALL menampilkan heading dengan teks `"Model Chip Pengurangan"` menggunakan tag `<h1>` sebagai elemen pertama dalam hierarki heading halaman.
3. THE Transform_Panel SHALL menyertakan atribut `aria-label` pada container animasi yang mendeskripsikan perubahan tipe chip dalam format "Ubah [jumlah] chip [tipe asal] menjadi [tipe tujuan]".
4. THE Subtraction_Input_Panel SHALL menyertakan atribut `aria-label` pada setiap field input yang menyebutkan perannya (minuend atau pengurang) dan rentang nilai yang diterima.
5. WHEN animasi sedang berjalan, THE Subtraction_Input_Panel SHALL menampilkan elemen teks bertanda `aria-live="polite"` yang memuat teks `"Animasi berjalan..."` dan menonaktifkan semua kontrol input.
6. WHEN animasi selesai, THE Subtraction_Input_Panel SHALL menghapus teks `"Animasi berjalan..."` dari elemen `aria-live` dan mengaktifkan kembali semua kontrol input.

---

### Requirement 10: Konsistensi Gaya Visual

**User Story:** Sebagai pengguna aplikasi, saya ingin halaman pengurangan memiliki tampilan yang konsisten dengan modul lainnya, sehingga pengalaman belajar terasa kohesif.

#### Acceptance Criteria

1. THE Subtraction_Page SHALL menggunakan token warna `intblue`, `intpink`, `surface`, dan `border` pada semua elemen UI yang setara dengan modul penjumlahan model chip.
2. THE Subtraction_Page SHALL menggunakan `style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}` pada elemen heading `<h1>` dan semua elemen bertipe title, konsisten dengan modul lainnya.
3. THE Transform_Panel SHALL tidak mengimpor package animasi eksternal yang tidak ada di `package.json` proyek; semua efek animasi SHALL menggunakan kelas Tailwind atau keyframe CSS yang sudah ada di proyek.
4. IF kelas CSS baru diperlukan untuk animasi transformasi chip, THEN THE implementasi SHALL mendefinisikannya di file `app/animations.css` yang sudah ada, bukan di inline style atau file CSS baru.
