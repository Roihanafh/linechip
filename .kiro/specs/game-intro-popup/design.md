# Design Document — game-intro-popup

## Overview

Fitur ini menambahkan modal intro ke dua halaman game linechip (`/game-virus` dan `/intline-run`). Modal ditampilkan saat halaman pertama kali dimuat, memblokir interaksi game, dan mencegah timer mulai berjalan sampai pengguna secara eksplisit menekan "Mulai". Begitu ditutup, timer dimulai dan game aktif sepenuhnya.

Scope perubahan minimal: satu komponen baru (`GameIntroModal`) dan modifikasi ringan pada dua halaman yang sudah ada. Tidak ada perubahan pada `useTimedScoring`, `TimerDisplay`, atau komponen game lainnya.

---

## Architecture

```
app/game-virus/page.tsx
  └─ useState: gameStarted (false → true)
  └─ GameIntroModal (isOpen=!gameStarted, onStart=handleStart)
  └─ handleStart: setGameStarted(true) + startTimer()
  └─ [game UI — conditional pointer-events block]

app/intline-run/page.tsx
  └─ useState: gameStarted (false → true)
  └─ GameIntroModal (isOpen=!gameStarted, onStart=handleStart)
  └─ handleStart: setGameStarted(true) + startTimer()
  └─ [game UI — conditional pointer-events block]

components/game/GameIntroModal.tsx
  └─ Portal ke document.body
  └─ Overlay_Backdrop (fixed inset-0)
  └─ Dialog panel (role="dialog", aria-modal, aria-labelledby)
     ├─ Judul (id="modal-title-{uid}")
     ├─ Instructions_Section (<ol>)
     └─ Start_Button (autoFocus, intblue)
  └─ useFocusTrap (internal — Tab cycling di dalam modal)
  └─ useEffect: autoFocus ke Start_Button on open
  └─ useEffect: kembalikan fokus ke previousFocus on close
```

### Aliran kontrol

```
page mount
  └─ gameStarted = false
       └─ GameIntroModal isOpen=true → tampil di atas game
            └─ startTimer() TIDAK dipanggil (dihapus dari useEffect([]))
            └─ game UI: pointer-events-none (tidak bisa diklik)

user clicks "Mulai"
  └─ onStart() dipanggil
       ├─ setGameStarted(true) → modal hilang
       └─ startTimer()        → timer mulai dari 0
            └─ game UI: pointer-events normal
```

---

## Components and Interfaces

### `GameIntroModal`

**Path:** `components/game/GameIntroModal.tsx`

```typescript
export interface GameIntroModalProps {
  /** Kontrol visibilitas — true = tampil, false = tersembunyi */
  isOpen: boolean;
  /** Judul game, ditampilkan di header modal (juga sebagai aria-labelledby target) */
  title: string;
  /** Konten instruksi per game — harus mengandung <ol> */
  instructions: React.ReactNode;
  /** Callback saat Start_Button ditekan */
  onStart: () => void;
}
```

Komponen ini menggunakan `ReactDOM.createPortal` untuk merender di luar hierarki DOM halaman, memastikan z-index stacking context tidak mengganggu elemen game.

**Tidak ada prop selain keempat di atas.** State internal hanya `uid` stabil untuk aria-labelledby.

### Modifikasi `app/game-virus/page.tsx`

| Perubahan | Detail |
|---|---|
| Tambah import | `import GameIntroModal from "@/components/game/GameIntroModal"` |
| Tambah state | `const [gameStarted, setGameStarted] = useState(false)` |
| Ubah `useEffect([]...)` | Hapus `startTimer()` dari sini |
| Tambah `handleStart` | `() => { setGameStarted(true); startTimer(); }` |
| Tambah JSX | `<GameIntroModal isOpen={!gameStarted} title="Antibodi vs Kuman" instructions={<GameVirusInstructions />} onStart={handleStart} />` |
| Blokir interaksi | Wrapper game UI: `className={!gameStarted ? "pointer-events-none select-none" : ""}` |

**`GameVirusInstructions`** — komponen inline (tidak diekspor, didefinisikan di file yang sama):

```tsx
function GameVirusInstructions() {
  return (
    <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
      <li>Baca soal di banner atas — perhatikan nilai <strong>Bilangan 1</strong> (positif/Ab) dan <strong>Bilangan 2</strong> (negatif/Ku).</li>
      <li>Seret chip <strong>Ab (+)</strong> dari Kolam Antibodi ke zona <strong>Bilangan 1</strong> sesuai nilai soal.</li>
      <li>Seret chip <strong>Ku (−)</strong> dari Kolam Kuman ke zona <strong>Bilangan 2</strong> sesuai nilai soal.</li>
      <li>Tekan <strong>⚔️ Hitung Hasil</strong> untuk memulai animasi pertempuran.</li>
      <li>Ketikkan jawaban numerik lalu tekan <strong>Periksa</strong>.</li>
      <li className="text-intblue font-semibold">Semakin cepat kamu menjawab, semakin besar poin yang kamu dapatkan!</li>
    </ol>
  );
}
```

### Modifikasi `app/intline-run/page.tsx`

Identik secara struktur, dengan perbedaan konten:

| Perubahan | Detail |
|---|---|
| Tambah import | `import GameIntroModal from "@/components/game/GameIntroModal"` |
| Tambah state | `const [gameStarted, setGameStarted] = useState(false)` |
| Ubah `useEffect([]...)` | Hapus `startTimer()` dari sini |
| Tambah `handleStart` | `() => { setGameStarted(true); startTimer(); }` |
| Tambah JSX | `<GameIntroModal isOpen={!gameStarted} title="Game Garis Bilangan 🎯" instructions={<GameLineInstructions />} onStart={handleStart} />` |
| Blokir interaksi | Wrapper game UI: `className={!gameStarted ? "pointer-events-none select-none" : ""}` |

**`GameLineInstructions`** — komponen inline:

```tsx
function GameLineInstructions() {
  return (
    <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
      <li>Baca soal di kartu soal — perhatikan nilai dan operasi (+/−).</li>
      <li>Atur <strong>Panah 1</strong> dan <strong>Panah 2</strong> pada garis bilangan agar posisinya sesuai nilai soal.</li>
      <li>Tekan <strong>▶ Cek Posisi</strong> untuk melihat animasi panah.</li>
      <li>Ketikkan jawaban numerik lalu tekan <strong>Periksa</strong>.</li>
      <li className="text-intblue font-semibold">Semakin cepat kamu menjawab, semakin besar poin yang kamu dapatkan!</li>
    </ol>
  );
}
```

---

## Data Models

Tidak ada data model baru. State yang relevan:

```typescript
// Di setiap halaman game
const [gameStarted, setGameStarted] = useState<boolean>(false);

// Di dalam GameIntroModal (internal)
const modalId = useId(); // React 18 — stable unique ID untuk aria-labelledby
```

**State lifecycle:**

```
gameStarted: false  →  (user clicks "Mulai")  →  gameStarted: true
     ↑                                                    ↑
  on mount                                        permanent for session
```

State tidak dipersist ke `localStorage`. Re-mount (navigasi keluar/kembali) selalu memulai ulang dari `false`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Title selalu tampil di dalam modal

*For any* string judul yang diberikan ke `GameIntroModal`, teks judul tersebut harus selalu muncul dalam output render modal saat `isOpen={true}`.

**Validates: Requirements 1.4**

### Property 2: Instructions selalu mengandung elemen list terurut

*For any* `React.ReactNode` yang diberikan sebagai prop `instructions`, output render modal saat `isOpen={true}` harus selalu mengandung elemen `<ol>`.

**Validates: Requirements 1.5**

### Property 3: ARIA attributes selalu hadir

*For any* kombinasi `title` dan `instructions` yang diberikan ke `GameIntroModal`, elemen dialog yang dirender harus selalu memiliki `role="dialog"` dan `aria-modal="true"`.

**Validates: Requirements 5.1**

### Property 4: aria-labelledby selalu menunjuk ke elemen judul yang valid

*For any* string `title` yang diberikan, nilai `aria-labelledby` pada elemen dialog harus selalu merujuk ke `id` elemen yang berisi teks judul tersebut — sehingga keduanya selalu konsisten.

**Validates: Requirements 5.2**

### Property 5: Focus trap mencegah Tab keluar modal

*For any* jumlah elemen yang dapat difokus di dalam modal (minimal satu — Start_Button), penekanan `Tab` berulang kali harus selalu mengembalikan fokus ke dalam modal dan tidak pernah keluar ke elemen di belakang overlay.

**Validates: Requirements 5.4**

### Property 6: Reduced-motion tidak menggunakan transform animations

*For any* modal yang dirender saat media query `prefers-reduced-motion: reduce` aktif, kelas animasi yang mengandung `scale` atau `translate` tidak boleh diterapkan pada elemen modal — hanya transisi `opacity` yang diizinkan.

**Validates: Requirements 5.6**

---

## Error Handling

| Skenario | Penanganan |
|---|---|
| `onStart` melempar exception | Exception merambat ke boundary normal React — tidak ada error handling khusus (ini adalah callback developer-supplied) |
| `createPortal` sebelum `document` tersedia (SSR) | Gunakan `typeof document !== 'undefined'` guard; jika tidak tersedia, return `null` |
| `instructions` adalah `null` atau `undefined` | Komponen merender `<ol>` kosong — tidak crash |
| Modal dipanggil dengan `isOpen={false}` sejak awal | `return null` langsung — tidak ada DOM overhead |

---

## Testing Strategy

### Unit Tests (Example-Based)

File: `__tests__/game/GameIntroModal.unit.test.tsx`

Kasus uji utama:
- Saat `isOpen={false}` → komponen tidak merender ke DOM
- Saat `isOpen={true}` → elemen dengan `role="dialog"` ada di DOM
- Start_Button memiliki label "Mulai"
- Klik Start_Button memanggil `onStart` tepat satu kali
- Focus dipindah ke Start_Button saat modal terbuka
- Fokus dikembalikan ke elemen sebelumnya saat modal ditutup
- Enter/Space pada Start_Button memanggil `onStart`

File: `__tests__/game-virus/gameStartedState.unit.test.tsx`

- Sebelum klik "Mulai": `startTimer` belum dipanggil, `elapsedTime = 0`
- Setelah klik "Mulai": `startTimer` dipanggil tepat sekali, modal tidak visible

### Property Tests (Property-Based)

Library: **fast-check** (sudah tersedia di ekosistem proyek)
Konfigurasi: minimum 100 iterasi per properti.

File: `__tests__/game/GameIntroModal.property.test.tsx`

```typescript
// Contoh kerangka — bukan implementasi lengkap

// Feature: game-intro-popup, Property 1: Title selalu tampil di dalam modal
it.prop([fc.string({ minLength: 1 })])("title selalu dirender", (title) => {
  const { getByText } = render(
    <GameIntroModal isOpen title={title} instructions={<ol><li>x</li></ol>} onStart={() => {}} />
  );
  expect(getByText(title)).toBeInTheDocument();
});

// Feature: game-intro-popup, Property 2: Instructions selalu mengandung <ol>
it.prop([fc.string()])("instructions selalu mengandung ol", (content) => {
  const { container } = render(
    <GameIntroModal isOpen title="Test" instructions={<ol><li>{content}</li></ol>} onStart={() => {}} />
  );
  expect(container.querySelector("ol")).toBeInTheDocument();
});

// Feature: game-intro-popup, Property 3: ARIA attributes selalu hadir
it.prop([fc.string({ minLength: 1 }), fc.string()])("aria attrs hadir", (title, content) => {
  const { getByRole } = render(
    <GameIntroModal isOpen title={title} instructions={<ol><li>{content}</li></ol>} onStart={() => {}} />
  );
  const dialog = getByRole("dialog");
  expect(dialog).toHaveAttribute("aria-modal", "true");
});

// Feature: game-intro-popup, Property 4: aria-labelledby menunjuk ke elemen judul
it.prop([fc.string({ minLength: 1 })])("aria-labelledby konsisten dengan judul", (title) => {
  const { getByRole, getByText } = render(
    <GameIntroModal isOpen title={title} instructions={<ol><li>x</li></ol>} onStart={() => {}} />
  );
  const dialog = getByRole("dialog");
  const labelledById = dialog.getAttribute("aria-labelledby");
  const titleEl = getByText(title);
  expect(titleEl.id).toBe(labelledById);
});
```

Tag per properti (untuk traceability):
- **Feature: game-intro-popup, Property 1: Title selalu tampil di dalam modal**
- **Feature: game-intro-popup, Property 2: Instructions selalu mengandung elemen list terurut**
- **Feature: game-intro-popup, Property 3: ARIA attributes selalu hadir**
- **Feature: game-intro-popup, Property 4: aria-labelledby selalu menunjuk ke elemen judul yang valid**
- **Feature: game-intro-popup, Property 5: Focus trap mencegah Tab keluar modal**
- **Feature: game-intro-popup, Property 6: Reduced-motion tidak menggunakan transform animations**

### Integration Notes

Property 5 (focus trap) dan Property 6 (reduced-motion) lebih tepat diuji sebagai unit test berbasis example karena melibatkan event keyboard dan media query mock — bukan variasi input yang bermakna. Implementasinya:
- Property 5: Simulasi Tab dengan `userEvent.tab()` dari `@testing-library/user-event`, assert `document.activeElement` tetap di dalam modal
- Property 6: Mock `window.matchMedia` untuk `prefers-reduced-motion: reduce`, assert tidak ada class `animate-*` dengan `scale`/`translate` pada elemen modal

---

## Implementation Notes

### `GameIntroModal` — Detail Internal

```
DOM structure (saat isOpen=true):
  [Portal → document.body]
    <div fixed inset-0 z-50>                   ← Overlay_Backdrop
      <div fixed inset-0 bg-black/60 aria-hidden>   ← backdrop semi-transparan
      <div role="dialog" aria-modal aria-labelledby={uid}>  ← Dialog panel
        <h2 id={uid}>                           ← Judul (aria-labelledby target)
        <div>                                   ← Instructions_Section wrapper
          {instructions}                        ← <ol> dari props
        </div>
        <button autoFocus onClick={onStart}>    ← Start_Button
          Mulai
        </button>
      </div>
    </div>
```

**Animasi masuk/keluar:**

Normal:
```css
/* masuk */
@keyframes modal-enter-kf {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
/* keluar — via conditional class sebelum unmount */
@keyframes modal-exit-kf {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.95); }
}
```

`prefers-reduced-motion: reduce` → hanya `opacity`, tanpa `scale`/`translate`.

Implementasi menggunakan `@media (prefers-reduced-motion: reduce)` di CSS untuk override keyframes, bukan conditional JS class.

**Focus Trap — implementasi:**

```typescript
// Di dalam GameIntroModal, sebuah useEffect:
useEffect(() => {
  if (!isOpen) return;
  const panel = panelRef.current;
  const focusable = panel.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [isOpen]);
```

**Focus restoration:**

```typescript
useEffect(() => {
  if (!isOpen) return;
  const previousFocus = document.activeElement as HTMLElement;
  return () => { previousFocus?.focus(); };
}, [isOpen]);
```

**SSR guard:**

```typescript
if (typeof document === "undefined") return null;
return createPortal(<...>, document.body);
```

### Perubahan `useEffect` di kedua halaman

**Sebelum:**
```typescript
useEffect(() => {
  startTimer();
}, []);
```

**Sesudah:**
```typescript
// Dihapus sepenuhnya — timer dimulai di handleStart
const handleStart = () => {
  setGameStarted(true);
  startTimer();
};
```

### Blokir interaksi saat modal terbuka

Wrapper `<div>` di sekitar seluruh konten game (di luar `GameIntroModal`) mendapat class kondisional:

```tsx
<div className={!gameStarted ? "pointer-events-none select-none" : ""}>
  {/* seluruh game UI */}
</div>
```

Ini memastikan elemen di balik overlay tidak bisa diklik atau diselect, tanpa perlu atribut `inert` (yang membutuhkan polyfill di beberapa browser).
