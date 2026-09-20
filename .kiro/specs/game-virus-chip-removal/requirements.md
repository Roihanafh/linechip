# Requirements Document

## Introduction

Fitur ini menambahkan kemampuan penghapusan chip individual pada halaman game-virus (`app/game-virus/page.tsx`). Saat ini pengguna hanya bisa menambah chip ke Bilangan 1 atau Bilangan 2, atau mengurungkan chip terakhir via tombol "Undo". Dengan fitur ini, pengguna dapat langsung mengklik chip manapun yang sudah ada di zona bilangan untuk mengurangi nilai bilangan tersebut sebesar tier chip yang diklik — satu unit per klik.

Cakupan perubahan terbatas pada `app/game-virus/page.tsx`: komponen `BilanganZone` (internal) diperluas dengan dukungan klik-per-chip, dan `CharacterChips` dari `CharacterSVGs.tsx` **tidak dimodifikasi** — interaksi klik dikelola lewat prop handler baru yang dioper ke zona bilangan.

## Glossary

- **BilanganZone**: Komponen internal dalam `page.tsx` yang merender satu zona bilangan (Bilangan 1 atau Bilangan 2), beserta chip-chip di dalamnya.
- **Chip**: Satu unit karakter SVG (Antibodi atau Kuman) yang merepresentasikan satu satuan dari suatu tier nilai (1, 10, 100, atau 1000).
- **Tier**: Nilai denominasi chip: 1, 10, 100, atau 1000.
- **bil1Value / bil2Value**: State integer yang menyimpan nilai total masing-masing zona bilangan.
- **Removal_Handler**: Fungsi `removeFromBilangan(bil: 1 | 2, tier: Tier)` baru di dalam `page.tsx` yang mengurangi nilai bilangan dan memperbarui history.
- **Phase_Guard**: Kondisi `phase === "idle" && resultValue === null` — kondisi di mana penambahan dan penghapusan chip diizinkan.
- **Chip_Overlay**: Elemen wrapper baru yang dibuat di dalam `BilanganZone` untuk membungkus setiap chip, menangkap event klik, dan memberikan visual feedback hover.
- **History**: Array `history: HistoryEntry[]` yang mencatat setiap chip yang ditambahkan maupun dihapus, digunakan untuk fitur undo.

---

## Requirements

### Requirement 1: Penghapusan Chip Individual via Klik

**User Story:** Sebagai pemain game-virus, saya ingin mengklik langsung pada chip yang sudah ada di zona bilangan untuk menghapusnya, sehingga saya bisa memperbaiki komposisi bilangan tanpa harus mereset seluruh zona.

#### Acceptance Criteria

1. WHEN pengguna mengklik sebuah chip di `BilanganZone` dan `phase === "idle"` dan `resultValue === null`, THE `Removal_Handler` SHALL mengurangi nilai bilangan yang bersangkutan (`bil1Value` atau `bil2Value`) sebesar satu unit dari `Tier` chip yang diklik, di mana tier dibaca dari atribut `data-tier` pada wrapper chip (`event.currentTarget.dataset.tier`).

2. WHEN pengguna mengklik sebuah chip Antibodi (positif) di `BilanganZone`, THE `Removal_Handler` SHALL mengurangi nilai bilangan sebesar `+tier` (yaitu mengurangi nilai positif) dan SHALL mencatat entri `{ type: "ab", tier, bil }` dengan delta negatif ke dalam `History` sehingga undo dapat membalikkan operasi penghapusan.

3. WHEN pengguna mengklik sebuah chip Kuman (negatif) di `BilanganZone`, THE `Removal_Handler` SHALL menambahkan nilai bilangan sebesar `+tier` (yaitu menghapus kontribusi negatif) dan SHALL mencatat entri `{ type: "ku", tier, bil }` dengan delta positif ke dalam `History` sehingga undo dapat membalikkan operasi penghapusan.

4. WHEN `phase !== "idle"` atau `resultValue !== null`, THE `BilanganZone` SHALL menonaktifkan semua interaksi klik pada chip dengan menambahkan kelas Tailwind `pointer-events-none` ke setiap `Chip_Overlay`.

5. THE `Removal_Handler` SHALL menolak setiap operasi yang akan mengubah tanda bilangan (misalnya dari positif menjadi negatif akibat penghapusan chip Antibodi yang melebihi nilai absolut saat ini), tanpa mengubah state.

---

### Requirement 2: Visual Feedback pada Chip yang Dapat Dihapus

**User Story:** Sebagai pemain game-virus, saya ingin mendapat umpan balik visual saat mengarahkan kursor ke chip di zona bilangan, sehingga saya tahu chip tersebut dapat diklik untuk dihapus.

#### Acceptance Criteria

1. WHILE `phase === "idle"` dan `resultValue === null` dan zona bilangan memiliki nilai bukan nol, THE `Chip_Overlay` SHALL menampilkan indikator visual saat pointer di-hover di atas chip menggunakan kelas `group-hover:opacity-60 group-hover:scale-95` pada `Chip_Overlay` serta elemen `×` kecil yang muncul dengan kelas `group-hover:opacity-100 opacity-0`.

2. WHILE `phase !== "idle"` atau `resultValue !== null`, THE `Chip_Overlay` SHALL menyembunyikan semua indikator hover dan menetapkan `cursor: default` pada setiap chip di zona bilangan (bukan `cursor: not-allowed`, karena chip tidak seharusnya terlihat dapat diklik).

3. THE `Chip_Overlay` SHALL menggunakan kelas CSS Tailwind yang sudah tersedia di proyek untuk efek hover, tanpa menambahkan stylesheet baru.

4. WHEN pengguna mengklik chip dan penghapusan berhasil, THE `BilanganZone` SHALL merender ulang segera dengan nilai bilangan yang sudah diperbarui, tanpa jeda animasi tambahan di luar transisi `300ms` yang sudah ada pada chip.

---

### Requirement 3: Batasan Penghapusan di Bawah Nol

**User Story:** Sebagai sistem game-virus, saya ingin memastikan penghapusan chip tidak menghasilkan nilai yang tidak valid secara logis, sehingga integritas state bilangan tetap terjaga.

#### Acceptance Criteria

1. IF nilai absolut bilangan setelah penghapusan akan menjadi kurang dari 0, THEN THE `Removal_Handler` SHALL tidak mengubah state dan SHALL menampilkan indikator "tidak bisa dihapus" berupa flash merah singkat selama 300ms pada chip yang diklik.

2. IF `nilai_absolut_bilangan mod tier !== 0`, THEN THE `Removal_Handler` SHALL mengabaikan operasi (tier tidak terwakili dalam bilangan saat ini) tanpa mengubah state.

3. IF pengguna mencoba mengklik chip pada zona bilangan yang bernilai nol, THEN THE `Chip_Overlay` SHALL tidak merender chip apapun (karena `CharacterChips` mengembalikan `null` untuk nilai nol), sehingga tidak ada target klik yang tersedia.

4. THE `Removal_Handler` SHALL menjamin atomicity: jika rejection terjadi karena alasan apapun, TIDAK ada perubahan yang dilakukan pada `bil1Value`, `bil2Value`, maupun `History`.

---

### Requirement 4: Isolasi Perubahan — Tidak Memengaruhi Komponen Lain

**User Story:** Sebagai developer, saya ingin perubahan fitur chip-removal terisolasi di `app/game-virus/page.tsx`, sehingga komponen shared dan halaman lain tidak terpengaruh.

#### Acceptance Criteria

1. THE `Removal_Handler` SHALL diimplementasikan sepenuhnya di dalam `app/game-virus/page.tsx` sebagai fungsi lokal, tanpa mengekspor fungsi atau tipe baru ke luar file.

2. THE `Chip_Overlay` adalah elemen wrapper baru yang dibuat di dalam `BilanganZone` — `CharacterChips` di `CharacterSVGs.tsx` SHALL tidak dimodifikasi; interaksi klik chip di `BilanganZone` sepenuhnya dikelola oleh `Chip_Overlay`.

3. THE `BilanganZone` SHALL NOT invoke `onChipRemove` ketika `Phase_Guard` tidak terpenuhi (`phase !== "idle"` atau `resultValue !== null`), serta SHALL menerima prop `onChipRemove?: (tier: Tier) => void` yang opsional sehingga pemanggil lain tidak terpengaruh.

4. WHEN `onChipRemove` tidak dioper ke `BilanganZone`, THE `BilanganZone` SHALL (a) tidak merender `Chip_Overlay`, (b) tidak menambahkan event listener klik pada chip, dan (c) menampilkan tampilan visual yang identik dengan versi sebelum fitur ini ditambahkan.
