# Requirements Document

## Introduction

Halaman `app/model-chip/page.tsx` saat ini berisi ~550 baris kode dalam satu komponen React (`ModelChipPage`) dengan berbagai concern yang tercampur: state management, business logic, animation orchestration, dan rendering seluruh UI. Refactor ini bertujuan memecah komponen tersebut menjadi unit-unit kecil dengan tanggung jawab tunggal — custom hooks untuk state dan animasi, sub-komponen untuk tiap section UI besar, dan helper functions di file tersendiri — sehingga `page.tsx` hanya berperan sebagai thin orchestrator. Tidak ada perubahan fungsionalitas; semua behavior yang terlihat pengguna harus identik sebelum dan sesudah refactor.

## Glossary

- **ModelChipPage**: Komponen halaman utama di `app/model-chip/page.tsx` yang mengorkestrasikan fitur Model Zero-Pair.
- **Thin_Orchestrator**: Komponen/file yang hanya menggabungkan hook dan sub-komponen tanpa mengandung logic atau layout inline yang signifikan.
- **VizPhase**: Enum state animasi utama — `"idle" | "battle" | "center" | "done"`.
- **TierGroup**: Struktur data `{ tier: 1 | 10 | 100 | 1000; count: number }` yang merepresentasikan dekomposisi pasangan netral per nilai-tempat.
- **Step_Machine**: Mekanisme orkestrasi animasi berbasis `setTimeout` yang menggerakkan urutan pasangan bereaksi tier-per-tier.
- **AnimMode**: Mode animasi — `"auto"` (otomatis) atau `"click"` (klik per-pasangan).
- **PairReactionStage**: Komponen animasi satu pasangan (Antibodi vs Kuman) yang sudah ada di `components/game/PairReactionStage.tsx`.
- **Arena**: Area visualisasi yang menampilkan fase battle, center, dan done.
- **Custom_Hook**: React hook (`use*`) yang mengenkapsulasi state dan logic terkait.
- **Sub_Component**: Komponen React yang merender satu section UI besar.
- **Helper_Module**: File TypeScript (non-React) berisi fungsi-fungsi pure utility.

---

## Requirements

### Requirement 1: Ekstraksi State dan Animation Orchestration ke Custom Hook

**User Story:** Sebagai developer, saya ingin state management dan step machine dipindahkan ke custom hook terpisah, agar `page.tsx` bebas dari detail implementasi animasi.

#### Acceptance Criteria

1. THE `useModelChipState` Hook SHALL mengelola seluruh state yang berhubungan dengan input (`bil1`, `bil2`) dan fase visualisasi (`vizPhase`, `snapshot`), serta mengekspos return API: `{ bil1, bil2, setBil1, setBil2, vizPhase, setVizPhase, snapshot, setSnapshot }`.
2. THE `useAnimationOrchestrator` Hook SHALL mengelola state animasi (`tierGroups`, `tierIdx`, `pairInTier`, `stepPhase`, `neutralised`, `animSpeed`, `animMode`, `waitingForClick`, `centerExiting`) beserta fungsi `handlePair`, `replayAnimation`, dan `handleNextClick`, serta mengekspos return API: `{ tierGroups, setTierGroups, tierIdx, pairInTier, stepPhase, neutralised, animSpeed, setAnimSpeed, animMode, setAnimMode, waitingForClick, centerExiting, setCenterExiting, handlePair, replayAnimation, handleNextClick }`.
3. WHEN `useAnimationOrchestrator` melakukan cleanup, THE Hook SHALL membatalkan semua pending `setTimeout` yang dikelolanya melalui ref internal.
4. THE `useAnimationOrchestrator` Hook SHALL menyimpan `animMode` ke `sessionStorage` dengan key `"modelChipAnimMode"` setiap kali nilai `animMode` berubah, dan membaca nilai tersebut di dalam `useEffect` setelah mount; jika key tidak ditemukan, nilai default `"auto"` digunakan.
5. WHEN `page.tsx` menggunakan kedua hook, THE `ModelChipPage` Component SHALL memiliki jumlah baris tidak lebih dari 150 baris.
6. IF hook dieksekusi di lingkungan server-side, THEN THE Hook SHALL menghindari akses ke `sessionStorage` dan `Audio` API — keduanya hanya boleh diakses di dalam `useEffect` atau setelah pengecekan `typeof window !== "undefined"`.

---

### Requirement 2: Ekstraksi Helper Functions ke Module Terpisah

**User Story:** Sebagai developer, saya ingin fungsi-fungsi pure business logic dipindahkan ke file utility tersendiri, agar mudah diuji secara terisolasi.

#### Acceptance Criteria

1. THE `buildTierGroups` Function SHALL dipindahkan ke `lib/model-chip/tierUtils.ts`.
2. THE `inputPanelProps` Function SHALL dipindahkan ke `lib/model-chip/inputPanelProps.ts` dan menerima nilai numerik sebagai parameter — tanpa bergantung pada state React.
3. THE `renderColumn` Function SHALL dikonversi menjadi Sub_Component bernama `CharacterColumn` yang ditempatkan di `components/model-chip/CharacterColumn.tsx`, dengan props eksplisit: `sAbs`, `sPaired`, `sRemaining`, `sType: "ab" | "ku"`, `sColor`, `sSign`, `prefix`, `vizPhase`, `tierGroups`, `tierIdx`, `pairInTier`, `neutralised`, `stepPhase`.
4. THE Helper_Module SHALL mengekspor semua fungsi dan komponen yang dipindahkan sehingga dapat di-import oleh hook maupun sub-komponen lain.
5. WHEN `buildTierGroups` menerima nilai `totalPairs <= 0`, THE Function SHALL mengembalikan array kosong — identik dengan perilaku saat ini.

---

### Requirement 3: Dekomposisi UI menjadi Sub-Komponen

**User Story:** Sebagai developer, saya ingin tiap section UI besar menjadi komponen tersendiri, agar masing-masing dapat dipahami dan dimodifikasi secara independen.

#### Acceptance Criteria

1. THE `TierLegend` Sub_Component SHALL merender section legenda karakter (grid Antibodi dan Kuman per tier) dan tidak membutuhkan prop selain konstan dari `TIERS` / `CHAR_NAMES`.
2. THE `InputPanel` Sub_Component SHALL merender dua input bilangan, selector AnimMode, dan tombol aksi (Pasangkan, Input Kembali, Putar ulang, speed control, Lanjut), serta menerima props: `bil1`, `bil2`, `animMode`, `animSpeed`, `vizPhase`, `snapshot`, `onBil1Change`, `onBil2Change`, `onPair`, `onReset`, `onReplay`, `onAnimModeChange`, `onSpeedChange`, `onNextClick`, `waitingForClick`.
3. IF `snapshot === null`, THEN THE `ArenaPanel` SHALL tidak dirender.
4. THE `ResultPanel` Sub_Component SHALL merender panel ringkasan hasil (`eqBil1 + eqBil2 = remaining`) beserta equation display, dan menerima props: `eqBil1`, `eqBil2`, `remaining`, `vizPhase`, `pairs`.
5. WHEN props `vizPhase` yang diterima `InputPanel` bukan `"idle"`, THE `InputPanel` Sub_Component SHALL menonaktifkan kedua input bilangan, selector AnimMode, dan tombol Pasangkan — perilaku identik dengan implementasi saat ini.
6. WHEN props `vizPhase` yang diterima `ArenaPanel` adalah `"battle"`, THE `ArenaPanel` Sub_Component SHALL merender `PairReactionStage` dan kedua `CharacterColumn`.
7. WHEN props `vizPhase` yang diterima `ArenaPanel` adalah `"center"`, THE `ArenaPanel` Sub_Component SHALL merender ringkasan pasangan netral per tier, total pasangan, dan (jika sisa ≠ 0) nilai sisa.
8. WHEN props `vizPhase` yang diterima `ArenaPanel` adalah `"done"`, THE `ArenaPanel` Sub_Component SHALL merender tampilan hasil akhir dengan karakter sisa.
9. WHEN props `vizPhase` yang diterima `ArenaPanel` adalah `"done"`, THE `ArenaPanel` Sub_Component SHALL merender `CharacterColumn` per sisi beserta summary baris bawah — nilai diambil dari `snapshot`.

---

### Requirement 4: Struktur File dan Penempatan

**User Story:** Sebagai developer, saya ingin file-file baru ditempatkan pada direktori yang konsisten dengan konvensi codebase, agar mudah ditemukan.

#### Acceptance Criteria

1. THE Sub-Komponen Files SHALL ditempatkan di direktori `components/model-chip/` dengan pola penamaan `PascalCase.tsx`.
2. THE Custom Hook Files SHALL ditempatkan di direktori `hooks/model-chip/` dengan pola penamaan `useCamelCase.ts`.
3. THE Helper_Module Files SHALL ditempatkan di direktori `lib/model-chip/` — konsisten dengan `lib/canvas/`.
4. THE `components/model-chip/index.ts` File SHALL mengekspor semua sub-komponen dari direktori tersebut agar import di `page.tsx` ringkas.
5. THE `hooks/model-chip/index.ts` File SHALL mengekspor semua custom hook dari direktori tersebut.
6. WHEN file baru dibuat dengan import yang membentuk siklus antara `page.tsx`, hooks, sub-komponen, dan helper modules, THE Build SHALL gagal (TypeScript error atau ESLint error).

---

### Requirement 5: Preservasi Behavior dan Zero Breaking Change

**User Story:** Sebagai pengguna, saya ingin semua fitur halaman model-chip tetap berfungsi identik setelah refactor, agar pengalaman belajar tidak terganggu.

#### Acceptance Criteria

1. WHEN pengguna menginput bilangan dan menekan tombol Pasangkan, THE Halaman SHALL memulai animasi battle dengan tier terbesar tersedia terlebih dahulu, dan setiap tier diselesaikan penuh sebelum melanjutkan ke tier berikutnya.
2. WHEN animMode adalah `"auto"`, THE Step_Machine SHALL melanjutkan ke pasangan berikutnya secara otomatis setelah menerima `onDone` callback dari `PairReactionStage`, dengan menjadwalkan `runPair` berikutnya menggunakan `setTimeout` dengan delay 100ms.
3. WHEN animMode adalah `"click"`, THE Step_Machine SHALL menunggu user menekan tombol Lanjut sebelum memulai animasi pasangan berikutnya. WHILE menunggu klik, THE Step_Machine SHALL tidak memajukan ke pasangan berikutnya secara otomatis.
4. WHEN tombol Putar ulang ditekan, THE Halaman SHALL mengulang animasi dari awal menggunakan nilai snapshot yang sama — tanpa memerlukan input ulang — dengan me-reset state: `tierIdx=0`, `pairInTier=0`, `stepPhase="approach"`, `neutralised=new Map()`, `waitingForClick=false`, `centerExiting=false`; nilai `bil1` dan `bil2` tidak diubah.
5. WHEN tombol Input Kembali ditekan, THE Halaman SHALL mereset semua state ke kondisi awal: `bil1=0`, `bil2=0`, `vizPhase="idle"`, `snapshot=null`, `centerExiting=false`, `tierGroups=[]`, `tierIdx=0`, `pairInTier=0`, `stepPhase="approach"`, `neutralised=new Map()`, `waitingForClick=false`.
6. WHEN speed diubah (0.5×, 1×, 2×), THE `PairReactionStage` Component SHALL menerima nilai speed yang diperbarui pada render berikutnya.
7. THE `animMode` preference SHALL tetap tersimpan di `sessionStorage` dengan key `"modelChipAnimMode"`, dibaca di dalam `useEffect` setelah mount.
8. WHEN bilangan yang diinput tidak menghasilkan zero-pair (misalnya kedua positif), THE Halaman SHALL langsung berpindah ke fase `"done"` tanpa animasi battle.
9. WHEN kedua bilangan adalah nol, THE Tombol Pasangkan SHALL tetap disabled — identik dengan perilaku saat ini.
10. WHEN halaman di-render di server, THE `useAnimationOrchestrator` Hook SHALL menggunakan initial state `animMode="auto"` dan membaca nilai sessionStorage hanya di dalam `useEffect` setelah mount, sehingga tidak terjadi hydration mismatch.

---

### Requirement 6: Maintainability dan Ukuran File

**User Story:** Sebagai developer, saya ingin setiap file hasil refactor memiliki tanggung jawab yang terfokus dan ukuran yang terkendali, agar mudah di-review dan dimodifikasi.

#### Acceptance Criteria

1. THE `page.tsx` File SHALL memiliki jumlah baris (termasuk baris kosong dan komentar) tidak lebih dari 150 baris setelah refactor.
2. THE Sub_Component Files SHALL masing-masing tidak melebihi 200 baris kode (termasuk baris kosong dan komentar).
3. THE Custom_Hook Files SHALL masing-masing tidak melebihi 150 baris kode (termasuk baris kosong dan komentar).
4. THE Helper_Module Files SHALL hanya mengekspor fungsi pure (tanpa side effect React) kecuali `CharacterColumn` yang merupakan Sub_Component.
5. THE `page.tsx` File SHALL hanya berisi import, deklarasi komponen `ModelChipPage`, pemanggilan hook, dan `return` JSX yang hanya berisi sub-komponen tanpa JSX expression ternary lebih dari satu level nesting.
