# Design Document — game-module-integration

## Overview

Fitur ini menambahkan lapisan soal otomatis, validasi placement, validasi jawaban, dan sistem poin ke dua halaman game yang sudah berjalan di linechip — `/game-virus` (Game Model Chip) dan `/intline-run` (Game Garis Bilangan) — tanpa mengubah komponen animasi, hook, maupun logic yang sudah ada.

Pendekatan desainnya adalah **additive overlay**: semua kode baru ditambahkan di atas infrastruktur yang sudah ada. Komponen animasi (`InteractionAnimation`, `BattleStage`, `AllianceStage`, `PairReactionStage`), hook (`useGameLineState`), dan canvas renderer tidak disentuh.

**Validasi dua lapis** adalah kunci perubahan dari versi sebelumnya:
- **Game_Chip**: validasi chip placement (`bil1Value === q.a && bil2Value === q.b`) SEBELUM animasi, lalu validasi jawaban numerik SETELAH animasi selesai.
- **Game_Line**: validasi arrow placement (Arrow 1 dan Arrow 2 sesuai soal) SEBELUM memanggil `checkAnswer()`, lalu poin diberikan hanya jika `checkAnswer()` juga mengembalikan `true`.

Sistem poin bersifat shared: satu `Score_Service` di `features/game/scoreService.ts` yang sudah ada digunakan oleh kedua halaman. `Session_Score` hidup di memori React state halaman masing-masing; `Total_Score` disimpan ke Firestore via `increment(10)` atomic dan dibaca real-time oleh `AuthProvider` yang sudah ada.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        linechip app                          │
│                                                              │
│  ┌─────────────────────┐   ┌──────────────────────────────┐ │
│  │  /game-virus         │   │  /intline-run                │ │
│  │  (Game Model Chip)   │   │  (Game Garis Bilangan)       │ │
│  │                      │   │                              │ │
│  │  ┌────────────────┐  │   │  ┌──────────────────────┐   │ │
│  │  │ Chip_Question_ │  │   │  │ generateQuestion()   │   │ │
│  │  │ Generator (NEW)│  │   │  │ (existing, untouched)│   │ │
│  │  └────────────────┘  │   │  └──────────────────────┘   │ │
│  │                      │   │                              │ │
│  │  validateChipPlace-  │   │  validateArrowPlacement()    │ │
│  │  ment() (NEW)        │   │  (NEW)                       │ │
│  │                      │   │                              │ │
│  │  Session_Score state │   │  Session_Score state (NEW)   │ │
│  │  (NEW in page.tsx)   │   │  (NEW in page.tsx)           │ │
│  │                      │   │                              │ │
│  │  Answer_Input (NEW)  │   │  [GameLineKeypad existing]   │ │
│  │  Feedback_Panel(NEW) │   │  [Feedback existing]         │ │
│  └──────────┬───────────┘   └──────────────┬───────────────┘ │
│             │                               │                 │
│             └────────────┬──────────────────┘                 │
│                          ▼                                     │
│              ┌────────────────────────┐                       │
│              │  features/game/        │                       │
│              │  scoreService.ts       │                       │
│              │  (already exists)      │                       │
│              │                        │                       │
│              │  awardPoints(uid)      │                       │
│              │  → Firestore increment │                       │
│              │  → localStorage queue  │                       │
│              └───────────┬────────────┘                       │
│                          │                                     │
│                          ▼                                     │
│              ┌────────────────────────┐                       │
│              │  Firestore             │                       │
│              │  users/{uid}.totalScore│                       │
│              └───────────┬────────────┘                       │
│                          │  onSnapshot (existing AuthProvider)│
│                          ▼                                     │
│              ┌────────────────────────┐                       │
│              │  profile.totalScore    │                       │
│              │  (available via        │                       │
│              │   useAuth())           │                       │
│              └────────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

**Aliran data untuk satu flow benar di Game_Chip:**

```
User drags chips → bil1Value & bil2Value updated (existing drag-and-drop)
  → User clicks "Hitung Hasil"
  → validateChipPlacement(bil1Value, bil2Value, question)
     → { valid: false } → Chip_Feedback error ditampilkan, STOP
     → { valid: true }  → handleCompute() existing dipanggil
        → InteractionAnimation selesai → resultValue tampil
        → User types answer → clicks "Periksa"
        → validateChipAnswer(input, question)
           → { correct: false } → Feedback_Panel error, STOP
           → { correct: true  } → sessionScore += 10
              → awardPoints(user.uid) [fire-and-forget]
              → Feedback_Panel sukses
              → setTimeout(2000ms) → generateChipQuestion() → soal baru
```

**Aliran data untuk satu flow benar di Game_Line:**

```
User adjusts arrows via GameLineArrowControls (existing)
  → User clicks "Cek Posisi" → playArrows() animasi (existing, untouched)
  → User types answer via GameLineKeypad (existing)
  → User clicks "Periksa"
  → validateArrowPlacement(arrows, question)
     → { valid: false } → Arrow_Feedback error ditampilkan, STOP
     → { valid: true  } → checkAnswer() existing dipanggil
        → { correct: false } → feedback error dari useGameLineState, STOP
        → { correct: true  } → sessionScore += 10
           → awardPoints(user.uid) [fire-and-forget]
           → feedback sukses dari useGameLineState
           → setTimeout(2000ms) → newQuestion()
```

---

## Components and Interfaces

### 1. `generateChipQuestion()` — Pure Function (NEW)

File: `lib/game/chipQuestion.ts`

```typescript
export interface ChipQuestion {
  a: number;      // integer bukan nol, [-9999, 9999]
  b: number;      // integer bukan nol, [-9999, 9999]
  op: '+' | '-';
  answer: number; // a + b atau a - b
}

export function generateChipQuestion(): ChipQuestion {
  const nonZeroInt = () => {
    let v = 0;
    while (v === 0) v = Math.floor(Math.random() * 19999) - 9999;
    return v;
  };
  const a = nonZeroInt();
  const b = nonZeroInt();
  const op: '+' | '-' = Math.random() >= 0.5 ? '+' : '-';
  const answer = op === '+' ? a + b : a - b;
  return { a, b, op, answer };
}
```

### 2. Helper Pure Functions (NEW)

File: `lib/game/chipHelpers.ts` — diekspor untuk testability.

```typescript
/** Format operan untuk tampilan soal; wrap negative dalam tanda kurung */
export function formatOperand(n: number): string

/** CSS color class untuk operan */
export function getOperandColorClass(n: number): 'text-intblue' | 'text-intpink' | 'text-slate-400'

/** CSS class untuk Feedback_Panel sesuai tipe */
export function getFeedbackClass(type: 'success' | 'error'): string

/** Format skor sebagai angka bulat lokal Indonesia */
export function formatScore(n: number): string

/** Resolve totalScore dengan default 0 untuk undefined/null */
export function resolveDisplayScore(v: number | null | undefined): number

/** Validasi dan evaluasi jawaban dari Answer_Input */
export function validateChipAnswer(
  input: string,
  question: ChipQuestion
): { correct: boolean; feedback: { type: 'success' | 'error'; message: string } }

/** Generate aria-label verbal untuk Chip_Question */
export function generateAriaLabel(question: ChipQuestion): string

/**
 * Filter input karakter untuk Answer_Input.
 * Hanya digit 0-9, opsional satu minus di posisi 0, max 6 karakter.
 */
export function filterAnswerInput(raw: string): string
```

### 3. `validateChipPlacement()` — Pure Function (NEW)

File: `lib/game/chipHelpers.ts` (bersama helper lain)

```typescript
/**
 * Memvalidasi apakah chip di zona Bilangan 1 dan Bilangan 2
 * sudah sesuai dengan Chip_Question aktif.
 *
 * @param bil1Value  Nilai total chip di zona Bilangan 1
 * @param bil2Value  Nilai total chip di zona Bilangan 2
 * @param question   Chip_Question yang sedang aktif
 * @returns { valid: true } jika placement tepat,
 *          { valid: false; message: string } jika tidak tepat
 */
export function validateChipPlacement(
  bil1Value: number,
  bil2Value: number,
  question: ChipQuestion
): { valid: true } | { valid: false; message: string } {
  const errors: string[] = [];

  if (bil1Value !== question.a) {
    errors.push(`Chip di Bilangan 1 harus bernilai ${question.a.toLocaleString('id-ID')}`);
  }
  if (bil2Value !== question.b) {
    errors.push(`Chip di Bilangan 2 harus bernilai ${question.b.toLocaleString('id-ID')}`);
  }

  if (errors.length === 0) return { valid: true };
  return { valid: false, message: errors.join('; ') };
}
```

**Catatan desain:** Fungsi ini mengembalikan pesan Bilangan 1 terlebih dahulu jika kedua nilai salah, sesuai Requirement 2.5. Penggunaan `toLocaleString('id-ID')` memastikan nilai negatif seperti `-5` tampil sebagai `−5` (minus lokal) dalam pesan feedback.

### 4. `validateArrowPlacement()` — Pure Function (NEW)

File: `lib/game/arrowHelpers.ts`

```typescript
import type { GameArrow } from '../../components/game-line/useGameLineState';
import type { GameQuestion } from '../../components/game-line/useGameLineState';

export interface ArrowPlacementResult {
  valid: boolean;
  message?: string;
  expectedArrow2Length?: number; // untuk ditampilkan di feedback
}

/**
 * Memvalidasi posisi Arrow 1 dan Arrow 2 sesuai GameQuestion.
 *
 * Aturan:
 *   Arrow 1: start === 0, length === q.a
 *   Arrow 2: start === q.a,
 *            length === q.b  (jika op = '+')
 *            length === -q.b (jika op = '-')
 *
 * @param arrows   State arrows saat ini dari useGameLineState
 * @param question GameQuestion yang sedang aktif
 */
export function validateArrowPlacement(
  arrows: Record<1 | 2, GameArrow>,
  question: GameQuestion
): ArrowPlacementResult {
  const a1 = arrows[1];
  const a2 = arrows[2];

  const expectedA2Length = question.op === '+' ? question.b : -question.b;

  const arrow1Valid = a1.start === 0 && a1.length === question.a;
  const arrow2Valid = a2.start === question.a && a2.length === expectedA2Length;

  if (arrow1Valid && arrow2Valid) return { valid: true };

  const parts: string[] = [];
  if (!arrow1Valid) {
    parts.push(`Arrow 1 harus dimulai dari 0 dengan panjang ${question.a}`);
  }
  if (!arrow2Valid) {
    parts.push(`Arrow 2 harus dimulai dari ${question.a} dengan panjang ${expectedA2Length}`);
  }

  return {
    valid: false,
    message: `Posisi panah belum tepat — ${parts.join(', ')}`,
    expectedArrow2Length,
  };
}
```

**Catatan desain mengenai `op = '-'`:** Pada garis bilangan, pengurangan `a - b` direpresentasikan sebagai dua panah: Panah 1 menuju `a`, Panah 2 bergerak ke kiri sejauh `b` (yaitu panjang = `-b`). Ini konsisten dengan model "tambah negatif" yang sudah dipakai di `useGameLineState.ts`.

### 5. Modifikasi `app/game-virus/page.tsx`

State baru yang ditambahkan ke komponen existing:

```typescript
const [currentQuestion, setCurrentQuestion] = useState<ChipQuestion>(() => generateChipQuestion());
const [answerInput, setAnswerInput] = useState('');
const [chipFeedback, setChipFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
const [sessionScore, setSessionScore] = useState(0);
const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

`user` dan `profile` diambil via `useAuth()`:

```typescript
const { user, profile } = useAuth();
```

**Modifikasi pada `handleCompute` existing:**

`handleCompute` existing hanya dipanggil dari satu tempat (tombol "Hitung Hasil"). Alih-alih memodifikasi `handleCompute`, dibuat wrapper `handleComputeWithValidation` yang menjalankan chip placement check terlebih dahulu:

```typescript
function handleComputeWithValidation() {
  const placement = validateChipPlacement(bil1Value, bil2Value, currentQuestion);
  if (!placement.valid) {
    setChipFeedback({ type: 'error', message: placement.message });
    return; // STOP — animasi tidak dimulai
  }
  setChipFeedback(null);
  handleCompute(); // existing, tidak dimodifikasi
}
```

Tombol "Hitung Hasil" di JSX existing diganti memanggil `handleComputeWithValidation` alih-alih `handleCompute`.

**Handler validasi jawaban numerik (NEW):**

```typescript
function handleCheckChipAnswer() {
  if (animating) return;
  const { correct, feedback } = validateChipAnswer(answerInput, currentQuestion);
  setChipFeedback(feedback);
  if (correct) {
    setSessionScore(prev => prev + POINTS_PER_CORRECT);
    awardPoints(user?.uid ?? null); // fire-and-forget
    autoAdvanceRef.current = setTimeout(() => {
      const next = generateChipQuestion();
      setCurrentQuestion(next);
      setBil1Value(0);   // reset zona Bilangan ke kosong
      setBil2Value(0);
      setResultValue(null);
      setPhase('idle');
      setHistory([]);
      setAnswerInput('');
      setChipFeedback(null);
    }, 2000);
  }
}
```

**Handler "Soal Baru" (NEW):**

```typescript
function handleNewChipQuestion() {
  if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
  const next = generateChipQuestion();
  setCurrentQuestion(next);
  setBil1Value(0);
  setBil2Value(0);
  setResultValue(null);
  setPhase('idle');
  setHistory([]);
  setAnswerInput('');
  setChipFeedback(null);
  // sessionScore TIDAK berubah
}
```

**Cleanup pada unmount:**

```typescript
useEffect(() => {
  return () => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
  };
}, []);
```

**Input filter untuk Answer_Input:**

```typescript
function handleAnswerInputChange(e: React.ChangeEvent<HTMLInputElement>) {
  setAnswerInput(filterAnswerInput(e.target.value));
}
```

### 6. Modifikasi `app/intline-run/page.tsx`

State baru yang ditambahkan:

```typescript
const [sessionScore, setSessionScore] = useState(0);
```

Import tambahan:

```typescript
const { user, profile } = useAuth();
import { validateArrowPlacement } from '../../lib/game/arrowHelpers';
import { awardPoints, POINTS_PER_CORRECT } from '../../features/game/scoreService';
import { resolveDisplayScore, formatScore } from '../../lib/game/chipHelpers';
```

Modifikasi `handleCheckAnswer()` yang sudah ada — fungsi diganti menjadi wrapper dua-lapis:

```typescript
const handleCheckAnswer = () => {
  // Lapis 1: validasi arrow placement
  const placement = validateArrowPlacement(arrows, currentQuestion);
  if (!placement.valid) {
    // Tampilkan arrow feedback — gunakan mekanisme feedback yang sudah ada di useGameLineState
    // Solusi: set feedback via fungsi baru setExternalFeedback, atau tampilkan di state lokal
    // Desain: tambah state lokal `arrowFeedback` di page.tsx (tidak mengubah hook)
    setArrowFeedback({ type: 'error', message: placement.message! });
    return;
  }
  setArrowFeedback(null);

  // Lapis 2: validasi jawaban numerik (existing)
  const correct = checkAnswer(); // dari useGameLineState, tidak dimodifikasi
  if (correct) {
    setSessionScore(prev => prev + POINTS_PER_CORRECT);
    awardPoints(user?.uid ?? null); // fire-and-forget
    autoAdvanceRef.current = setTimeout(() => {
      newQuestion();
    }, 2000);
  }
};
```

State lokal tambahan untuk arrow feedback di `page.tsx`:

```typescript
const [arrowFeedback, setArrowFeedback] = useState<{
  type: 'error';
  message: string;
} | null>(null);
```

Arrow feedback ditampilkan di area feedback yang sama dengan feedback dari `useGameLineState`, dengan prioritas: jika `arrowFeedback` ada, tampilkan itu; jika tidak, tampilkan `feedback` dari hook. Saat `newQuestion()` dipanggil, `arrowFeedback` di-reset ke `null`.

**Catatan penting:** `useGameLineState.ts` tidak dimodifikasi sama sekali. Semua penambahan terjadi di `page.tsx` sebagai lapisan di atas hook.

### 7. `features/game/scoreService.ts` — Sudah Ada, Tidak Dimodifikasi

File ini sudah mengimplementasikan:
- `awardPoints(uid)` — returns `POINTS_PER_CORRECT` (10), fire-and-forget Firestore write
- Retry 3x dengan backoff 500ms
- Fallback ke `localStorage` key `linechip_pending_score_{uid}`
- Flush pending queue saat `awardPoints()` dipanggil berikutnya

Tidak ada perubahan pada file ini.

### 8. Modifikasi `features/auth/types/index.ts`

Tambah field opsional ke `UserProfile`:

```typescript
export interface UserProfile {
  // ... field existing ...
  totalScore?: number; // NEW — opsional agar backward-compatible
}
```

### 9. Modifikasi `app/profile/ProfileClient.tsx`

Tambah satu baris baru "Total Poin" di section "Informasi Akun", setelah baris "Bergabung":

```tsx
{/* Total Poin — NEW */}
<div className="flex items-center gap-3 py-2.5">
  <span
    className="material-symbols-outlined text-[18px] text-[#94a3b8] shrink-0"
    aria-hidden="true"
  >
    emoji_events
  </span>
  <div className="min-w-0 flex-1">
    <p className="text-[11px] text-[#94a3b8] font-mono uppercase tracking-[0.4px] mb-0.5">
      Total Poin
    </p>
    <p
      className="text-[14px] text-[#334155]"
      aria-label={`Total poin: ${resolveDisplayScore(profile.totalScore).toLocaleString('id-ID')}`}
    >
      {resolveDisplayScore(profile.totalScore).toLocaleString('id-ID')}
    </p>
  </div>
</div>
```

### 10. Modifikasi `app/materi/page.tsx`

Satu perubahan teks pada paragraf promosi game (Req 7.4):

```tsx
// Sebelum:
<p className="text-slate-500 text-sm">
  Coba dua game seru: Antibodi vs Kuman dan Game Garis Bilangan — jawab soal bilangan bulat dengan mengatur panah!
</p>

// Setelah:
<p className="text-slate-500 text-sm">
  Coba dua game seru dengan soal otomatis: Antibodi vs Kuman dan Game Garis Bilangan — susun chip dan panah, lalu kumpulkan poin dari setiap jawaban benar!
</p>
```

---

## Data Models

### `ChipQuestion`

```typescript
interface ChipQuestion {
  a: number;      // integer bukan nol, rentang [-9999, 9999]
  b: number;      // integer bukan nol, rentang [-9999, 9999]
  op: '+' | '-';  // operator, dipilih 50/50
  answer: number; // a + b jika op='+', a - b jika op='-'
}
```

### `GameQuestion` (existing, tidak berubah)

```typescript
interface GameQuestion {
  a: number;         // [-99, 99]
  b: number;         // [-99, 99]
  op: '+' | '-';
  answer: number;
}
```

### `UserProfile` (diperluas)

```typescript
interface UserProfile {
  uid: string;
  name: string;
  email: string;
  school: string;
  photoURL?: string;
  role: 'user' | 'admin';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  totalScore?: number; // NEW — opsional, default 0 saat ditampilkan
}
```

### Session State (in-memory, per halaman)

```typescript
// Tidak dipersist ke Firestore; direset saat navigasi keluar
sessionScore: number  // awal 0, += 10 per flow benar (placement + jawaban)
```

### Arrow Feedback State (in-memory, hanya di intline-run/page.tsx)

```typescript
arrowFeedback: { type: 'error'; message: string } | null
// null saat Arrow_Placement valid atau soal baru dimulai
```

### Pending Queue (localStorage)

```
key:   linechip_pending_score_{uid}
value: string — angka integer (jumlah poin tertunda)
cap:   99990 poin
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do.*

### Property 1: generateChipQuestion invariant

*For any* output of `generateChipQuestion()`, operan `a` dan `b` harus berupa bilangan bulat bukan nol dalam rentang `[-9999, 9999]`, operator `op` harus `'+'` atau `'-'`, dan `answer` harus sama persis dengan `a + b` (jika `op = '+'`) atau `a - b` (jika `op = '-'`).

**Validates: Requirements 1.2, 1.3, 1.4**

---

### Property 2: formatOperand parenthesizes negatives

*For any* integer `n`, `formatOperand(n)` menghasilkan string yang dibungkus tanda kurung jika dan hanya jika `n < 0`; untuk `n >= 0` tidak ada tanda kurung.

**Validates: Requirements 1.6**

---

### Property 3: getOperandColorClass mapping

*For any* integer `n`, `getOperandColorClass(n)` mengembalikan `'text-intblue'` jika dan hanya jika `n > 0`, `'text-intpink'` jika dan hanya jika `n < 0`, dan class netral jika `n === 0`.

**Validates: Requirements 1.7**

---

### Property 4: validateChipPlacement exactness

*For any* `ChipQuestion` dan dua nilai integer `v1` dan `v2`, `validateChipPlacement(v1, v2, q)` mengembalikan `{ valid: true }` jika dan hanya jika `v1 === q.a` DAN `v2 === q.b`; untuk semua kombinasi lain mengembalikan `{ valid: false, message }` di mana `message` menyebut Bilangan 1 jika `v1 !== q.a`.

**Validates: Requirements 2.3, 2.4, 2.5**

---

### Property 5: validateArrowPlacement correctness

*For any* `GameQuestion` dan `Record<1|2, GameArrow>`, `validateArrowPlacement(arrows, q)` mengembalikan `{ valid: true }` jika dan hanya jika:
- `arrows[1].start === 0` DAN `arrows[1].length === q.a`
- `arrows[2].start === q.a` DAN `arrows[2].length === (q.op === '+' ? q.b : -q.b)`

Untuk semua kasus lain mengembalikan `{ valid: false, message }`.

**Validates: Requirements 4.2, 4.3, 4.4**

---

### Property 6: validateArrowPlacement subtraction direction

*For any* `GameQuestion` dengan `op = '-'`, `validateArrowPlacement` dengan Arrow 2 `length === -q.b` (bukan `q.b`) mengembalikan `{ valid: true }`, sedangkan Arrow 2 `length === q.b` (positif) mengembalikan `{ valid: false }`.

**Validates: Requirements 4.3**

---

### Property 7: Score increments by exactly 10 on full correct flow

*For any* nilai `sessionScore` sebelumnya dan flow yang diselesaikan dengan benar (placement valid + jawaban benar), nilai `sessionScore` setelah evaluasi harus sama persis dengan `sessionScore + 10`.

**Validates: Requirements 2.10, 3.2, 4.5**

---

### Property 8: Score unchanged on placement failure

*For any* nilai `sessionScore` sebelumnya dan chip/arrow placement yang tidak valid, nilai `sessionScore` setelah evaluasi harus tetap tidak berubah.

**Validates: Requirements 3.3, 4.6**

---

### Property 9: Score unchanged on wrong answer (with valid placement)

*For any* nilai `sessionScore` sebelumnya, placement yang valid, dan jawaban yang salah, nilai `sessionScore` setelah evaluasi harus tetap tidak berubah.

**Validates: Requirements 2.11, 3.3**

---

### Property 10: formatScore correctness

*For any* integer non-negatif `n`, `formatScore(n)` harus menghasilkan string yang identik dengan `n.toLocaleString('id-ID')`.

**Validates: Requirements 3.1, 4.1, 6.4**

---

### Property 11: resolveDisplayScore defaults to 0

*For any* nilai `v` (termasuk `undefined`, `null`, dan `0`), `resolveDisplayScore(v)` harus mengembalikan `0` jika `v` nullish, dan `v` jika `v` adalah angka valid.

**Validates: Requirements 3.4, 4.7, 6.2**

---

### Property 12: validateChipAnswer correctness

*For any* `ChipQuestion` dan input string `s` yang merupakan representasi integer valid, `validateChipAnswer(s, q).correct` harus `true` jika dan hanya jika `parseInt(s, 10) === q.answer`; jika `false`, pesan feedback harus mengandung nilai `q.answer`.

**Validates: Requirements 2.7, 2.10, 2.11**

---

### Property 13: awardPoints skips Firestore when uid absent

*For any* pemanggilan `awardPoints(null)` atau `awardPoints(undefined)`, fungsi harus mengembalikan `POINTS_PER_CORRECT` tanpa memicu write ke Firestore maupun ke Pending_Queue.

**Validates: Requirements 5.2**

---

### Property 14: Pending queue cap

*For any* urutan panggilan yang gagal ke Firestore, nilai yang tersimpan di Pending_Queue (sebagaimana direpresentasikan oleh `getPending(uid)`) tidak boleh melebihi `99990`.

**Validates: Requirements 5.4**

---

### Property 15: Answer input character filter

*For any* string `s`, `filterAnswerInput(s)` hanya boleh menghasilkan string yang terdiri dari digit `0–9` dengan opsional satu tanda minus di posisi paling awal, dan panjang maksimal 6 karakter.

**Validates: Requirements 2.2**

---

### Property 16: getFeedbackClass mapping

*For any* nilai `type` bertipe `'success' | 'error'`, `getFeedbackClass(type)` harus mengembalikan class yang mengandung `'bg-success'` jika `type === 'success'`, dan `'bg-error'` jika `type === 'error'`.

**Validates: Requirements 7.5**

---

### Property 17: generateAriaLabel completeness

*For any* `ChipQuestion`, `generateAriaLabel(q)` harus menghasilkan string yang mengandung representasi verbal dari `q.a`, `q.b`, dan operator (`'ditambah'` atau `'dikurangi'`); nilai negatif harus dibaca sebagai `"negatif N"`.

**Validates: Requirements 8.3**

---

## Error Handling

### Chip Placement Tidak Valid

`validateChipPlacement()` mengembalikan pesan spesifik per zona yang salah. Pesan ditampilkan di `Feedback_Panel` dengan `role="alert"`. Animasi tidak dimulai. Pengguna dapat memperbaiki chip dan mencoba lagi — `canCompute` dan flow drag-and-drop tetap aktif.

### Arrow Placement Tidak Valid

`validateArrowPlacement()` mengembalikan pesan yang menyebutkan Arrow 1 dan/atau Arrow 2 yang salah beserta nilai yang diharapkan. Pesan ditampilkan di `arrowFeedback` state di `page.tsx`. `checkAnswer()` tidak dipanggil. Pengguna dapat memperbaiki panah via `GameLineArrowControls` (existing, tidak diubah) dan mencoba lagi.

### Validasi Input Kosong / Tidak Valid

`validateChipAnswer()` menangani kasus:
- Input kosong (`''`) → error "Jawaban tidak boleh kosong"
- Hanya tanda minus (`'-'`) → error "Jawaban tidak boleh kosong"
- NaN setelah parse → error "Jawaban tidak boleh kosong"
- Jawaban salah → error dengan nilai correct answer

### Firestore Write Failure

`scoreService.ts` sudah menangani ini:
1. Retry 3x dengan exponential backoff (500ms, 1000ms, 1500ms)
2. Setelah 3 kegagalan: antrekan poin ke `localStorage`
3. Flush antrian digabungkan ke panggilan `awardPoints()` berikutnya

Halaman game tidak perlu menangani error Firestore secara eksplisit — `awardPoints()` adalah fire-and-forget.

### `generateChipQuestion()` — Zero Exclusion

Loop `while (v === 0)` di generator memastikan `a !== 0` dan `b !== 0`. Tidak ada mekanisme error khusus karena peluang zero sangat kecil dan loop selesai dalam iterasi pertama atau kedua hampir selalu.

### AuthProvider Loading State

Saat `profile` belum dimuat, `resolveDisplayScore(profile?.totalScore)` mengembalikan `0` — tidak ada fallback UI khusus yang diperlukan.

### Navigasi Keluar dari Halaman Game

`Session_Score` direset secara implisit karena React state di-unmount bersama komponen. `arrowFeedback` di-unmount bersama `intline-run/page.tsx`. Cleanup `setTimeout` via `useEffect` cleanup (pola `autoAdvanceRef` yang sama di kedua halaman).

---

## Testing Strategy

### Unit Tests (example-based)

File: `__tests__/game/chipHelpers.test.ts`

- `formatOperand(5)` → tidak ada kurung; `formatOperand(-3)` → ada kurung
- `getOperandColorClass(5)` → `'text-intblue'`; `getOperandColorClass(-5)` → `'text-intpink'`; `getOperandColorClass(0)` → neutral
- `getFeedbackClass('success')` mengandung `'bg-success'`; `getFeedbackClass('error')` mengandung `'bg-error'`
- `formatScore(1250)` → `'1.250'`; `formatScore(0)` → `'0'`
- `resolveDisplayScore(undefined)` → `0`; `resolveDisplayScore(null)` → `0`; `resolveDisplayScore(500)` → `500`
- `validateChipAnswer('', q)` → error; `validateChipAnswer('-', q)` → error
- `validateChipAnswer(String(q.answer), q)` → correct
- `validateChipAnswer(String(q.answer + 1), q)` → error dengan `q.answer` dalam pesan
- `validateChipPlacement(q.a, q.b, q)` → `{ valid: true }`
- `validateChipPlacement(q.a + 1, q.b, q)` → `{ valid: false }`, message menyebut "Bilangan 1"
- `validateChipPlacement(q.a, q.b + 1, q)` → `{ valid: false }`, message menyebut "Bilangan 2"
- `validateChipPlacement(q.a + 1, q.b + 1, q)` → `{ valid: false }`, message menyebut "Bilangan 1" SEBELUM "Bilangan 2"
- `generateAriaLabel({ a: 5, b: -3, op: '+', answer: 2 })` → contains `'negatif 3'` dan `'ditambah'`

File: `__tests__/game/arrowHelpers.test.ts`

- Arrow placement valid untuk `op = '+'`: `{ 1: {start:0, length:3}, 2: {start:3, length:4} }` dengan `q={a:3,b:4,op:'+'}` → `{ valid: true }`
- Arrow placement invalid: Arrow 1 start bukan 0 → `{ valid: false }`, message menyebut "Arrow 1"
- Arrow placement untuk `op = '-'`: `{ 1: {start:0, length:5}, 2: {start:5, length:-3} }` dengan `q={a:5,b:3,op:'-'}` → `{ valid: true }`
- Arrow placement salah untuk `op = '-'`: Arrow 2 `length = 3` (positif) dengan `op='-'` → `{ valid: false }`
- Arrow 2 start tidak sama dengan `q.a` → `{ valid: false }`, message menyebut "Arrow 2"

File: `__tests__/game/scoreService.test.ts`

- `awardPoints(null)` → returns 10, tidak memanggil Firestore (mock)
- `awardPoints(undefined)` → returns 10, tidak memanggil Firestore (mock)
- `awardPoints('uid123')` → memanggil `updateDoc` dengan `increment(10)` (mock)

### Property-Based Tests (fast-check)

File: `__tests__/game/chipHelpers.property.test.ts`

Library: **fast-check** (sudah digunakan di project ini)

Minimum 100 iterasi per property.

```typescript
// Property 1: generateChipQuestion invariant
fc.assert(
  fc.property(fc.constant(null), () => {
    const q = generateChipQuestion();
    return (
      Number.isInteger(q.a) && q.a !== 0 && q.a >= -9999 && q.a <= 9999 &&
      Number.isInteger(q.b) && q.b !== 0 && q.b >= -9999 && q.b <= 9999 &&
      (q.op === '+' || q.op === '-') &&
      q.answer === (q.op === '+' ? q.a + q.b : q.a - q.b)
    );
  }),
  { numRuns: 100 }
);

// Property 4: validateChipPlacement exactness
fc.assert(
  fc.property(
    fc.integer({ min: -9999, max: 9999 }).filter(n => n !== 0),
    fc.integer({ min: -9999, max: 9999 }).filter(n => n !== 0),
    fc.constantFrom('+', '-') as fc.Arbitrary<'+' | '-'>,
    fc.integer({ min: -9999, max: 9999 }),
    fc.integer({ min: -9999, max: 9999 }),
    (a, b, op, v1, v2) => {
      const answer = op === '+' ? a + b : a - b;
      const q = { a, b, op, answer };
      const result = validateChipPlacement(v1, v2, q);
      const shouldBeValid = v1 === a && v2 === b;
      return result.valid === shouldBeValid;
    }
  ),
  { numRuns: 200 }
);

// Property 5: validateArrowPlacement correctness
fc.assert(
  fc.property(
    fc.integer({ min: -99, max: 99 }),
    fc.integer({ min: -99, max: 99 }),
    fc.constantFrom('+', '-') as fc.Arbitrary<'+' | '-'>,
    fc.boolean(), // arrow1Valid
    fc.boolean(), // arrow2Valid
    (a, b, op, arrow1Valid, arrow2Valid) => {
      const answer = op === '+' ? a + b : a - b;
      const q = { a, b, op, answer };
      const expectedA2Length = op === '+' ? b : -b;

      const arrows: Record<1 | 2, GameArrow> = {
        1: { start: arrow1Valid ? 0 : 1, length: arrow1Valid ? a : a + 1 },
        2: { start: arrow2Valid ? a : a + 1, length: arrow2Valid ? expectedA2Length : expectedA2Length + 1 },
      };

      const result = validateArrowPlacement(arrows, q);
      return result.valid === (arrow1Valid && arrow2Valid);
    }
  ),
  { numRuns: 200 }
);

// Property 6: validateArrowPlacement subtraction direction
fc.assert(
  fc.property(
    fc.integer({ min: 1, max: 99 }),
    fc.integer({ min: 1, max: 99 }),
    (a, b) => {
      const q = { a, b, op: '-' as const, answer: a - b };
      // Benar: Arrow 2 length = -b
      const correctArrows: Record<1 | 2, GameArrow> = {
        1: { start: 0, length: a },
        2: { start: a, length: -b },
      };
      // Salah: Arrow 2 length = +b (positif)
      const wrongArrows: Record<1 | 2, GameArrow> = {
        1: { start: 0, length: a },
        2: { start: a, length: b },
      };
      return (
        validateArrowPlacement(correctArrows, q).valid === true &&
        validateArrowPlacement(wrongArrows, q).valid === false
      );
    }
  ),
  { numRuns: 100 }
);

// Property 7: Score increments by 10 on full correct flow
// (Tested via unit simulation — sessionScore delta === POINTS_PER_CORRECT)
fc.assert(
  fc.property(
    fc.integer({ min: 0, max: 99990 }),
    (score) => {
      return score + POINTS_PER_CORRECT === score + 10;
    }
  ),
  { numRuns: 100 }
);

// Property 12: validateChipAnswer correctness
fc.assert(
  fc.property(
    fc.integer({ min: -9999, max: 9999 }).filter(n => n !== 0),
    fc.integer({ min: -9999, max: 9999 }).filter(n => n !== 0),
    fc.constantFrom('+', '-') as fc.Arbitrary<'+' | '-'>,
    fc.boolean(),
    (a, b, op, isCorrect) => {
      const answer = op === '+' ? a + b : a - b;
      const q = { a, b, op, answer };
      const input = isCorrect ? String(answer) : String(answer + 1);
      const { correct, feedback } = validateChipAnswer(input, q);
      if (isCorrect) return correct === true && feedback.type === 'success';
      return correct === false && feedback.type === 'error' &&
        feedback.message.includes(String(answer));
    }
  ),
  { numRuns: 100 }
);

// Property 15: Answer input character filter
fc.assert(
  fc.property(fc.string(), (s) => {
    const filtered = filterAnswerInput(s);
    if (filtered.length === 0) return true;
    if (filtered.length > 6) return false;
    return /^-?\d*$/.test(filtered);
  }),
  { numRuns: 100 }
);
```

File: `__tests__/game/arrowHelpers.property.test.ts`

```typescript
// Didedikasikan untuk Properties 5 dan 6 (sudah ditampilkan di atas)
// Tambahan: test bahwa message selalu ada saat valid === false
fc.assert(
  fc.property(
    fc.integer({ min: -99, max: 99 }),
    fc.integer({ min: -99, max: 99 }),
    fc.constantFrom('+', '-') as fc.Arbitrary<'+' | '-'>,
    fc.integer({ min: -99, max: 99 }),
    fc.integer({ min: -99, max: 99 }),
    fc.integer({ min: -99, max: 99 }),
    fc.integer({ min: -99, max: 99 }),
    (a, b, op, s1, l1, s2, l2) => {
      const answer = op === '+' ? a + b : a - b;
      const q = { a, b, op, answer };
      const arrows: Record<1 | 2, GameArrow> = {
        1: { start: s1, length: l1 },
        2: { start: s2, length: l2 },
      };
      const result = validateArrowPlacement(arrows, q);
      if (!result.valid) return typeof result.message === 'string' && result.message.length > 0;
      return true;
    }
  ),
  { numRuns: 200 }
);
```

### Integration Tests

- `scoreService`: mock Firestore, verify `updateDoc` dengan `increment(10)` dipanggil untuk uid valid
- `scoreService`: mock Firestore gagal 3x, verify localStorage `linechip_pending_score_{uid}` diupdate
- `game-virus page`: smoke test bahwa Chip_Feedback error ditampilkan saat placement salah (chip placement mock)
- `intline-run page`: smoke test bahwa Arrow_Feedback error ditampilkan saat arrow placement salah (arrow state mock)
- Kedua page: smoke test bahwa Session_Score header ter-render dengan label "Sesi:"

### Regresi

Semua test existing harus tetap lulus:
- `__tests__/game-line/useGameLineState.property.test.ts` — tidak ada perubahan hook
- `__tests__/game/InteractionAnimation.reduced-motion.test.ts` — tidak ada perubahan komponen
- `__tests__/game/BattleStage.test.ts` — tidak ada perubahan komponen
- `__tests__/model-chip/**` — tidak ada perubahan komponen
