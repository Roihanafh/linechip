# Score Double Award Bugfix Design

## Overview

Bug ini terjadi di halaman Game Virus (`/game-virus`) ketika user menekan Enter pada input field jawaban. Browser memicu dua event secara berurutan dalam satu render cycle: `onKeyDown` di input (yang memanggil `handleCheckChipAnswer`) dan kemudian `onClick` di button "Periksa" (yang juga memanggil `handleCheckChipAnswer`). Karena React belum sempat memperbarui state `chipFeedback` antara kedua panggilan tersebut, guard `chipFeedback?.correct` pada panggilan kedua masih bernilai `null`/`false`, sehingga `awardPoints()` dipanggil dua kali — menghasilkan +20 poin alih-alih +10 poin.

Fix yang dipilih menggunakan dua lapis pertahanan:
1. **Early return guard** di dalam `handleCheckChipAnswer`: cek `chipFeedback?.correct` di awal fungsi sebelum melakukan apa pun.
2. **`e.preventDefault()`** pada handler `onKeyDown` Enter di input field: mencegah browser men-trigger synthetic click pada button "Periksa" setelah Enter ditekan.

Pendekatan ini minimal, tidak mengubah alur UI yang ada, dan aman dari stale closure karena guard membaca state langsung dari React.

## Glossary

- **Bug_Condition (C)**: Kondisi yang memicu bug — `handleCheckChipAnswer` dipanggil saat `chipFeedback?.correct` sudah bernilai `true`, atau saat Enter di-press dan browser juga men-trigger click pada button "Periksa" di render cycle yang sama
- **Property (P)**: Perilaku yang diharapkan — tepat satu panggilan `awardPoints()` per jawaban benar yang dikirimkan
- **Preservation**: Perilaku yang harus tetap tidak berubah setelah fix — klik button "Periksa" dengan mouse, feedback salah, auto-advance, skor saat tidak login, dan tombol "Soal Baru"
- **handleCheckChipAnswer**: Fungsi di `app/game-virus/page.tsx` yang memvalidasi jawaban user, memanggil `awardPoints()` jika benar, dan memulai timer auto-advance ke soal berikutnya
- **awardPoints(uid)**: Fungsi di `features/game/scoreService.ts` yang menambahkan `POINTS_PER_CORRECT` (10) ke session score secara lokal dan men-trigger `increment(10)` ke Firestore `totalScore`
- **chipFeedback**: State React `{ correct: boolean; feedback: string } | null` yang menyimpan hasil validasi jawaban terakhir; bernilai `null` sebelum user mengirim jawaban
- **double-fire**: Kondisi di mana `handleCheckChipAnswer` terpanggil dua kali dalam satu event cycle akibat `onKeyDown` + synthetic button click

## Bug Details

### Bug Condition

Bug termanifestasi ketika user menekan Enter di input field jawaban saat `chipFeedback` masih `null` (belum pernah menjawab atau sudah di-reset ke soal baru). `handleCheckChipAnswer` tidak memiliki guard untuk `chipFeedback?.correct`, sehingga jika dipanggil dua kali, kedua panggilan akan lulus semua kondisi guard yang ada (`animating`, `currentQuestion`, dll.) dan sama-sama memanggil `awardPoints()`.

**Formal Specification:**
```
FUNCTION isBugCondition(event)
  INPUT: event — keyboard Enter pada input field, atau programmatic call
  OUTPUT: boolean

  RETURN event.type === "keydown"
         AND event.key === "Enter"
         AND chipFeedback === null
         AND currentQuestion !== null
         AND NOT animating
         // Browser akan men-trigger synthetic click pada button "Periksa"
         // karena button tersebut visible, enabled, dan berada dalam form-like context
         AND buttonPeriksa.enabled === true
END FUNCTION
```

Kondisi kedua (panggilan via state stale):
```
FUNCTION isBugCondition_stale(call)
  INPUT: call — invokasi handleCheckChipAnswer
  OUTPUT: boolean

  RETURN chipFeedback?.correct === true   // sudah dapat poin di panggilan pertama
         AND React belum re-render         // state belum terpropagasi ke closure
         AND panggilan ini adalah yang ke-2
END FUNCTION
```

### Examples

- **Enter dengan jawaban benar**: User mengetik "15", tekan Enter → `onKeyDown` memanggil `handleCheckChipAnswer()` (jawaban benar, +10 pts, `chipFeedback` di-set ke `{ correct: true, ... }` secara async) → browser men-trigger click pada button "Periksa" → `handleCheckChipAnswer()` dipanggil lagi dengan closure lama di mana `chipFeedback` masih `null` → `awardPoints()` dipanggil kedua kali → hasil: +20 pts
- **Enter dengan jawaban salah**: User mengetik "99", tekan Enter → `handleCheckChipAnswer()` dipanggil dua kali → `validateChipAnswer` mengembalikan `{ correct: false }` untuk kedua panggilan → `awardPoints()` tidak dipanggil di keduanya → hasil: 0 pts (benar, tidak ada bug untuk jawaban salah)
- **Klik mouse pada button "Periksa"**: Hanya satu event `onClick` yang terjadi → `handleCheckChipAnswer()` dipanggil sekali → tidak ada double-fire → hasil: +10 pts (benar, tidak ada bug)
- **Edge case — Enter setelah jawaban benar**: User sudah dapat feedback benar, lalu menekan Enter lagi sebelum auto-advance → tanpa guard, `handleCheckChipAnswer()` akan dipanggil lagi dan memberikan poin kedua kali; dengan guard `chipFeedback?.correct`, ini ter-blokir

## Expected Behavior

### Preservation Requirements

**Perilaku yang harus tetap tidak berubah:**
- Klik mouse pada button "Periksa" dengan jawaban benar harus tetap memberikan tepat 10 poin dan menampilkan feedback benar
- Klik mouse pada button "Periksa" dengan jawaban salah harus tetap menampilkan feedback salah tanpa memberikan poin
- Auto-advance ke soal baru setelah 2 detik pada jawaban benar harus tetap berjalan
- Session score untuk user yang tidak login harus tetap menambahkan 10 poin secara lokal (tanpa Firestore)
- Klik button "Soal Baru" harus tetap mereset state soal tanpa mengubah session score
- Input field harus tetap dapat menerima teks numerik dan mengirimkan jawaban

**Scope:**
Semua interaksi yang BUKAN merupakan double-fire dari Enter key harus sepenuhnya tidak terpengaruh oleh fix ini. Ini mencakup:
- Semua interaksi mouse (klik button, drag chip, dll.)
- Input keyboard selain Enter di field jawaban (mengetik angka, Backspace, dll.)
- Navigasi keyboard di luar field jawaban

## Hypothesized Root Cause

Berdasarkan analisis kode di `app/game-virus/page.tsx`:

1. **Tidak ada early-return guard pada `chipFeedback?.correct`**: `handleCheckChipAnswer` memeriksa `animating` dan `currentQuestion` di awalnya, tetapi tidak memeriksa apakah jawaban sudah pernah dinilai benar (`chipFeedback?.correct`). Ini memungkinkan fungsi berjalan penuh bahkan jika sudah memberikan poin sebelumnya.

2. **Browser synthetic click setelah Enter**: Ketika user menekan Enter di dalam sebuah `<input>`, browser modern akan men-trigger synthetic `click` event pada button pertama yang `enabled` di container yang sama (perilaku form submission). Button "Periksa" adalah button pertama yang enabled setelah input field, sehingga menjadi target click synthetic ini.

3. **Stale closure React**: `handleCheckChipAnswer` di-memoize dengan `useCallback`. Pada saat panggilan pertama (via `onKeyDown`) mengeksekusi `setChipFeedback(result)`, state `chipFeedback` dalam closure panggilan kedua (via synthetic click) masih bernilai `null` karena React belum melakukan re-render antara dua panggilan tersebut.

4. **`awardPoints()` tidak idempotent per-jawaban**: `awardPoints` di `scoreService.ts` tidak memiliki mekanisme de-duplikasi per-jawaban. Setiap panggilan selalu menambahkan 10 poin. Ini adalah desain yang wajar untuk fungsi utilitas, tetapi menempatkan tanggung jawab idempotency pada caller.

## Correctness Properties

Property 1: Bug Condition — Satu Poin Per Jawaban Benar

_For any_ input di mana user mengirimkan jawaban (baik via Enter maupun klik button "Periksa") dan jawaban tersebut benar, fungsi `handleCheckChipAnswer` yang sudah di-fix SHALL memanggil `awardPoints()` tepat satu kali, sehingga session score bertambah tepat 10 poin dan Firestore `totalScore` menerima tepat satu operasi `increment(10)`.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation — Perilaku Non-Double-Fire Tidak Berubah

_For any_ input di mana bug condition TIDAK berlaku (klik mouse, jawaban salah, Enter setelah soal sudah dijawab benar dan state sudah ter-update, user tidak login), fungsi `handleCheckChipAnswer` yang sudah di-fix SHALL menghasilkan perilaku yang identik dengan fungsi aslinya — tidak ada perubahan pada feedback yang ditampilkan, jumlah poin yang diberikan, atau alur auto-advance.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Mengasumsikan root cause analysis di atas benar:

**File**: `app/game-virus/page.tsx`

**Function**: `handleCheckChipAnswer`

**Specific Changes**:

1. **Early return guard — `chipFeedback?.correct`**: Tambahkan pengecekan di baris pertama fungsi:
   ```typescript
   const handleCheckChipAnswer = useCallback(() => {
     if (chipFeedback?.correct) return;  // ← tambahkan ini
     if (animating) return;
     // ... sisa fungsi tidak berubah
   }, [animating, currentQuestion, answerInput, user, handleNewChipQuestion, chipFeedback]);
   ```
   Guard ini memblokir panggilan kedua bahkan jika React belum re-render, karena closure-nya sudah di-update dengan `chipFeedback` terbaru saat `useCallback` deps berubah. Namun karena kedua panggilan terjadi di render cycle yang sama, guard ini saja tidak cukup — itulah mengapa perlu juga perubahan pada `onKeyDown`.

2. **`e.preventDefault()` pada `onKeyDown` Enter**: Ubah handler di input field:
   ```typescript
   onKeyDown={(e) => {
     if (e.key === "Enter") {
       e.preventDefault();  // ← tambahkan ini untuk mencegah synthetic click
       handleCheckChipAnswer();
     }
   }}
   ```
   Ini mencegah browser men-trigger synthetic click pada button "Periksa" setelah Enter ditekan, sehingga hanya ada satu panggilan ke `handleCheckChipAnswer` per Enter keypress.

3. **Tambahkan `chipFeedback` ke dependency array `useCallback`**: Pastikan closure selalu memiliki nilai `chipFeedback` terbaru:
   ```typescript
   }, [animating, currentQuestion, answerInput, user, handleNewChipQuestion, chipFeedback]);
   //                                                                         ↑ tambahkan
   ```
   Ini memastikan guard `chipFeedback?.correct` pada Property 1 selalu membaca state yang benar.

**Tidak ada perubahan pada** `features/game/scoreService.ts` — `awardPoints` berfungsi dengan benar sebagai fungsi utilitas; tanggung jawab idempotency ada pada caller.

## Testing Strategy

### Validation Approach

Strategi pengujian mengikuti dua fase: pertama, konfirmasi bug dengan menjalankan test pada kode yang belum di-fix (exploratory), lalu verifikasi bahwa fix bekerja dan tidak menimbulkan regresi.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexample yang mendemonstrasikan double-fire pada kode yang belum di-fix. Konfirmasi root cause bahwa Enter menghasilkan dua panggilan `handleCheckChipAnswer`.

**Test Plan**: Tulis unit test yang mocking `handleCheckChipAnswer` dan mensimulasikan Enter keydown pada input field. Jalankan pada kode UNFIXED untuk mengamati bahwa `awardPoints` dipanggil dua kali.

**Test Cases**:
1. **Enter pada input dengan jawaban benar**: Simulasikan `keydown Enter` pada input field dengan nilai jawaban yang benar → assert `awardPoints` dipanggil 2x (akan GAGAL pada kode unfixed, membuktikan bug) 
2. **Klik button "Periksa" dengan jawaban benar**: Simulasikan `click` pada button → assert `awardPoints` dipanggil 1x (akan LULUS, konfirmasi klik mouse tidak ter-affect)
3. **Enter pada input dengan jawaban salah**: Simulasikan `keydown Enter` dengan jawaban salah → assert `awardPoints` tidak pernah dipanggil (akan LULUS, konfirmasi jawaban salah tidak ter-affect)
4. **Panggilan berulang `handleCheckChipAnswer` ketika `chipFeedback.correct === true`**: Panggil fungsi dua kali secara programmatic dengan state yang sama → assert `awardPoints` dipanggil 2x pada kode unfixed (akan GAGAL setelah fix)

**Expected Counterexamples**:
- `awardPoints` mock dipanggil 2x saat Enter ditekan dengan jawaban benar
- Session score bertambah 20 alih-alih 10 dalam skenario Enter

### Fix Checking

**Goal**: Verifikasi bahwa untuk semua input di mana bug condition berlaku, fungsi yang sudah di-fix menghasilkan perilaku yang benar.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := handleCheckChipAnswer_fixed(input)
  ASSERT awardPoints dipanggil tepat 1x
  ASSERT sessionScore bertambah tepat POINTS_PER_CORRECT (10)
  ASSERT Firestore increment dipanggil tepat 1x
END FOR
```

### Preservation Checking

**Goal**: Verifikasi bahwa untuk semua input di mana bug condition TIDAK berlaku, fungsi yang sudah di-fix menghasilkan hasil yang identik dengan fungsi aslinya.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT handleCheckChipAnswer_original(input) = handleCheckChipAnswer_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing direkomendasikan untuk preservation checking karena:
- Menghasilkan banyak test case secara otomatis di seluruh domain input
- Menangkap edge case yang mungkin terlewat oleh unit test manual
- Memberikan jaminan kuat bahwa perilaku tidak berubah untuk semua non-buggy inputs

**Test Plan**: Observasi perilaku pada kode UNFIXED terlebih dahulu untuk klik mouse dan interaksi lainnya, lalu tulis property-based test yang menangkap perilaku tersebut.

**Test Cases**:
1. **Mouse Click Preservation**: Verifikasi bahwa klik button "Periksa" dengan jawaban benar tetap memberikan tepat 10 poin setelah fix
2. **Jawaban Salah Preservation**: Verifikasi bahwa jawaban salah (via Enter atau klik) tetap tidak memberikan poin dan menampilkan feedback error
3. **Auto-Advance Preservation**: Verifikasi bahwa timer 2 detik ke soal baru tetap berjalan setelah jawaban benar
4. **Unauthenticated User Preservation**: Verifikasi bahwa user tanpa uid tetap mendapat +10 poin lokal dan Firestore tidak di-call

### Unit Tests

- Test `handleCheckChipAnswer` dipanggil via Enter: assert `awardPoints` dipanggil tepat 1x setelah fix
- Test `handleCheckChipAnswer` dipanggil via klik: assert `awardPoints` dipanggil tepat 1x (tidak berubah)
- Test early return guard: panggil `handleCheckChipAnswer` saat `chipFeedback.correct === true` → assert tidak ada side effect
- Test `e.preventDefault()` pada Enter: simulasikan Enter keydown → assert tidak ada synthetic click event yang ter-propagasi ke button

### Property-Based Tests

- Generate random `answerInput` values dan verifikasi bahwa untuk setiap nilai, skor bertambah paling banyak `POINTS_PER_CORRECT` per cycle pengiriman jawaban, terlepas dari metode input (Enter vs klik)
- Generate random urutan interaksi (Enter, klik, Enter berulang) dan verifikasi bahwa total poin yang diberikan adalah tepat `POINTS_PER_CORRECT × jumlah_jawaban_benar_unik`
- Generate random game states dan verifikasi bahwa preservation property terpenuhi: untuk state di mana `chipFeedback.correct === true`, `handleCheckChipAnswer` tidak mengubah session score

### Integration Tests

- Test full flow: isi jawaban → tekan Enter → verifikasi feedback muncul → verifikasi session score +10 (bukan +20)
- Test switching antara metode input: Enter lalu klik → verifikasi hanya mendapat 10 poin total untuk satu jawaban benar
- Test auto-advance: jawaban benar via Enter → verifikasi pindah ke soal baru setelah 2 detik dengan score +10
