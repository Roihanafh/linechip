# Requirements Document

## Introduction

Fitur ini memodifikasi flow animasi pada dua modul model-chip (penjumlahan `/model-chip` dan pengurangan `/model-chip/pengurangan`) agar setiap angka direpresentasikan oleh **chip tier tertinggi yang tepat** — misalnya angka 10 ditampilkan sebagai 1 chip ×10, bukan 10 chip ×1. Ketika chip tier-tinggi harus bertarung dengan chip lawan yang tier-nya lebih rendah (atau jumlahnya kurang dari nilai tier tersebut), chip tersebut **luruh (decompose)** terlebih dahulu menjadi chip-chip tier bawahnya sebelum reaksi netralisasi berlangsung. Proses luruh mengikuti animMode yang sudah ada (auto/click) dan tetap kompatibel dengan komponen `PairReactionStage` yang sudah ada.

---

## Glossary

- **Chip**: Representasi visual satu unit dalam sistem model chip. Setiap chip memiliki tier dan tipe (Antibodi atau Kuman).
- **Tier**: Nilai posisional sebuah chip: `1` (satuan), `10` (puluhan), `100` (ratusan), `1000` (ribuan).
- **Chip_Tier_Tinggi**: Chip dengan nilai tier > 1 (puluhan, ratusan, ribuan).
- **Decompose / Luruh**: Proses sebuah Chip_Tier_Tinggi pecah menjadi sejumlah chip tier tepat di bawahnya (×1000 → 10×100, ×100 → 10×10, ×10 → 10×1).
- **TierGroup**: Struktur data `{ tier: 1|10|100|1000, count: number }` yang merepresentasikan kelompok chip satu tier milik satu bilangan.
- **ChipLayout**: Representasi visual kumpulan chip suatu bilangan, dirender oleh `CharacterColumn`.
- **ArenaBattle**: Komponen yang mengorkestrasi `PairReactionStage` antar satu pasang chip yang sedang bereaksi.
- **PairReactionStage**: Komponen animasi kanvas satu pasang chip bertarung (approach → impact → recoil → dissolve).
- **DecomposeStage**: Komponen animasi baru yang menampilkan sebuah Chip_Tier_Tinggi pecah menjadi chip-chip tier bawahnya.
- **StepPhase**: Fase dalam satu langkah animasi. Nilai lama: `"approach"`, `"clash"`, `"clear"`. Nilai baru: tambah `"decompose"`.
- **AnimMode**: Mode jalannya animasi: `"auto"` (otomatis berurutan) atau `"click"` (tunggu klik user per langkah).
- **VizPhase**: Fase visualisasi halaman: `"idle"`, `"battle"`, `"center"`, `"done"`.
- **BattlePlan**: Struktur data baru yang mendeskripsikan seluruh urutan langkah battle (pasangan mana yang luruh, pasangan mana yang langsung bereaksi).
- **Orchestrator**: Hook yang mengelola urutan animasi battle — `useAnimationOrchestrator` (penjumlahan) dan `useSubtractionOrchestrator` (pengurangan).
- **Snapshot**: State beku bilangan saat tombol "Pasangkan" pada penjumlahan/"Pasangkan" pada pengurangan ditekan, digunakan untuk replay.

---

## Requirements

---

### Requirement 1: Representasi Chip Tier-Tertinggi pada ChipLayout

**User Story:** Sebagai siswa, saya ingin melihat bilangan direpresentasikan dengan chip tier tertinggi yang tepat sebelum animasi dimulai, sehingga saya memahami nilai posisional setiap angka.

#### Acceptance Criteria

1. THE `ChipLayout` SHALL menampilkan setiap bilangan sebagai kumpulan chip dengan tier tertinggi yang mungkin: untuk setiap angka `n`, chip yang ditampilkan adalah hasil dekomposisi `n = a×1000 + b×100 + c×10 + d×1` (nilai posisional), bukan `n` buah chip satuan.
2. THE `ChipLayout` SHALL menampilkan chip ×1000, ×100, ×10, dan ×1 dalam urutan dari tier tertinggi ke terendah secara vertikal.
3. WHEN sebuah bilangan bernilai 0, THE `ChipLayout` SHALL menampilkan teks "tidak ada" menggantikan deret chip.
4. THE `ChipLayout` SHALL menggunakan karakter SVG yang sesuai dengan tier chip: `"ribuan"` untuk ×1000, `"ratusan"` untuk ×100, `"puluhan"` untuk ×10, `"satuan"` untuk ×1.
5. WHEN jumlah chip pada satu tier melebihi 9, THE `ChipLayout` SHALL menampilkan 9 chip beserta label `+N` untuk chip yang tersisa, di mana N adalah selisih jumlah chip dengan 9.

---

### Requirement 2: Komputasi BattlePlan dari Dua Bilangan

**User Story:** Sebagai pengembang, saya ingin sistem menghitung BattlePlan dari nilai bil1 dan bil2 secara terpisah, sehingga urutan luruh dan reaksi dapat ditentukan dengan benar.

#### Acceptance Criteria

1. THE `BattlePlanner` SHALL menerima `bil1: number` dan `bil2: number` sebagai input dan menghasilkan `BattlePlan`.
2. THE `BattlePlanner` SHALL menentukan tipe setiap bilangan: bilangan ≥ 0 bertipe Antibodi, bilangan < 0 bertipe Kuman.
3. THE `BattlePlanner` SHALL hanya menghasilkan langkah-langkah battle ketika sisi positif total (totalPos) > 0 **dan** sisi negatif total (totalNeg) > 0; jika salah satu adalah 0, `BattlePlan` SHALL berisi array langkah kosong.
4. THE `BattlePlanner` SHALL menghitung jumlah pasangan netral sebagai `pairs = Math.min(totalPos, totalNeg)`.
5. THE `BattlePlanner` SHALL menghasilkan langkah-langkah dalam urutan tier tertinggi-ke-terendah (1000 → 100 → 10 → 1) mengikuti nilai pasangan.
6. WHEN sebuah chip dari sisi A memiliki tier lebih tinggi daripada chip yang tersedia pada sisi B untuk pasangan tersebut, THE `BattlePlanner` SHALL menyisipkan langkah `"decompose"` sebelum langkah `"pair"` pada tier tersebut.
7. THE `BattlePlanner` SHALL menghasilkan hasil yang deterministik: untuk input yang sama SHALL selalu menghasilkan `BattlePlan` yang identik.
8. FOR ALL pasangan `(bil1, bil2)` yang valid, jumlah total pasangan dalam `BattlePlan` SHALL sama dengan `Math.min(Math.abs(bil1) + Math.abs(bil2) yang bertipe sama, totalPos, totalNeg)`.

---

### Requirement 3: StepPhase Baru — `"decompose"`

**User Story:** Sebagai pengembang, saya ingin ada fase `"decompose"` pada tipe `StepPhase`, sehingga komponen dapat merender animasi luruh secara terpisah dari animasi reaksi.

#### Acceptance Criteria

1. THE `StepPhase` type SHALL mencakup nilai `"decompose"` di samping nilai yang sudah ada (`"approach"`, `"clash"`, `"clear"`).
2. WHEN `stepPhase === "decompose"`, THE `ArenaBattle` SHALL merender `DecomposeStage` sebagai pengganti `PairReactionStage`.
3. WHEN `stepPhase` bukan `"decompose"`, THE `ArenaBattle` SHALL berperilaku identik dengan perilaku sebelumnya.
4. THE `CharacterColumn` SHALL menampilkan chip yang sedang luruh dengan opacity berkurang (dimmed) selama `stepPhase === "decompose"`.
5. WHEN `stepPhase` berpindah dari `"decompose"` ke `"approach"`, THE `CharacterColumn` SHALL menampilkan chip-chip hasil dekomposisi dengan opacity penuh.

---

### Requirement 4: Komponen DecomposeStage — Animasi Luruh

**User Story:** Sebagai siswa, saya ingin melihat animasi visual ketika sebuah chip tier-tinggi luruh menjadi chip-chip tier bawahnya, sehingga saya memahami makna nilai posisional dalam proses netralisasi.

#### Acceptance Criteria

1. THE `DecomposeStage` SHALL menerima props: `chipTier: 1|10|100|1000`, `chipFaction: "ab" | "ku"`, `speed: number`, `onDone: () => void`, dan `runKey: number`.
2. WHEN `DecomposeStage` di-mount, THE `DecomposeStage` SHALL menampilkan satu chip tier-tinggi di tengah arena.
3. THE `DecomposeStage` SHALL menjalankan animasi luruh: chip tier-tinggi bergerak/pecah menjadi sejumlah chip tier tepat di bawahnya (×1000 → 10 chip ×100; ×100 → 10 chip ×10; ×10 → 10 chip ×1).
4. THE `DecomposeStage` SHALL memanggil `onDone()` setelah animasi luruh selesai.
5. THE `DecomposeStage` SHALL menskalakan durasi animasinya dengan nilai `speed` yang diberikan (durasi efektif = durasi_dasar / speed).
6. IF `chipTier === 1`, THEN THE `DecomposeStage` SHALL memanggil `onDone()` segera tanpa menampilkan animasi luruh.
7. THE `DecomposeStage` SHALL menampilkan label teks yang menjelaskan proses luruh, contoh: `"×10 → 10×1"`.

---

### Requirement 5: Integrasi Decompose ke Orchestrator (Penjumlahan)

**User Story:** Sebagai siswa, saya ingin animasi penjumlahan menampilkan proses luruh secara otomatis sebelum reaksi netralisasi, sehingga alur animasi terasa mulus dan konsisten.

#### Acceptance Criteria

1. THE `useAnimationOrchestrator` SHALL menggunakan `BattlePlan` (dari Requirement 2) sebagai pengganti `TierGroup[]` sebagai input urutan animasi.
2. WHEN sebuah langkah dalam `BattlePlan` bertipe `"decompose"`, THE `useAnimationOrchestrator` SHALL menetapkan `stepPhase` ke `"decompose"` dan menunggu `DecomposeStage.onDone` sebelum melanjutkan ke langkah `"pair"`.
3. WHILE `animMode === "auto"` dan langkah bertipe `"decompose"` selesai, THE `useAnimationOrchestrator` SHALL melanjutkan ke langkah `"pair"` berikutnya secara otomatis tanpa jeda tambahan di luar durasi animasi luruh.
4. WHILE `animMode === "click"` dan langkah bertipe `"decompose"` selesai, THE `useAnimationOrchestrator` SHALL menetapkan `waitingForClick` ke `true` dan menunggu `handleNextClick()` sebelum melanjutkan ke langkah `"pair"`.
5. THE `useAnimationOrchestrator` SHALL mempertahankan perilaku `handleReset`, `replayAnimation`, `handlePair`, dan `handlePairDone` yang sudah ada.

---

### Requirement 6: Integrasi Decompose ke Orchestrator (Pengurangan)

**User Story:** Sebagai siswa, saya ingin animasi pengurangan juga menampilkan proses luruh yang konsisten, sehingga pengalaman belajar di kedua halaman terasa seragam.

#### Acceptance Criteria

1. THE `useSubtractionOrchestrator` SHALL meneruskan `BattlePlan` dari `useAnimationOrchestrator` ke komponen-komponen yang memerlukannya, menggunakan `bil2_converted` sebagai nilai bil2 setelah transformasi.
2. WHEN `stepPhase === "decompose"` aktif pada modul pengurangan, THE `useSubtractionOrchestrator` SHALL berperilaku identik dengan `useAnimationOrchestrator` (Requirement 5 Criteria 2–4).
3. THE `useSubtractionOrchestrator` SHALL mempertahankan fase `"transform"` (TransformPanel) yang sudah ada; fase `"decompose"` hanya berlaku setelah fase `"transform"` selesai.

---

### Requirement 7: Pembaruan `buildTierGroups` / `BattlePlanner`

**User Story:** Sebagai pengembang, saya ingin fungsi pembangun rencana battle menerima bil1 dan bil2 secara terpisah, sehingga dekomposisi chip dapat dilakukan per-bilangan dan bukan hanya dari total pasangan.

#### Acceptance Criteria

1. THE `BattlePlanner` SHALL menerima `bil1: number` dan `bil2: number` sebagai dua argumen terpisah, menggantikan pendekatan `buildTierGroups(totalPairs)` yang hanya menerima total pasangan.
2. THE `BattlePlanner` SHALL mendekomposisi setiap bilangan secara independen ke tier group masing-masing sebelum menghitung pasangan.
3. THE `BattlePlanner` SHALL tetap dapat digunakan sebagai pure function tanpa side effect.
4. FOR ALL pasangan input `(bil1, bil2)` di mana `bil1` dan `bil2` berlawanan tanda, `buildTierGroups(Math.min(|bil1|, |bil2|))` (fungsi lama) dan `BattlePlanner(bil1, bil2)` SHALL menghasilkan jumlah pasangan total yang sama.
5. THE `BattlePlanner` SHALL mengekspor tipe `BattlePlan` dan `BattleStep` sehingga dapat diimpor oleh Orchestrator dan komponen arena.

---

### Requirement 8: Perilaku ChipLayout Selama Battle

**User Story:** Sebagai siswa, saya ingin kolom chip di arena menunjukkan perubahan visual yang akurat saat luruh dan reaksi terjadi, sehingga saya dapat mengikuti alur netralisasi.

#### Acceptance Criteria

1. WHEN `stepPhase === "decompose"` dan sebuah chip dari tier tertentu sedang luruh, THE `CharacterColumn` SHALL menampilkan chip tersebut dengan opacity dimmed (misalnya `opacity-25`).
2. WHEN `stepPhase` berpindah ke `"approach"` setelah luruh, THE `CharacterColumn` SHALL menampilkan chip-chip hasil dekomposisi dengan opacity penuh sebagai bagian dari tier baru yang aktif.
3. WHEN chip sudah ternetralisasi (luruh dan bereaksi), THE `CharacterColumn` SHALL menampilkan chip tersebut dengan `opacity-0 scale-0` (gone state) sesuai perilaku yang sudah ada.
4. THE `CharacterColumn` SHALL mempertahankan semua perilaku visual yang sudah ada untuk chip yang tidak terlibat dalam langkah aktif saat ini.

---

### Requirement 9: Kompatibilitas dengan `PairReactionStage`

**User Story:** Sebagai pengembang, saya ingin komponen `PairReactionStage` tidak perlu dimodifikasi untuk mendukung fitur luruh, sehingga risiko regresi animasi yang sudah berfungsi dapat diminimalkan.

#### Acceptance Criteria

1. THE `PairReactionStage` SHALL tidak memerlukan perubahan prop interface untuk mendukung fitur dekomposisi.
2. WHEN sebuah chip hasil dekomposisi harus bereaksi dengan lawan, THE `ArenaBattle` SHALL memanggil `PairReactionStage` dengan tier chip hasil dekomposisi (tier bawah) — bukan tier chip sebelum luruh.
3. THE `PairReactionStage` SHALL tetap menerima `leftType` dan `rightType` bertipe `PlaceValue` yang merepresentasikan tier chip saat reaksi berlangsung.

---

### Requirement 10: Pembaruan Kedua Halaman

**User Story:** Sebagai siswa, saya ingin fitur luruh berlaku baik di halaman penjumlahan maupun pengurangan, sehingga pengalaman belajar konsisten di seluruh modul model chip.

#### Acceptance Criteria

1. THE `ModelChipPage` (`/model-chip`) SHALL menggunakan `useAnimationOrchestrator` yang sudah diperbarui dan merender `DecomposeStage` melalui `ArenaBattle` ketika diperlukan.
2. THE `SubtractionPage` (`/model-chip/pengurangan`) SHALL menggunakan `useSubtractionOrchestrator` yang sudah diperbarui dan merender `DecomposeStage` melalui `ArenaBattle` ketika diperlukan.
3. THE `ModelChipPage` dan THE `SubtractionPage` SHALL mempertahankan semua tombol kontrol yang sudah ada: Pasangkan/Kurangkan, Reset, Replay, tombol speed, dan tombol Next (mode click).
4. WHEN `animMode === "click"`, THE `ModelChipPage` dan THE `SubtractionPage` SHALL menampilkan tombol "Next" yang juga aktif selama fase `"decompose"` (bukan hanya fase `"pair"`).

---

### Requirement 11: Animasi Luruh Mengikuti `animSpeed`

**User Story:** Sebagai siswa, saya ingin durasi animasi luruh ikut berubah ketika saya mengatur kecepatan animasi, sehingga semua bagian animasi terasa proporsional.

#### Acceptance Criteria

1. THE `DecomposeStage` SHALL menerima prop `speed: number` dan menggunakannya untuk menskalakan semua durasi internal animasinya.
2. WHEN `animSpeed` berubah di halaman, THE `Orchestrator` SHALL meneruskan nilai `animSpeed` terbaru ke `DecomposeStage` melalui prop `speed`.
3. THE durasi animasi luruh pada `DecomposeStage` SHALL dihitung sebagai `durasi_dasar / speed`, konsisten dengan pola penskalaan yang digunakan oleh `PairReactionStage`.
