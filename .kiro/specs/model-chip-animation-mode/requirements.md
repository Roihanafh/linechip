# Requirements Document

## Introduction

Fitur ini menambahkan pilihan **mode animasi** pada halaman Model Zero-Pair (`app/model-chip/page.tsx`). Saat ini animasi berjalan otomatis menggunakan rantai `setTimeout`. Dengan fitur ini, pengguna dapat memilih antara:

- **Mode Otomatis** — animasi berjalan sendiri seperti perilaku saat ini, antar pasangan dipisahkan oleh jeda waktu yang disesuaikan dengan kecepatan yang dipilih.
- **Mode Klik (Manual)** — setiap pasangan reaksi hanya dimulai setelah pengguna menekan tombol "Lanjut"; animasi `PairReactionStage` tetap berjalan penuh untuk tiap pasangan, hanya perpindahan antar pasangan yang dikendalikan pengguna.

Kontrol kecepatan (0.5×, 1×, 2×) tersedia di **kedua mode** selama animasi berlangsung.

Target pengguna adalah siswa SMP awal sehingga antarmuka harus intuitif, menggunakan label bahasa Indonesia yang jelas.

---

## Glossary

- **AnimationMode_Selector**: Komponen atau elemen UI yang memungkinkan pengguna memilih mode animasi sebelum memulai animasi.
- **Mode_Otomatis**: Mode di mana `Page` memajukan pasangan berikutnya secara otomatis setelah satu siklus `PairReactionStage` selesai, menggunakan mekanisme `setTimeout` yang sudah ada.
- **Mode_Klik**: Mode di mana `Page` menunggu konfirmasi pengguna (tombol "Lanjut") sebelum memulai pasangan berikutnya.
- **Speed_Control**: Kontrol 3-tombol (0.5×, 1×, 2×) yang mengatur kecepatan pemutaran animasi.
- **PairReactionStage**: Komponen animasi satu pasangan karakter (approach → impact → recoil → dissolve → done).
- **Page**: Halaman `app/model-chip/page.tsx` beserta seluruh state machine-nya.
- **Tombol_Lanjut**: Tombol yang hanya muncul di Mode_Klik, menekannya memulai pasangan animasi berikutnya.
- **VizPhase**: Fase tampilan halaman: `idle | battle | center | done`.
- **runPair**: Fungsi internal `Page` yang mengorkestrasi urutan pasangan reaksi.
- **onDone callback**: Callback yang dipanggil oleh `PairReactionStage` saat satu siklus animasi penuh (approach → dissolve → done) telah selesai.

---

## Requirements

### Requirement 1: Pemilihan Mode Animasi

**User Story:** Sebagai siswa sno, saya ingin memilih cara animasi berjalan sebelum menekan "Pasangkan", agar saya bisa belajar sesuai kecepatan saya sendiri.

#### Acceptance Criteria

1. WHEN `VizPhase` bernilai `idle`, THE `AnimationMode_Selector` SHALL menampilkan tepat dua pilihan: "Otomatis 🤖" dan "Klik ▶", di mana setiap pilihan dapat dipilih melalui klik atau sentuh.
2. THE `AnimationMode_Selector` SHALL menampilkan pilihan yang sedang aktif dengan penanda visual yang membedakannya dari pilihan tidak aktif, berupa kombinasi minimal dua dari: warna latar berbeda, border dengan ketebalan ≥ 2px, atau ikon centang.
3. THE `Page` SHALL mempertahankan pilihan mode animasi yang terakhir dipilih pengguna menggunakan `sessionStorage`, sehingga pilihan tetap sama setelah pengguna menekan "Ulangi" selama tab browser yang sama masih terbuka.
4. WHEN pengguna memilih salah satu mode animasi, THE `AnimationMode_Selector` SHALL memperbarui penanda visual pilihan aktif dalam waktu ≤ 100ms tanpa memuat ulang halaman.
5. IF `VizPhase` bukan `idle`, THEN THE `AnimationMode_Selector` SHALL menonaktifkan interaksi perubahan mode sehingga klik atau sentuh pada pilihan mana pun tidak mengubah mode yang aktif, sampai `VizPhase` kembali ke `idle`.
6. IF `sessionStorage` tidak tersedia atau gagal dibaca, THEN THE `Page` SHALL menggunakan "Otomatis 🤖" sebagai pilihan mode animasi default.

---

### Requirement 2: Mode Otomatis

**User Story:** Sebagai siswa smp, saya ingin animasi berjalan sendiri tanpa harus menekan tombol apa pun, agar saya bisa fokus mengamati proses netralisasi.

#### Acceptance Criteria

1. WHEN Mode_Otomatis dipilih dan pengguna menekan "Pasangkan", THE `Page` SHALL memulai `runPair` yang, setelah menerima `onDone callback` dari `PairReactionStage`, menjadwalkan pasangan berikutnya menggunakan `setTimeout` dengan jeda 100ms sebelum memanggil `runPair` berikutnya.
2. WHILE `VizPhase` bernilai `battle` dan Mode_Otomatis aktif, THE `Speed_Control` SHALL ditampilkan sehingga pengguna dapat mengubah kecepatan.
3. WHEN pengguna mengubah kecepatan melalui `Speed_Control` selama Mode_Otomatis berjalan, THE `Page` SHALL menyelesaikan siklus `PairReactionStage` yang sedang berjalan pada kecepatan lama terlebih dahulu, kemudian menerapkan kecepatan baru pada pasangan animasi berikutnya.
4. WHILE Mode_Otomatis aktif dan `VizPhase` bernilai `battle`, THE `Page` SHALL tidak menampilkan `Tombol_Lanjut` dan tidak memerlukan interaksi pengguna apa pun untuk memajukan ke pasangan berikutnya.
5. WHEN Mode_Otomatis aktif dan semua pasangan telah selesai bereaksi, THE `Page` SHALL secara otomatis memajukan `VizPhase` ke `center` kemudian ke `done` menggunakan timer yang sama seperti implementasi asli (2000ms untuk center, 2500ms total).
6. THE `Speed_Control` SHALL tidak muncul saat `VizPhase` bernilai `idle` atau `done`, hanya tampil saat `VizPhase` bernilai `battle`.

---

### Requirement 3: Mode Klik (Manual)

**User Story:** Sebagai siswa smp, saya ingin mengontrol kapan animasi berikutnya dimulai dengan menekan tombol, agar saya punya waktu untuk memahami setiap langkah reaksi.

#### Acceptance Criteria

1. WHEN Mode_Klik dipilih dan pengguna menekan "Pasangkan", THE `Page` SHALL memulai `PairReactionStage` untuk pasangan pertama secara langsung tanpa menunggu input tambahan; `Tombol_Lanjut` belum dirender saat `VizPhase` belum bernilai `battle`.
2. WHILE Mode_Klik aktif dan satu siklus `PairReactionStage` sedang berjalan (sebelum `onDone callback` diterima), THE `Tombol_Lanjut` SHALL memiliki atribut `disabled` sehingga klik atau sentuh pada tombol tidak memicu pasangan berikutnya.
3. WHEN `onDone callback` dari `PairReactionStage` diterima dalam Mode_Klik dan masih ada pasangan yang belum bereaksi, THE `Tombol_Lanjut` SHALL dihapus atribut `disabled`-nya sehingga dapat ditekan pengguna.
4. WHEN pengguna menekan `Tombol_Lanjut` yang aktif dalam Mode_Klik, THE `Page` SHALL segera memulai `PairReactionStage` untuk pasangan berikutnya dan menonaktifkan `Tombol_Lanjut` kembali.
5. WHEN `onDone callback` dari `PairReactionStage` diterima dalam Mode_Klik dan tidak ada lagi pasangan yang belum bereaksi, THE `Page` SHALL secara otomatis memajukan `VizPhase` ke `center` setelah 2000ms kemudian ke `done` setelah 2500ms tanpa memerlukan klik tambahan dari pengguna.
6. WHILE `VizPhase` bernilai `battle` dan Mode_Klik aktif, THE `Speed_Control` SHALL ditampilkan di samping atau di bawah `Tombol_Lanjut` sehingga pengguna dapat mengubah kecepatan kapan saja, termasuk saat `Tombol_Lanjut` sedang dinonaktifkan.
7. WHEN pengguna mengubah kecepatan melalui `Speed_Control` dalam Mode_Klik, THE `Page` SHALL menerapkan kecepatan baru hanya pada `PairReactionStage` berikutnya yang dimulai setelah `Tombol_Lanjut` ditekan; kecepatan perubahan TIDAK mempengaruhi siklus `PairReactionStage` yang sedang berjalan.

---

### Requirement 4: Kontrol Kecepatan di Kedua Mode

**User Story:** Sebagai siswa smp, saya ingin bisa mengatur kecepatan animasi di mode apa pun yang saya pilih, agar saya bisa memperlambat animasi jika sulit dipahami.

#### Acceptance Criteria

1. WHILE `VizPhase` bernilai `battle`, THE `Speed_Control` SHALL selalu ditampilkan tanpa memandang mode animasi aktif (Mode_Otomatis maupun Mode_Klik).
2. THE `Speed_Control` SHALL menyediakan tepat tiga pilihan kecepatan dengan nilai: 0.5, 1, dan 2 (diteruskan sebagai angka ke prop `speed` pada `PairReactionStage`).
3. THE `Page` SHALL menampilkan pilihan kecepatan yang sedang aktif dengan penanda visual berupa latar berwarna `intblue` dan teks putih, sedangkan pilihan tidak aktif memiliki latar transparan dengan teks `slate-400`.
4. WHEN pengguna memilih kecepatan baru melalui `Speed_Control`, THE `Page` SHALL menyimpan nilai kecepatan baru ke dalam state `animSpeed` dan memperbarui `animSpeedRef.current`, sehingga nilai tersebut tersedia untuk `PairReactionStage` berikutnya.
5. IF `PairReactionStage` sedang dirender dengan prop `key` yang mengandung nilai `animSpeed` dan pengguna mengubah `animSpeed` saat fase `approach` masih berjalan, THEN `PairReactionStage` SHALL me-restart siklus animasi dengan kecepatan baru karena perubahan `key` menyebabkan unmount dan remount komponen.
6. IF `VizPhase` bernilai `idle` atau `done`, THEN THE `Speed_Control` SHALL TIDAK ditampilkan kepada pengguna.

---

### Requirement 5: Konsistensi Antarmuka dan Aksesibilitas Dasar

**User Story:** Sebagai siswa smp, saya ingin antarmuka mode animasi mudah dimengerti, agar saya tidak bingung saat menggunakannya.

#### Acceptance Criteria

1. THE `AnimationMode_Selector` SHALL menggunakan label teks dalam bahasa Indonesia yang jelas dan ringkas, dengan panjang antara 1 hingga 3 kata per pilihan (tidak termasuk emoji).
2. WHILE `Mode_Klik` aktif DAN `VizPhase` bernilai `battle`, THE `Tombol_Lanjut` SHALL menampilkan teks "Lanjut ▶" dan dapat dilihat oleh pengguna.
3. IF `Mode_Klik` tidak aktif ATAU `VizPhase` tidak bernilai `battle`, THEN THE `Page` SHALL menyembunyikan `Tombol_Lanjut` sepenuhnya sehingga tidak terlihat dan tidak dapat difokus melalui keyboard.
4. THE `Tombol_Lanjut` SHALL memiliki atribut `aria-label` bernilai "Mulai animasi pasangan berikutnya".
5. THE `AnimationMode_Selector` SHALL memiliki atribut `role="group"` dan `aria-label="Pilih mode animasi"`.
6. WHILE `Tombol_Lanjut` dalam keadaan dinonaktifkan (atribut `disabled` ada), THE `Page` SHALL menampilkan `Tombol_Lanjut` dengan opacity sebesar 40% atau kurang sehingga pengguna dapat membedakannya dari tombol yang aktif.
