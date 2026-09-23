# Game Virus Subtraction Placement Check — Bugfix Design

## Overview

Game Virus menggunakan `validateChipPlacement` (`lib/game/chipHelpers.ts`) untuk memeriksa apakah chip yang diletakkan user cocok dengan soal aktif sebelum komputasi dilakukan. Investigasi kode menunjukkan bahwa validasi saat ini **sudah benar secara fungsional** — baik untuk operator `+` maupun `-`.

Bug yang diidentifikasi bukan kesalahan logika yang aktif, melainkan **ketiadaan kontrak eksplisit** yang melindungi perilaku benar tersebut dari regresi. Konvensi materi model-chip pengurangan (membalik `bil2_original → bil2_converted = -bil2_original` sebelum arena) menciptakan risiko seseorang akan keliru "menyelaraskan" validasi Game Virus ke konvensi itu. Fix yang tepat adalah: menambahkan tes yang mengunci kontrak yang sudah benar, dan menambahkan JSDoc yang menjelaskan perbedaan arsitektur ini.

## Glossary

- **Bug_Condition (C)**: Kondisi yang memicu perilaku salah — dalam konteks ini, kondisi yang akan membuat `validateChipPlacement` memberikan hasil tidak valid, yaitu ketika fungsi menggunakan `-question.b` sebagai acuan untuk soal pengurangan (yang salah) alih-alih `question.b`
- **Property (P)**: Perilaku yang diharapkan — untuk semua soal (baik `+` maupun `-`), validasi harus menerima `bil2Value === question.b` dan menolak `bil2Value !== question.b`
- **Preservation**: Perilaku yang tidak boleh berubah — logika `handleCompute`, visualisasi `BilanganZone`, dan validasi jawaban `validateChipAnswer`
- **F (unfixed)**: Kode tanpa tes pelindung — `validateChipPlacement` yang benar secara logika tetapi tidak dilindungi tes
- **F' (fixed)**: Kode dengan tes pelindung dan JSDoc yang menjelaskan kontrak subtraction
- **bill2_converted**: Nilai `-bil2_original` yang digunakan di materi model-chip pengurangan setelah fase "transform" — **tidak digunakan** di Game Virus
- **question.b**: Pengurang asli (`b_asli`), nilai yang disimpan dalam `ChipQuestion.b`, sama dengan nilai yang harus ada di `bil2Value`

## Bug Details

### Bug Condition

Bug kondisi terpicu ketika `validateChipPlacement` dimodifikasi untuk membedakan perilaku berdasarkan operator, khususnya ketika seseorang menambahkan logika:

```
if (question.op === "-") {
  // keliru: mengikuti konvensi model-chip
  bil2Expected = -question.b;
} else {
  bil2Expected = question.b;
}
```

Kondisi ini belum terjadi, tetapi tidak ada perlindungan (tes atau komentar) yang mencegahnya.

**Formal Specification:**
```pascal
FUNCTION isBugCondition(input)
  INPUT: input of type { bil2Value: number; question: ChipQuestion }
  OUTPUT: boolean
  
  // Bug terjadi ketika validateChipPlacement menggunakan -question.b
  // sebagai acuan untuk soal pengurangan
  RETURN input.question.op = "-"
         AND validateChipPlacement menggunakan bil2Expected = -question.b
         AND input.bil2Value = question.b  // nilai benar yang dimasukkan user
         AND hasil validasi adalah "tidak valid" (false negative)
END FUNCTION
```

### Examples

- **Soal `5 − 3` (`a=5, b=3, op="-"`)**: user menaruh 3 Antibodi di Bilangan 2 → `bil2Value = 3 = question.b` → harus diterima. Jika bug kondisi aktif: fungsi mengharapkan `-3`, maka user yang menaruh `+3` ditolak secara keliru.
- **Soal `5 − (−3)` (`a=5, b=-3, op="-"`)**: user menaruh 3 Kuman di Bilangan 2 → `bil2Value = -3 = question.b` → harus diterima. Jika bug kondisi aktif: fungsi mengharapkan `+3`, maka user yang menaruh `-3` ditolak secara keliru.
- **Soal `5 + 3` (`a=5, b=3, op="+"`)**: user menaruh 3 Antibodi → `bil2Value = 3 = question.b` → diterima. Kasus ini tidak terpengaruh oleh bug kondisi.
- **Edge case `a=0, b=0`**: `generateChipQuestion` menjamin kedua operand non-zero; kasus ini tidak mungkin terjadi.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `handleCompute` di `page.tsx` terus menggunakan `bil1Value - bil2Value` untuk soal pengurangan — **tidak ada perubahan**
- `BilanganZone` terus menentukan tipe karakter (Antibodi/Kuman) berdasarkan tanda `bil2Value` saja — tidak ada flip visual untuk operator `-`
- `validateChipAnswer` terus membandingkan input user terhadap `question.answer = a - b` — **tidak ada perubahan**
- Semua soal penambahan (`op === "+"`) divalidasi dengan cara yang persis sama seperti sebelumnya

**Scope:**
Semua input yang **tidak** memenuhi bug condition (soal pengurangan dengan `bil2Value === question.b`) harus berperilaku identik antara F dan F'. Ini mencakup:
- Semua soal penambahan
- Semua soal dengan `bil1Value !== question.a` (ditolak dengan benar)
- Semua soal dengan `bil2Value !== question.b` (ditolak dengan benar)

## Hypothesized Root Cause

Bug kondisi dapat muncul dari:

1. **Miskonsepsi konvensi model-chip**: Developer yang memperbarui `validateChipPlacement` mungkin terinspirasi dari `SubtractionSnapshot.bil2_converted = -bil2_original` di model-chip dan keliru menerapkan flip yang sama ke Game Virus
   - Model-chip: user memasukkan `b_asli`, sistem mengkonversi ke `-b_asli` sebelum arena
   - Game Virus: user memasukkan `b_asli` sebagai chip, dan `handleCompute` menghitung `a - b_asli` langsung — tidak ada konversi

2. **Tidak ada JSDoc yang menjelaskan perbedaan**: `validateChipPlacement` tidak memiliki komentar yang menjelaskan bahwa operator tidak mempengaruhi ekspektasi `bil2Value`

3. **Tidak ada tes untuk soal pengurangan**: Test file `__tests__/game-virus/` tidak mencakup `validateChipPlacement` sama sekali — bahkan tidak ada unit test untuk fungsi ini di seluruh codebase

4. **Nama parameter yang ambigu**: Parameter `bil2Value` dan `question.b` tidak langsung mengkomunikasikan bahwa keduanya harus selalu sama persis, terlepas dari operator

## Correctness Properties

Property 1: Bug Condition — Subtraction Placement Accepts Original Subtractor

_For any_ soal pengurangan (`op === "-"`) dengan operand `(a, b)`, ketika `bil1Value === a` dan `bil2Value === b` (pengurang asli, bukan yang dibalik), fungsi `validateChipPlacement` yang sudah difix SHALL mengembalikan `{ valid: true }`.

**Validates: Requirements 2.1, 2.3**

Property 2: Preservation — Operator-Independent Validation Contract

_For any_ soal dengan operator apa pun (`"+"` atau `"-"`), dan untuk semua nilai `bil1Value` dan `bil2Value` yang valid, fungsi `validateChipPlacement` yang sudah difix SHALL menghasilkan keputusan yang identik dengan fungsi asli (unfixed). Kontrak `bil2Expected = question.b` berlaku tanpa kondisi branching pada operator.

**Validates: Requirements 3.1, 3.2, 3.4**

## Fix Implementation

### Changes Required

**File**: `lib/game/chipHelpers.ts`

**Function**: `validateChipPlacement`

**Specific Changes**:

1. **Tambahkan JSDoc yang menjelaskan kontrak subtraction**:
   - Dokumentasikan bahwa `bil2Value` harus selalu sama dengan `question.b` tanpa memperhatikan `question.op`
   - Jelaskan mengapa: `handleCompute` menggunakan `bil1Value - bil2Value` (bukan konversi model-chip), sehingga `bil2Value === question.b` adalah benar untuk kedua operator
   - Referensikan `SubtractionSnapshot.bil2_converted` dan jelaskan mengapa konvensi itu **tidak berlaku** di Game Virus

2. **Tidak ada perubahan logika**: Implementasi validasi saat ini sudah benar — hanya dokumentasi yang perlu ditambahkan

**File**: `__tests__/game-virus/` (file baru)

**Specific Changes**:

3. **Buat file test baru**: `__tests__/game-virus/chipHelpers.placement.test.ts`
   - Tulis property-based test yang mengeksplorasi bug condition pada kode unfixed (versi yang keliru menggunakan `-question.b`)
   - Tulis preservation test yang memverifikasi kontrak `validateChipPlacement` tidak berubah untuk semua operator
   - Verifikasi bahwa kode yang sudah diperbaiki (dengan JSDoc) lulus semua test

## Testing Strategy

### Validation Approach

Strategi testing mengikuti pendekatan dua fase: pertama, tulis test explorasi yang mendemonstrasikan bug condition pada kode **yang sengaja salah** (versi yang menggunakan `-question.b`), kemudian tulis preservation test yang mengunci kontrak yang benar.

### Exploratory Bug Condition Checking

**Goal**: Menulis test yang gagal pada implementasi yang salah (menggunakan `-question.b`), untuk membuktikan bahwa bug condition benar-benar menghasilkan false negative.

**Test Plan**: Buat fungsi `validateChipPlacementBuggy` yang sengaja menggunakan `-question.b` untuk soal pengurangan, lalu jalankan test terhadap fungsi tersebut. Test harus GAGAL (false negative) untuk kasus `bil2Value === question.b` pada soal pengurangan.

**Test Cases**:
1. **Subtraction Accepted Test**: `bill2Value = question.b` pada soal `op="-"` → buggy version menolak (false negative) *(akan GAGAL pada unfixed/buggy code)*
2. **Positive Subtractor Test**: `a=5, b=3` → user menaruh `+3` → buggy version mengharapkan `-3` → false negative *(akan GAGAL)*
3. **Negative Subtractor Test**: `a=5, b=-3` → user menaruh `-3` → buggy version mengharapkan `+3` → false negative *(akan GAGAL)*
4. **PBT sweep**: untuk semua `b ∈ [−9999, 9999] \ {0}`, `validateChipPlacementBuggy(b, b, subtractQuestion)` harus menolak saat `b > 0` atau `b < 0` *(akan GAGAL)*

**Expected Counterexamples**:
- `validateChipPlacementBuggy(5, 3, {a:5, b:3, op:"-", answer:2})` returns `{ valid: false }` padahal seharusnya `{ valid: true }`
- Possible causes: bug condition aktif karena operator flip diterapkan pada `bil2Expected`

### Fix Checking

**Goal**: Verifikasi bahwa untuk semua input dimana bug condition berlaku, fungsi yang sudah diperbaiki menghasilkan perilaku yang benar.

**Pseudocode:**
```pascal
FOR ALL input WHERE isBugCondition(input) DO
  result := validateChipPlacement_fixed(input.bil2Value, input.question)
  // input.bil2Value === input.question.b (user memasukkan nilai benar)
  ASSERT result.valid = true
END FOR
```

### Preservation Checking

**Goal**: Verifikasi bahwa untuk semua input dimana bug condition TIDAK berlaku, fungsi yang sudah diperbaiki menghasilkan hasil yang identik dengan fungsi asli.

**Pseudocode:**
```pascal
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT validateChipPlacement_original(input) = validateChipPlacement_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing digunakan untuk preservation karena:
- Preservation bersifat universal ("untuk semua input non-buggy")
- PBT menghasilkan banyak kasus otomatis termasuk edge case
- Memberikan jaminan kuat bahwa perubahan dokumentasi tidak mempengaruhi logika

**Test Plan**:
1. **Addition Preservation**: Untuk semua soal `op="+"`, verifikasi `validateChipPlacement` menghasilkan hasil yang sama sebelum dan sesudah fix
2. **Subtraction Wrong Value**: Untuk soal `op="-"` dengan `bil2Value !== question.b`, verifikasi tetap ditolak
3. **Bil1 Wrong Value**: Untuk `bil1Value !== question.a`, verifikasi tetap ditolak terlepas dari operator
4. **Both Wrong**: Untuk kedua salah, pesan error menyebut Bilangan 1 terlebih dahulu

### Unit Tests

- Test `validateChipPlacement` untuk soal `op="+"` dengan nilai benar → accepted
- Test `validateChipPlacement` untuk soal `op="-"` dengan `bil2Value === question.b` → accepted
- Test `validateChipPlacement` untuk soal `op="-"` dengan `bil2Value === -question.b` → rejected (dengan pesan yang menyebut nilai benar)
- Test error message untuk kasus kedua bil salah

### Property-Based Tests

- **Property 1**: Generate random `ChipQuestion` dengan `op="-"`, set `bil1Value=a, bil2Value=b` → selalu diterima
- **Property 2**: Generate random `ChipQuestion` dengan op apa pun, set `bil1Value=a+1, bil2Value=b` → selalu ditolak (bilangan 1 salah)
- **Property 3**: Generate random `ChipQuestion` dengan `op="-"`, set `bil2Value=-b` (flipped, seperti model-chip) → selalu ditolak — ini mengunci bahwa `-question.b` bukan nilai yang valid

### Integration Tests

- Tidak diperlukan perubahan integrasi karena tidak ada perubahan logika pada `page.tsx`
