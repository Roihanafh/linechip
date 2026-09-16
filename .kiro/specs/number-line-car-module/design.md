# Design Document — Number Line Car Module

## Overview

Fitur ini menggantikan dan menyempurnakan modul garis bilangan di **linechip** agar perilakunya identik dengan project referensi **intline** (`add-sub-int`). Tiga perubahan utama:

1. **Routing split**: `/garis-bilangan` redirect ke dua halaman terpisah — `/garis-bilangan/penjumlahan` dan `/garis-bilangan/pengurangan`.
2. **Animasi dua-fase yang benar**: logika arah hadap (*facing direction*) dan arah gerak (*movement direction*) yang mencerminkan aturan matematika — terutama untuk pengurangan, di mana arah hadap berbeda dari arah gerak ketika `num2 < 0`.
3. **Scrollable canvas** dengan tick spacing tetap 60 px dan auto-scroll saat mobil keluar viewport.

Seluruh drawing primitive — `drawCar`, `drawCarTrail`, `drawSegmentPill`, `drawResultDot`, `drawDustParticles`, `drawNumberLineGrid`, `derivePhase2Color` — sudah tersedia di `lib/canvas/numberLineRenderer.ts` yang sudah ada dan **tidak diubah**. Komponen baru membangun di atas library ini.

---

## Architecture

### Directory Structure (file baru dan yang diubah)

```
linechip/
├── app/
│   └── garis-bilangan/
│       ├── layout.tsx             (diubah: update metadata)
│       ├── page.tsx               (diubah: redirect ke /penjumlahan)
│       ├── penjumlahan/
│       │   ├── layout.tsx         (BARU)
│       │   └── page.tsx           (BARU)
│       └── pengurangan/
│           ├── layout.tsx         (BARU)
│           └── page.tsx           (BARU)
├── app/materi/page.tsx            (diubah: update 2 link)
├── components/
│   └── number-line/               (BARU: direktori komponen)
│       ├── index.ts
│       ├── InputPanel.tsx
│       ├── ResultPanel.tsx
│       └── InstructionModal.tsx
├── components/NumberLineCanvas/
│   └── index.tsx                  (diubah: ganti non-scrollable dengan scrollable)
├── components/AppShell.tsx        (diubah: tambah route baru ke MAIN_ROUTES)
└── lib/
    └── number-line/               (BARU: direktori logic murni)
        ├── index.ts
        ├── types.ts               (TypeScript interfaces)
        ├── formatters.ts          (format display angka)
        ├── directionLogic.ts      (arah hadap & gerak)
        └── narrativeText.ts       (penjelasan naratif)
```

### Component Tree

```
PenjumlahanPage / PenguranganPage
  └── div.max-w-3xl  (page shell dengan layout linechip)
      ├── BackLink (← Materi)
      ├── h1 (judul halaman)
      ├── InputPanel            ← components/number-line/InputPanel.tsx
      │     props: operation (fixed '+'/'-'), onCalculate, onShowInstructions
      ├── NumberLineCanvas      ← components/NumberLineCanvas/index.tsx (diupgrade)
      │     props: num1, num2, operation, runKey, onResult
      ├── ResultPanel           ← components/number-line/ResultPanel.tsx
      │     props: num1, num2, operation, result
      └── InstructionModal      ← components/number-line/InstructionModal.tsx
            props: operationType, isOpen, onClose
```

---

## Components and Interfaces

### 1. `app/garis-bilangan/page.tsx` — Redirect

```tsx
// app/garis-bilangan/page.tsx
import { redirect } from "next/navigation";

export default function GarisBilanganPage() {
  redirect("/garis-bilangan/penjumlahan");
}
```

Menggunakan `redirect()` dari `next/navigation` — ini adalah server-side permanent redirect di Next.js App Router.

---

### 2. `app/garis-bilangan/penjumlahan/page.tsx` dan `pengurangan/page.tsx`

Kedua halaman memiliki struktur identik, hanya berbeda pada `operation` prop dan judul.

```tsx
// Pola umum untuk kedua halaman
'use client';
export default function PenjumlahanPage() {
  const [num1Input, setNum1Input] = useState(0);
  const [num2Input, setNum2Input] = useState(0);
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCalculate = useCallback(() => {
    setResult(null);
    setNum1(num1Input);
    setNum2(num2Input);
    setRunKey(k => k + 1);
  }, [num1Input, num2Input]);

  return (
    <div className="min-h-screen bg-surface py-10">
      <div className="max-w-3xl mx-auto px-4">
        {/* Back link */}
        {/* h1: "Penjumlahan Bilangan Bulat" */}
        <InputPanel
          num1={num1Input} num2={num2Input}
          operation="+"
          onNum1Change={setNum1Input}
          onNum2Change={setNum2Input}
          onCalculate={handleCalculate}
          onShowInstructions={() => setIsModalOpen(true)}
        />
        <NumberLineCanvas
          num1={num1} num2={num2}
          operation="+"
          runKey={runKey}
          onResult={r => setResult(r)}
        />
        <ResultPanel
          num1={num1} num2={num2}
          operation="+"
          result={result}
        />
        <InstructionModal
          operationType="addition"
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </div>
  );
}
```

**State management disimpan di page** — tidak ada global store. Pola ini konsisten dengan `app/garis-bilangan/page.tsx` yang sudah ada.

---

### 3. `lib/number-line/types.ts`

```ts
export type Operation = '+' | '-';
export type CarDirection = 'left' | 'right';

export interface NumberLineCanvasProps {
  num1: number;
  num2: number;
  operation: Operation;
  runKey?: number;
  onResult?: (result: number) => void;
}

export interface InputPanelProps {
  num1: number;
  num2: number;
  operation: Operation;
  onNum1Change: (val: number) => void;
  onNum2Change: (val: number) => void;
  onCalculate: () => void;
  onShowInstructions: () => void;
}

export interface ResultPanelProps {
  num1: number;
  num2: number;
  operation: Operation;
  result: number | null;
}

export interface InstructionModalProps {
  operationType: 'addition' | 'subtraction';
  isOpen: boolean;
  onClose: () => void;
}

export type AnimPhase = 'IDLE' | 'PHASE_1' | 'PHASE_2' | 'DONE';

export interface ScrollState {
  scrollOffset: number;         // px dari kiri canvas virtual
  virtualWidth: number;         // total lebar canvas virtual (px)
  tickSpacing: number;          // px per unit bilangan bulat (default 60)
  viewportWidth: number;        // lebar container yang terlihat (px)
}
```

---

### 4. `lib/number-line/formatters.ts`

```ts
/** Clamp integer ke rentang [min, max] */
export function clampInt(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Format bilangan bulat untuk tampilan input — negatif dengan tanda kurung */
export function formatIntInput(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

/** Format bilangan bulat untuk display ResultPanel */
export function formatIntDisplay(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

/** Warna CSS class berdasarkan tanda bilangan */
export function getNumberColorClass(n: number): 'text-intblue' | 'text-intpink' {
  return n >= 0 ? 'text-intblue' : 'text-intpink';
}
```

---

### 5. `lib/number-line/directionLogic.ts`

Ini adalah modul **paling kritis** — menentukan arah hadap dan arah gerak untuk setiap fase animasi.

```ts
import type { Operation, CarDirection } from './types';

/**
 * Phase 1: arah hadap dan gerak sama — ditentukan oleh tanda num1.
 */
export function getPhase1Direction(num1: number): CarDirection {
  return num1 >= 0 ? 'right' : 'left';
}

/**
 * Phase 2 — Facing direction (arah hadap mobil):
 *
 * PENJUMLAHAN (+):
 *   - num2 >= 0 → hadap kanan
 *   - num2 < 0  → hadap kiri
 *
 * PENGURANGAN (−):
 *   - num2 > 0  → hadap kiri  (kurangi positif = mundur)
 *   - num2 < 0  → hadap kanan (kurangi negatif = maju, tapi mundur dari kiri)
 *   - num2 = 0  → hadap kanan (diam)
 */
export function getPhase2FacingDirection(
  num2: number,
  op: Operation,
): CarDirection {
  if (op === '+') {
    return num2 >= 0 ? 'right' : 'left';
  }
  // op === '-'
  if (num2 > 0) return 'left';
  if (num2 < 0) return 'right';
  return 'right'; // num2 === 0: diam, hadap kanan
}

/**
 * Phase 2 — Movement direction (arah gerak aktual):
 * Selalu ditentukan oleh tanda (num1 op num2) - num1 = delta gerak.
 *
 * Ekuivalen dengan: result > num1 → kanan, result < num1 → kiri.
 * Ketika delta = 0 (num2 = 0), kembalikan 'right' sebagai default.
 */
export function getPhase2MovementDirection(
  num1: number,
  num2: number,
  op: Operation,
): CarDirection {
  const result = op === '+' ? num1 + num2 : num1 - num2;
  if (result > num1) return 'right';
  if (result < num1) return 'left';
  return 'right';
}

/**
 * Tabel kebenaran lengkap untuk pengurangan (kasus terpenting):
 *
 * | num2  | Arah Hadap | Arah Gerak | Penjelasan                                |
 * |-------|-----------|-----------|-------------------------------------------|
 * | > 0   | kiri      | kiri      | 3−5: mundur, hadap kiri                  |
 * | < 0   | kanan     | kanan     | 3−(−5): maju, hadap kanan (mob mundur kiri meski hadap kanan) ← PERHATIAN |
 * | = 0   | kanan     | diam      | 3−0: tidak bergerak                       |
 *
 * Catatan: untuk num2 < 0 dalam pengurangan, movement direction = kanan
 * karena result = num1 - num2 = num1 + |num2| > num1.
 * Facing direction juga kanan karena "mengurangi negatif" = maju ke kanan.
 * Ini berarti FACING === MOVEMENT untuk kasus ini (berbeda dari arah kiri
 * yang "balik mundur" di intline). Verifikasi ulang dengan referensi intline.
 */
```

**Perbedaan kritis dari `components/NumberLineCanvas/index.tsx` yang ada sekarang:**

Komponen saat ini (`components/NumberLineCanvas/index.tsx`) menggunakan `dir2: "left" | "right" = currentX >= num1X ? "right" : "left"` — arah ditentukan dari posisi piksel. Ini **tidak tepat** karena tidak membedakan *facing* dari *movement*. Di intline, `drawCar` dipanggil dengan *facing direction*, bukan movement direction.

---

### 6. `lib/number-line/narrativeText.ts`

```ts
import type { Operation } from './types';

export interface NarrativePhases {
  phase1: string;
  phase2: string;
}

export function buildNarrativeText(
  num1: number,
  num2: number,
  op: Operation,
): NarrativePhases {
  const fmt = (n: number) => n < 0 ? `(${n})` : `${n}`;

  let phase1: string;
  if (num1 === 0) {
    phase1 = 'Fase 1: Bilangan pertama adalah 0 — kita tetap di titik asal.';
  } else {
    const dir1 = num1 > 0 ? 'kanan' : 'kiri';
    phase1 = `Fase 1: Dari titik 0, bergerak ke ${dir1} sebanyak ${Math.abs(num1)} langkah menuju titik ${fmt(num1)}.`;
  }

  let phase2: string;
  if (op === '+') {
    if (num2 === 0) {
      phase2 = `Fase 2: Menambahkan 0 — posisi tetap di ${fmt(num1)}.`;
    } else {
      const dir2 = num2 > 0 ? 'kanan' : 'kiri';
      phase2 = `Fase 2: Dari titik ${fmt(num1)}, tambahkan ${fmt(num2)} dengan bergerak ke ${dir2} sebanyak ${Math.abs(num2)} langkah.`;
    }
  } else {
    if (num2 === 0) {
      phase2 = `Fase 2: Mengurangi 0 — posisi tetap di ${fmt(num1)}.`;
    } else if (num2 > 0) {
      phase2 = `Fase 2: Dari titik ${fmt(num1)}, kurangi ${fmt(num2)} — mengurangi bilangan positif berarti bergerak ke kiri sebanyak ${Math.abs(num2)} langkah.`;
    } else {
      phase2 = `Fase 2: Dari titik ${fmt(num1)}, kurangi ${fmt(num2)} — mengurangi bilangan negatif berarti bergerak ke kanan sebanyak ${Math.abs(num2)} langkah.`;
    }
  }

  return { phase1, phase2 };
}
```

---

### 7. `components/number-line/InputPanel.tsx`

Komponen input yang sepenuhnya baru mengikuti desain token linechip (Tailwind CSS, `rounded-2xl`, `intblue`/`intpink`).

```tsx
interface InputPanelProps {
  num1: number;
  num2: number;
  operation: '+' | '-';
  onNum1Change: (val: number) => void;
  onNum2Change: (val: number) => void;
  onCalculate: () => void;
  onShowInstructions: () => void;
}
```

**Fitur utama:**
- Dua input dengan stepper +/− (clamp ke `[-99, 99]`)
- Format `(n)` untuk bilangan negatif, overlay parenthesis `(` `)` di atas input
- Warna border/bg input: `intblue` jika nilai ≥ 0, `intpink` jika nilai < 0
- Operator ditampilkan fixed (tidak bisa diubah user)
- Tombol "Hitung" selalu aktif
- Enter pada input memanggil `onCalculate`
- Tombol 💡 memanggil `onShowInstructions`
- Semua elemen interaktif memiliki `aria-label`

---

### 8. `components/number-line/ResultPanel.tsx`

```tsx
interface ResultPanelProps {
  num1: number;
  num2: number;
  operation: '+' | '-';
  result: number | null;
}
```

**Fitur utama:**
- Placeholder teks saat `result === null`
- Persamaan `num1 op num2 = result` dengan warna per-angka
- Semua angka diformat dengan `formatIntDisplay(n)` (tanda kurung untuk negatif)
- Penjelasan naratif dua-fase dari `buildNarrativeText()`
- Pesan "🔄 Kembali ke titik asal!" saat `result === 0`

---

### 9. `components/number-line/InstructionModal.tsx`

```tsx
interface InstructionModalProps {
  operationType: 'addition' | 'subtraction';
  isOpen: boolean;
  onClose: () => void;
}
```

**Fitur utama:**
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` mengarah ke heading modal
- Focus trap: Tab/Shift+Tab terjebak di dalam modal
- Tutup dengan: tombol ×, klik backdrop, tekan Escape
- Konten berbeda untuk `addition` vs `subtraction` (4 aturan masing-masing)
- `onClose` mengembalikan fokus ke elemen trigger

---

### 10. `components/NumberLineCanvas/index.tsx` — Scrollable Upgrade

Ini adalah upgrade terbesar. Canvas saat ini tidak scrollable. Komponen baru menambahkan lapisan scroll tanpa mengubah `lib/canvas/numberLineRenderer.ts`.

**Arsitektur Scrollable Canvas:**

```
┌─ containerRef (div, overflow:hidden) ──────────────────┐
│  ┌─ canvasRef (canvas, width = virtualWidth) ──────────┐│
│  │  [garis bilangan virtual penuh]                    ││
│  └──────────────────────────────────────────────────────┘│
│  ← shadow-left (visible saat scrollOffset > 0)          │
│                       shadow-right (visible saat ada overflow) →│
└────────────────────────────────────────────────────────────┘
```

```ts
// Ukuran canvas virtual
const TICK_SPACING = 60;       // px per unit bilangan bulat (default)
const MIN_TICK_SPACING = 30;   // px minimum
const MIN_VISIBLE_TICKS = 10;  // minimum tick dalam viewport
const CANVAS_HEIGHT = 280;

// Hitung virtual width dari rentang tick
function computeVirtualWidth(uniqueTicks: number[]): number {
  return (uniqueTicks.length + 2) * TICK_SPACING;
}

// Tentukan tick spacing adaptif berdasarkan viewport
function computeAdaptiveSpacing(viewportWidth: number): number {
  // Minimum: 10 tick harus muat
  const minForTenTicks = viewportWidth / MIN_VISIBLE_TICKS;
  return Math.max(MIN_TICK_SPACING, Math.min(TICK_SPACING, minForTenTicks));
}
```

**Scroll Handling:**

Canvas virtual digambar penuh (lebar = virtualWidth), kemudian posisi scroll dikontrol dengan CSS `transform: translateX(-scrollOffset)` pada elemen inner wrapper. Ini menghindari redraw canvas setiap frame scroll.

```
containerRef (overflow: hidden, width: viewportWidth)
  └── innerRef (width: virtualWidth, transform: translateX(-scrollOffset))
      └── canvasRef (width: virtualWidth, height: 280)
```

**Auto-scroll saat mobil di luar viewport:**

```ts
function autoScrollToCarIfNeeded(carX: number): void {
  const margin = TICK_SPACING; // 60px margin
  const lo = scrollOffsetRef.current + margin;
  const hi = scrollOffsetRef.current + viewportWidth - margin;
  
  if (carX < lo) {
    setScrollOffset(Math.max(0, carX - margin));
  } else if (carX > hi) {
    setScrollOffset(Math.min(maxScroll, carX - viewportWidth + margin));
  }
}
```

**Drag-to-scroll:**

```ts
// Mouse events
onPointerDown → capture pointer, save startX, startOffset
onPointerMove → setScrollOffset(clamp(startOffset - (e.clientX - startX), 0, maxScroll))
onPointerUp   → release pointer
```

**Keyboard scroll (ArrowLeft/ArrowRight):**

```ts
onKeyDown: (e) => {
  if (e.key === 'ArrowLeft')  setScrollOffset(s => Math.max(0, s - 40));
  if (e.key === 'ArrowRight') setScrollOffset(s => Math.min(maxScroll, s + 40));
}
```

**Perubahan pada rendering dalam NumberLineCanvas:**

Komponen memanggil `numberLineRenderer` dengan cara yang sama, tetapi:
1. Canvas width = `virtualWidth` (bukan lebar container)
2. `computeTickLayout` dipanggil dengan spacing tetap 60px per unit (bukan distribusi merata)
3. Setiap tick value `v` → `x = padding + (v - minTick) * TICK_SPACING`

Karena `numberLineRenderer.ts` menerima `tickPositions: Map<number, number>`, kita hanya perlu mengubah cara kita menghitung `tickPositions` — bukan fungsi renderer itu sendiri.

**Hook `useScrollableCanvas`** (internal hook untuk memisahkan scroll logic):

```ts
// hooks internal, tidak diexport
function useScrollableCanvas(virtualWidth: number, viewportWidth: number) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const maxScroll = Math.max(0, virtualWidth - viewportWidth);
  
  const scrollTo = (x: number) => setScrollOffset(clamp(x, 0, maxScroll));
  const scrollBy = (delta: number) => scrollTo(scrollOffset + delta);
  
  return { scrollOffset, maxScroll, scrollTo, scrollBy };
}
```

---

### 11. `components/AppShell.tsx` — Tambah Route Baru

```ts
const MAIN_ROUTES = new Set([
  "/",
  "/game-virus",
  "/garis-bilangan",
  "/garis-bilangan/penjumlahan",   // TAMBAH
  "/garis-bilangan/pengurangan",   // TAMBAH
  "/intline-run",
  "/leaderboard",
  "/materi",
  "/model-chip",
  "/model-chip/pengurangan",
  "/profile",
  "/tentang",
]);
```

Navbar dan Footer akan ditampilkan di kedua halaman baru.

---

### 12. `app/materi/page.tsx` — Update 2 Link

```diff
- { label: "Garis Bilangan", desc: "...", href: "/garis-bilangan", num: "1" },
+ { label: "Garis Bilangan", desc: "...", href: "/garis-bilangan/penjumlahan", num: "1" },

// ... untuk pengurangan:
- { label: "Garis Bilangan", desc: "...", href: "/garis-bilangan", num: "1" },
+ { label: "Garis Bilangan", desc: "...", href: "/garis-bilangan/pengurangan", num: "1" },
```

---

## Data Models

### State di Page Level

```ts
// State di PenjumlahanPage / PenguranganPage
interface PageState {
  num1Input: number;     // nilai saat ini di input (belum di-commit ke animasi)
  num2Input: number;
  num1: number;          // nilai yang sudah di-commit untuk animasi terakhir
  num2: number;
  runKey: number;        // increment untuk trigger animasi ulang
  result: number | null; // null = belum ada animasi
  isModalOpen: boolean;
}
```

### Animasi State (dalam NumberLineCanvas, via refs)

```ts
// Semua state animasi disimpan di ref untuk menghindari stale closure di rAF
interface AnimationRefs {
  phase: AnimPhase;
  startTime: number;
  animFrameId: number;
  // Snapshot props saat animasi dimulai
  num1Snap: number;
  num2Snap: number;
  opSnap: Operation;
  resultSnap: number;
  onResultCalled: boolean;
  // Scroll state
  scrollOffset: number;
  virtualWidth: number;
  tickSpacing: number;
}
```

### Tick Layout untuk Scrollable Canvas

Berbeda dari implementasi saat ini yang mendistribusikan tick merata di canvas, implementasi baru menggunakan spacing tetap:

```ts
interface ScrollableTickLayout {
  uniqueTicks: number[];         // semua nilai tick yang ada
  minTick: number;               // tick paling kiri
  maxTick: number;               // tick paling kanan
  tickSpacing: number;           // px per unit (60 default, min 30)
  virtualWidth: number;          // total lebar canvas virtual
  // Fungsi konversi: nilai → posisi piksel pada canvas virtual
  toPixel: (value: number) => number;
}
```

Rumus konversi:
```ts
toPixel = (value: number) =>
  CANVAS_PADDING + (value - minTick) * tickSpacing;
```

Ini menjamin spacing selalu tetap 60px (atau adaptif) terlepas dari rentang nilai.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Stepper disable saat batas

*For any* bilangan bulat `n` dalam rentang `[-99, 99]`, tombol stepper bertanda `+` pada InputPanel harus dalam keadaan disabled jika dan hanya jika `n === 99`; tombol stepper bertanda `−` harus disabled jika dan hanya jika `n === -99`.

**Validates: Requirements 3.2, 3.3**

---

### Property 2: Clamp saat input onBlur

*For any* bilangan bulat `x` yang dimasukkan langsung ke field input, nilai yang tersimpan setelah onBlur adalah `Math.max(-99, Math.min(99, x))`.

**Validates: Requirements 3.4**

---

### Property 3: Format tanda kurung untuk bilangan negatif

*For any* bilangan bulat `n`, fungsi `formatIntDisplay(n)` mengembalikan `"(n)"` ketika `n < 0`, dan `"${n}"` ketika `n >= 0`. Properti ini berlaku untuk tampilan input dan ResultPanel.

**Validates: Requirements 3.5, 6.3**

---

### Property 4: Warna input berdasarkan tanda

*For any* nilai `n` yang ditampilkan di InputPanel, elemen input menggunakan kelas CSS `intpink` ketika `n < 0`, dan `intblue` ketika `n >= 0`.

**Validates: Requirements 3.9, 3.10**

---

### Property 5: Phase 1 — arah hadap dan gerak sesuai tanda num1

*For any* bilangan bulat `num1 ≠ 0`, selama Phase 1 animasi, fungsi `getPhase1Direction(num1)` mengembalikan `'right'` ketika `num1 > 0`, dan `'left'` ketika `num1 < 0`. Mobil bergerak ke arah tersebut dan menghadap ke arah yang sama.

**Validates: Requirements 4.1, 4.2**

---

### Property 6: Phase 2 — arah hadap sesuai aturan operasi dan tanda num2

*For any* kombinasi `(num2, operation)`, fungsi `getPhase2FacingDirection(num2, op)` mengembalikan:
- `'right'` ketika `op='+' && num2 >= 0`
- `'left'`  ketika `op='+' && num2 < 0`
- `'left'`  ketika `op='-' && num2 > 0`
- `'right'` ketika `op='-' && num2 <= 0`

**Validates: Requirements 4.3, 4.5**

---

### Property 7: Phase 2 — arah gerak sesuai arah perubahan posisi

*For any* `(num1, num2, operation)`, fungsi `getPhase2MovementDirection(num1, num2, op)` mengembalikan `'right'` ketika `result > num1`, dan `'left'` ketika `result < num1`, di mana `result = op='+' ? num1+num2 : num1-num2`.

**Validates: Requirements 4.4, 4.6**

---

### Property 8: Warna trail berdasarkan arah gerak

*For any* nilai `num2` dan operation `op`, warna trail Phase 2 (`derivePhase2Color(num2, op)`) adalah `intblue` (#2F6FED) ketika arah gerak ke kanan, dan `intpink` (#EC4899) ketika arah gerak ke kiri.

**Validates: Requirements 4.8, 4.9**

---

### Property 9: Segment Pill text berisi nilai dan tanda yang benar

*For any* `(num2, op)` dengan `num2 ≠ 0`, teks Segment Pill yang dihasilkan mengandung `|num2|` dan tanda yang mencerminkan arah gerak: `+|num2|` untuk gerak kanan, `−|num2|` untuk gerak kiri.

**Validates: Requirements 4.10**

---

### Property 10: onResult dipanggil tepat sekali per siklus animasi

*For any* kombinasi `(num1, num2, operation)` yang memicu animasi melalui perubahan `runKey`, callback `onResult` dipanggil tepat satu kali dengan nilai `result = operation='+' ? num1+num2 : num1-num2`, tidak peduli berapa kali frame animasi dirender.

**Validates: Requirements 4.12**

---

### Property 11: Tick spacing tetap 60px pada canvas virtual

*For any* konfigurasi operasi dengan rentang tick `[minTick, maxTick]`, untuk setiap dua tick berurutan `v` dan `v+1`, jarak piksel antara keduanya pada canvas virtual adalah persis `tickSpacing` (60px default, atau nilai adaptif ketika viewport < 600px).

**Validates: Requirements 5.2**

---

### Property 12: Virtual width sesuai rumus

*For any* jumlah tick unik `n`, lebar canvas virtual adalah `(n + 2) × tickSpacing`.

**Validates: Requirements 5.1**

---

### Property 13: Auto-scroll membawa mobil ke dalam viewport

*For any* posisi piksel mobil `carX` dan scroll offset `scrollOffset`, jika `carX < scrollOffset + margin` atau `carX > scrollOffset + viewportWidth - margin` (dengan `margin = 60px`), maka setelah auto-scroll, `scrollOffset` diperbarui sehingga `carX` berada dalam rentang `[scrollOffset + margin, scrollOffset + viewportWidth - margin]`.

**Validates: Requirements 5.4**

---

### Property 14: Adaptive spacing menjamin minimal 10 tick visible

*For any* lebar viewport `viewportWidth > 0`, fungsi `computeAdaptiveSpacing(viewportWidth)` mengembalikan nilai spacing `s` sehingga `viewportWidth / s ≥ 10`, dengan batas minimum `s ≥ 30`.

**Validates: Requirements 5.5**

---

### Property 15: Keyboard scroll bergerak tepat 40px

*For any* scroll offset `scrollOffset` dalam rentang `[0, maxScroll]`, menekan ArrowLeft menghasilkan scroll offset baru `Math.max(0, scrollOffset - 40)`, dan ArrowRight menghasilkan `Math.min(maxScroll, scrollOffset + 40)`.

**Validates: Requirements 9.6**

---

### Property 16: ResultPanel menampilkan persamaan yang benar

*For any* `(num1, num2, operation, result)`, teks yang dirender oleh ResultPanel mengandung persamaan dalam format `formatIntDisplay(num1) op formatIntDisplay(num2) = formatIntDisplay(result)` yang secara numerik benar.

**Validates: Requirements 6.1, 6.3**

---

### Property 17: Penjelasan naratif menyebutkan arah yang benar

*For any* `(num1, num2, op)`, fungsi `buildNarrativeText(num1, num2, op)`:
- `phase1` menyebutkan "kanan" ketika `num1 > 0`, "kiri" ketika `num1 < 0`, atau "tetap di titik asal" ketika `num1 === 0`.
- `phase2` menyebutkan "kanan" atau "kiri" sesuai dengan aturan operasi dan tanda `num2`.

**Validates: Requirements 6.4**

---

### Property 18: aria-label non-empty untuk elemen interaktif InputPanel

*For any* konfigurasi InputPanel yang dirender, setiap elemen `<button>` dan `<input>` memiliki atribut `aria-label` yang bukan string kosong.

**Validates: Requirements 9.1**

---

### Property 19: Focus trap di InstructionModal

*For any* urutan penekanan Tab ketika InstructionModal terbuka, fokus keyboard selalu berada di salah satu elemen interaktif di dalam modal — tidak pernah keluar ke dokumen di luar modal.

**Validates: Requirements 9.3**

---

### Property 20: NumberLineCanvas aria-label mencerminkan operasi

*For any* `(num1, num2, op, result)`, atribut `aria-label` pada canvas mengandung nilai `num1`, simbol operator, `num2`, dan `result` setelah animasi selesai.

**Validates: Requirements 9.5**

---

## Error Handling

### Input Validation

| Kondisi | Perilaku |
|---------|---------|
| Karakter non-integer diketik di field | `onKeyDown` mencegah default — nilai field tidak berubah |
| Nilai di luar `[-99, 99]` diketik langsung | Di-clamp ke batas saat `onBlur` |
| Field dikosongkan | Nilai internal tetap 0 |
| Stepper melebihi batas | Tombol disabled — tidak ada perubahan nilai |

### Canvas Rendering

| Kondisi | Perilaku |
|---------|---------|
| Car SVG belum selesai dimuat | `drawCar` fallback ke lingkaran intblue (`getCarImageSync` returns null) |
| `num1 = 0 && num2 = 0` saat runKey berubah | Canvas tetap di state IDLE — tidak ada animasi |
| Canvas container di-resize saat animasi berjalan | `handleResize` membatalkan animasi dan restart dari Phase 1 |
| Tick target tidak ada di `tickPositions` | Interpolasi linear dari dua tick terdekat |
| Result berada di luar rentang canvas virtual | Hitung ulang `virtualWidth` dan trigger scroll ke posisi result |

### Scroll

| Kondisi | Perilaku |
|---------|---------|
| `scrollOffset` melebihi `maxScroll` | Clamp ke `maxScroll` |
| `scrollOffset` di bawah 0 | Clamp ke 0 |
| Container resize menyebabkan offset invalid | Clamp ke `maxScroll` baru |

---

## Testing Strategy

### Unit Tests (Jest + React Testing Library)

Fokus pada pure functions di `lib/number-line/` dan perilaku komponen spesifik:

**`directionLogic.test.ts`** — menggunakan [fast-check](https://github.com/dubzzz/fast-check):
```ts
// Property 5, 6, 7 — arah animasi
fc.assert(fc.property(fc.integer({min:-99, max:99}), (num1) => {
  if (num1 === 0) return true;
  return getPhase1Direction(num1) === (num1 > 0 ? 'right' : 'left');
}));
// min 100 runs (default fast-check)
```

**`formatters.test.ts`**:
```ts
// Property 3 — format tanda kurung
fc.assert(fc.property(fc.integer({max:-1}), (n) => {
  return formatIntDisplay(n) === `(${n})`;
}));
```

**`narrativeText.test.ts`** — test struktur teks naratif untuk representasi arah.

**`InputPanel.test.tsx`**:
- Stepper disable di batas (Property 1)
- Clamp saat onBlur (Property 2)
- Warna input sesuai tanda (Property 4)
- aria-label ada di semua elemen interaktif (Property 18)

**`ResultPanel.test.tsx`**:
- Persamaan yang benar (Property 16)
- Penjelasan naratif arah (Property 17)
- Placeholder saat `result === null`
- Pesan "Kembali ke titik asal!" saat `result === 0`

**`InstructionModal.test.tsx`**:
- Konten berbeda untuk addition vs subtraction
- Focus trap (Property 19)
- Tutup dengan Escape, backdrop, tombol ×

### Property-Based Tests (fast-check)

fast-check sudah tersedia di linechip (digunakan di `__tests__/model-chip/subtractionState.property.test.ts`).

Setiap property-based test menggunakan tag komentar:
```ts
// Feature: number-line-car-module, Property 5: Phase 1 direction matches num1 sign
```

Konfigurasi minimal 100 runs (default fast-check adalah 100).

File test berada di `__tests__/number-line/`:
```
__tests__/number-line/
├── directionLogic.property.test.ts   # Property 5, 6, 7
├── formatters.property.test.ts       # Property 3, 4
├── scrollLogic.property.test.ts      # Property 11, 12, 13, 14, 15
├── resultPanel.property.test.ts      # Property 16, 17
└── inputPanel.property.test.ts       # Property 1, 2, 18
```

### Integration Tests (contoh berbasis)

Untuk perilaku end-to-end yang melibatkan canvas dan routing:

- Halaman `/garis-bilangan` me-redirect ke `/garis-bilangan/penjumlahan`
- Halaman penjumlahan merender heading "Penjumlahan Bilangan Bulat"
- Halaman pengurangan merender heading "Pengurangan Bilangan Bulat"
- Link di `/materi` mengarah ke URL yang benar
- `onResult` dipanggil sekali setelah animasi selesai (Property 10)

### Visual / Snapshot Tests

Untuk memverifikasi konsistensi visual dengan intline (Requirement 8):
- Snapshot test `CANVAS_HEIGHT = 280`, `CAR_Y = 65`, `LINE_Y = 100`
- Verifikasi pemakaian `numberLineRenderer.ts` tanpa redefinisi fungsi

### Accessibility Testing

- Manual testing dengan screen reader (Narrator / NVDA)
- axe-core integration untuk otomasi ARIA attribute validation
