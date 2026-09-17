# Design Document — alliance-animation-upgrade

## Overview

Fitur ini meningkatkan kualitas visual `AllianceStage.tsx` agar mencapai *parity* dengan implementasi referensi `AllianceAnimation` di `referensi/SVG Antibody Virus Animation/src/animations/CharacterAnimations.tsx`. Peningkatan mencakup enam area visual: idle hover pop, star particles saat bounce, aura dinamis pada settled phase, tampilan nama karakter saat idle, WaitingLine antrian karakter, dan SparkTrail berbasis star particles. Semua perubahan dilakukan **hanya** pada `components/game/AllianceStage.tsx` — tidak ada file baru, tidak ada keyframe CSS baru, dan Timing_Contract (750 ms approach + 600 ms bounce→settled) tidak berubah.

## Architecture

Arsitektur mengikuti pola yang sudah ada di `BattleStage.tsx` dan implementasi referensi: satu komponen besar dengan sub-komponen kecil yang didefinisikan secara inline dalam file yang sama.

```
AllianceStage.tsx
├── idleInner()          — pure function: (isIdle, hovered, delayMs) → CSSProperties
├── SparkTrail           — upgrade ke ✦ particles dengan offset linier
├── WaitingLine          — NEW: diadopsi dari referensi, inline
├── SpeedButtons         — tidak berubah
└── AllianceStage        — komponen utama, state + render
    ├── state: phase, runKey, showBurst, showTrail, internalSpeed, hover
    ├── particles (useParticles dengan star: true, palette faction-aware)
    ├── Stage root (aria-hidden, data-testid, data-phase, data-faction)
    │   ├── Background grid
    │   ├── + divider (idle)
    │   ├── Phase label
    │   ├── SparkTrail × 2 (approach + showTrail)
    │   ├── Settled aura div (settled)
    │   ├── Shockwave + Burst (showBurst)
    │   ├── Popup "+ KUAT!" (settled)
    │   ├── Left character (hover-aware idle animation)
    │   ├── Right character (hover-aware idle animation)
    │   ├── WaitingLine left + right (queueAhead.length > 0)
    │   ├── Char name bar (idle + queueAhead.length === 0)
    │   └── Click hint
    └── Controls (SpeedButtons + play button)
```

Tidak ada perubahan pada `BattleStage.tsx`, `AnimationEffects.tsx`, atau file tes yang sudah ada.

## Components and Interfaces

### AllianceStageProps (updated)

```typescript
export interface AllianceStageProps {
  bil1Value: number;
  bil2Value: number;
  faction: "ab" | "ku";
  onComplete: () => void;
  autoStart?: boolean;
  hideControls?: boolean;
  speed?: number;
  /** NEW: Antrian PlaceValue berikutnya untuk ditampilkan sebagai WaitingLine.
   *  Default: [] (array kosong). Prop existing tidak berubah. */
  queueAhead?: PlaceValue[];
}
```

### `idleInner()` — Pure Helper Function

Menggantikan logika inline animasi idle pada inner-div karakter. Diadopsi langsung dari referensi.

```typescript
function idleInner(
  isIdle: boolean,
  hovered: boolean,
  delayMs: number
): React.CSSProperties {
  if (hovered) {
    return { animation: "idle-hover-pop 220ms ease-out forwards" };
  }
  if (isIdle) {
    return { animation: `idle-float 3200ms ease-in-out ${delayMs}ms infinite` };
  }
  return {};
}
```

**Kontrak:**
- Jika `hovered = true`: selalu kembalikan `idle-hover-pop` (tanpa delay, tanpa loop).
- Jika `isIdle = true` dan `hovered = false`: kembalikan `idle-float` dengan `delayMs` yang diberikan.
- Jika `isIdle = false`: kembalikan `{}` (animasi dikontrol oleh phase bounce/settled).

### `WaitingLine` — Sub-komponen Baru (inline)

Diadopsi dari `WaitingLine` di referensi dengan penyesuaian tipe:

```typescript
function WaitingLine({
  types,
  kind,
  side,
  uidp,
}: {
  types: PlaceValue[];
  kind: "ab" | "ku";
  side: "left" | "right";
  uidp: string;
}): React.ReactElement | null
```

**Logika:**
- Jika `types.length === 0`, kembalikan `null`.
- Tampilkan maksimal 6 elemen dari awal array (`shown = types.slice(0, 6)`).
- Opasitas indeks ke-i (0-based): `Math.max(0.28, 0.75 - i * 0.09)`.
- Animation delay per karakter: `i * 120ms`.
- Jika `types.length > 6`: render label `+{types.length - 6}` setelah karakter ke-6.
- `side="left"`: posisi `bottom: 6, left: 10`, `flex-direction: row`.
- `side="right"`: posisi `bottom: 6, right: 10`, `flex-direction: row-reverse`.

### `SparkTrail` — Upgrade (dari lingkaran ke ✦)

Ganti dari 6 lingkaran `<span>` menjadi 6 partikel `✦`. Perubahan utama:

| Sebelum | Sesudah |
|---------|---------|
| `borderRadius: "50%"` | `borderRadius: 0` (teks) |
| `background: accentHex` | `background: "transparent"`, `color: accentHex` |
| `width: 6 - i * 0.5` | diameter `8 + random*2` px (range 6–10) |
| offset horizontal: `i * 18px` | offset horizontal: `i * 12px` |
| delay: `i * 80ms` (0-indexed) | delay: `(i-1) * 80ms` (1-indexed, sehingga i=0 → delay=0 via `Math.max(0, (i)*80)` untuk i 0-based) |
| teks: tidak ada | `✦` sebagai children |

**Catatan implementasi delay:** Requirement menyebut "delay `(i-1)*80ms` dimana i adalah 1-indexed". Untuk implementasi 0-indexed (loop `i` dari 0 ke 5), ini setara `i * 80ms`:
- partikel ke-1 (i=0) → delay = 0ms
- partikel ke-2 (i=1) → delay = 80ms
- ...
- partikel ke-6 (i=5) → delay = 400ms

Jika `side` bukan `"left"` atau `"right"`, offset horizontal default ke `0`.

### State Management — Tambahan `hover`

```typescript
const [hover, setHover] = useState<null | "l" | "r">(null);
```

- Set ke `"l"` atau `"r"` via `onMouseEnter` pada inner-div karakter masing-masing, **hanya jika** `phase === "idle"`.
- Reset ke `null` via `onMouseLeave`.
- Juga di-reset ke `null` saat `play()` dipanggil (sebelum `setPhase("approach")`), melalui `setHover(null)`.
- Event handler pada karakter **tidak mengubah state** jika `phase !== "idle"` (guard clause).

### `useParticles` — Upgrade Konfigurasi

Ganti konfigurasi `useParticles` menjadi:

```typescript
const particles = useParticles(runKey, {
  count: 20,
  colors: faction === "ab"
    ? ["#93c5fd", "#60a5fa", "#bfdbfe", "#38bdf8"]
    : faction === "ku"
    ? ["#fca5a5", "#f87171", "#fecaca", "#fb7185"]
    : ["#ffffff", "#d1d5db"],          // fallback untuk faction tidak dikenal
  spread: 110,
  upward: true,
  star: true,   // ← NEW
});
```

Perubahan dari implementasi sebelumnya:
- Tambah `star: true`.
- Palette biru lebih terang dan konsisten dengan referensi (ganti `#3b82f6` → `#93c5fd`/`#60a5fa`/dll).
- `spread` naik dari 100 ke 110.
- `count` tetap 20 (dalam rentang 8–32 yang disyaratkan).

**Catatan:** `useParticles` di `AnimationEffects.tsx` sudah menerima `star` sebagai bagian dari `ParticleOptions` (sesuai implementasi referensi yang menghasilkan `star: !!star` per particle). Namun, `ParticleOptions` di `AnimationEffects.tsx` saat ini tidak mendeklarasikan `star` di interface. Interface perlu diupdate untuk menambah `star?: boolean` — ini adalah satu-satunya perubahan di `AnimationEffects.tsx` yang diizinkan karena hanya menambah field opsional ke interface.

> **Update setelah review:** Melihat `AnimationEffects.tsx` kembali, `useParticles` saat ini menghasilkan `star: Math.random() < 0.4` (40% acak). Untuk Requirement 2.1 yang mensyaratkan semua partikel bertipe star, kita perlu menambah `star?: boolean` ke `ParticleOptions` di `AnimationEffects.tsx` dan merespeknya dalam `useParticles`. Ini perubahan backward-compatible (field opsional, default ke behavior lama jika tidak diberikan).

### Char Name Bar

```tsx
<div style={{
  position: "absolute",
  bottom: 8, left: 16, right: 16,
  display: "flex",
  justifyContent: "space-between",
  opacity: phase === "idle" && !(queueAhead && queueAhead.length) ? 1 : 0,
  transition: "opacity 300ms",
  pointerEvents: "none",
}}>
  <span style={{ fontSize: 11, fontWeight: 700, color: accentRgba }}>
    {CHAR_NAMES[faction]?.[tier1] ?? ""}
  </span>
  <span style={{ fontSize: 11, fontWeight: 700, color: accentRgba }}>
    {CHAR_NAMES[faction]?.[tier2] ?? ""}
  </span>
</div>
```

Menggunakan `accentRgba` (warna aksen semi-transparan sesuai faction) dan `??""` untuk graceful fallback.

### Settled Aura — Verifikasi

Implementasi yang sudah ada di `AllianceStage.tsx` sudah benar:

```tsx
{phase === "settled" && (
  <div aria-hidden="true" style={{
    position: "absolute", left: "50%", top: "50%",
    width: 260, height: 160,
    transform: "translate(-50%, -50%)",
    borderRadius: "50%",
    background: `radial-gradient(ellipse, ${accentHex}2a 0%, transparent 70%)`,
    animation: `${faction === "ab" ? "settled-glow-blue" : "settled-glow-red"} 2s ease-in-out infinite`,
    pointerEvents: "none",
  }} />
)}
```

- Width 260px > min 230px ✓, height 160px > min 140px ✓.
- Animasi `settled-glow-blue`/`settled-glow-red` sudah ada di `animations.css` ✓.
- `aria-hidden="true"` dan `pointerEvents: "none"` ✓.

Satu penyesuaian kecil: tambahkan `role="presentation"` untuk konsistensi dengan Requirement 8.2.

### CSS Keyframes — Konfirmasi Tidak Ada Penambahan

Semua keyframe yang dibutuhkan fitur ini sudah tersedia di `app/animations.css`:

| Keyframe | Digunakan untuk | Status |
|----------|-----------------|--------|
| `idle-float` | Karakter idle + WaitingLine | ✅ Ada |
| `idle-hover-pop` | Hover pada idle | ✅ Ada |
| `bounce-merge` | Inner-div saat bounce | ✅ Ada |
| `settled-glow-blue` | Aura + inner-div faction ab | ✅ Ada |
| `settled-glow-red` | Aura + inner-div faction ku | ✅ Ada |
| `particle-fly` | Burst + SparkTrail | ✅ Ada |
| `shockwave` | Shockwave ring | ✅ Ada |
| `popup-rise` | Popup "+ KUAT!" + SparkTrail delay | ✅ Ada |
| `alliance-approach-left` | Outer-div approach kiri | ✅ Ada |
| `alliance-approach-right` | Outer-div approach kanan | ✅ Ada |

**Tidak ada blok `@keyframes` baru** yang perlu ditambahkan ke `animations.css`.

## Data Models

### State AllianceStage (lengkap)

```typescript
// Existing — tidak berubah
const [phase, setPhase]               = useState<AlliancePhase>("idle");
const [runKey, setRunKey]             = useState(0);
const [showBurst, setShowBurst]       = useState(false);
const [showTrail, setShowTrail]       = useState(false);
const [internalSpeed, setInternalSpeed] = useState(1);

// NEW
const [hover, setHover]               = useState<null | "l" | "r">(null);
```

### Konstanta Warna (faction-aware)

```typescript
const accentHex   = faction === "ab" ? "#3b82f6" : faction === "ku" ? "#ef4444" : "#6b7280";
const accentLight = faction === "ab" ? "rgba(59,130,246,0.75)"
                  : faction === "ku" ? "rgba(239,68,68,0.75)"
                  : "rgba(107,114,128,0.75)";
const accentRgba  = faction === "ab" ? "rgba(96,165,250,0.8)"
                  : faction === "ku" ? "rgba(248,113,113,0.8)"
                  : "rgba(200,200,200,0.7)";
```

Fallback netral untuk faction tidak dikenal memastikan komponen tidak error (Requirement 3.6, 6 IF unknown faction).

### `play()` — Perubahan Minimal

Tambahkan `setHover(null)` di awal `play()`:

```typescript
function play() {
  clearAllTimers();
  setHover(null);           // ← NEW: reset hover sebelum approach
  setShowBurst(false);
  setShowTrail(false);
  setRunKey((k) => k + 1);
  setPhase("approach");
  setShowTrail(true);
  // ... timer schedules tidak berubah
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: idleInner mengembalikan CSSProperties yang deterministik dan konsisten

*For any* kombinasi `(isIdle: boolean, hovered: boolean, delayMs: number ≥ 0)`, fungsi `idleInner()` harus selalu mengembalikan objek `CSSProperties` yang sama untuk input yang sama — output bersifat deterministik dan tidak bergantung pada state eksternal.

**Validates: Requirements 1.2, 1.3, 1.4**

### Property 2: idleInner prioritas hovered > isIdle

*For any* nilai `delayMs ≥ 0`, ketika `hovered = true`, `idleInner()` harus selalu mengembalikan CSSProperties yang mengandung animasi `idle-hover-pop`, tanpa memperhatikan nilai `isIdle`.

**Validates: Requirements 1.2, 1.3**

### Property 3: Hover event diabaikan di luar fase idle

*For any* `phase` selain `"idle"`, handler `onMouseEnter` dan `onMouseLeave` pada karakter tidak boleh mengubah state `hover` dari nilai sebelumnya — state animasi yang sedang berjalan harus tetap tidak terganggu.

**Validates: Requirements 1.5, 1.6**

### Property 4: Partikel star dari useParticles dengan opsi star: true

*For any* `runKey` dan konfigurasi dengan `star: true` dan `count = N` (8 ≤ N ≤ 32), `useParticles()` harus menghasilkan array dengan panjang ≤ N di mana setiap elemen memiliki `star: true`.

**Validates: Requirements 2.1**

### Property 5: Warna partikel selalu berasal dari palette yang dikonfigurasi

*For any* faction yang valid (`"ab"` atau `"ku"`) dan `runKey`, setiap partikel yang dihasilkan `useParticles()` harus memiliki warna yang merupakan anggota dari palette yang dikonfigurasi untuk faction tersebut — tidak ada warna di luar palette yang diberikan.

**Validates: Requirements 2.2**

### Property 6: allianceInnerAnim menghasilkan animasi settled-glow yang benar per faction

*For any* `scale > 0`, `allianceInnerAnim("settled", "ab", scale)` harus mengandung substring `"settled-glow-blue"`, dan `allianceInnerAnim("settled", "ku", scale)` harus mengandung substring `"settled-glow-red"`.

**Validates: Requirements 3.3**

### Property 7: Nama karakter selalu valid atau string kosong untuk semua input

*For any* `faction ∈ {"ab", "ku"}` dan `value: number`, ekspresi `CHAR_NAMES[faction]?.[dominantPlace(Math.abs(value))] ?? ""` harus mengembalikan string (tidak pernah throw), dan jika `dominantPlace` mengembalikan tier yang valid maka hasilnya adalah string non-kosong yang ada dalam `CHAR_NAMES`.

**Validates: Requirements 4.1, 4.5**

### Property 8: Nama karakter tersembunyi untuk semua queueAhead non-kosong

*For any* array `queueAhead` dengan `queueAhead.length > 0`, elemen char name bar harus memiliki `opacity: 0` (tidak terlihat), tanpa memperhatikan nilai `bil1Value`, `bil2Value`, atau `faction`.

**Validates: Requirements 4.4**

### Property 9: Opasitas WaitingLine selalu dalam rentang yang benar untuk setiap indeks

*For any* indeks `i ∈ {0, 1, 2, 3, 4, 5}`, opasitas karakter ke-i di WaitingLine harus sama persis dengan `Math.max(0.28, 0.75 - i * 0.09)`, sehingga nilai opasitas selalu berada dalam interval `[0.28, 0.75]`.

**Validates: Requirements 5.3**

### Property 10: Animation delay WaitingLine linear per indeks

*For any* indeks `i ≥ 0` yang valid (i < panjang array yang ditampilkan), animation delay karakter ke-i harus sama persis dengan `i * 120` ms.

**Validates: Requirements 5.4**

### Property 11: Offset horizontal SparkTrail linear per indeks dan konsisten dengan side

*For any* indeks `i ∈ {0, 1, 2, 3, 4, 5}` dan `side ∈ {"left", "right"}`, offset horizontal partikel ke-i harus sama persis dengan `i * 12` piksel ke arah yang berlawanan dengan posisi karakter (menjauhi tengah stage) — negatif untuk `side="right"` dan positif untuk `side="left"`.

**Validates: Requirements 6.2**

### Property 12: Delay SparkTrail berurutan linear

*For any* indeks `i ∈ {0, 1, 2, 3, 4, 5}` (0-based), delay animasi partikel ke-i dalam SparkTrail harus sama persis dengan `i * 80` ms.

**Validates: Requirements 6.3**

## Error Handling

### Faction Tidak Dikenal

`faction` secara teknis bertipe `"ab" | "ku"` di TypeScript, tetapi komponen harus tetap render dengan aman jika nilai di luar kontrak diterima di runtime. Semua kondisi faction menggunakan fallback netral:

```typescript
const accentHex = faction === "ab" ? "#3b82f6" : faction === "ku" ? "#ef4444" : "#6b7280";
```

Ekspresi `CHAR_NAMES[faction]?.[...]` menggunakan optional chaining dan nullish coalescing `?? ""` untuk mengembalikan string kosong tanpa error.

### queueAhead Undefined/Empty

Prop `queueAhead` bersifat opsional dengan default `[]`. Semua penggunaan menggunakan guard `queueAhead && queueAhead.length > 0` sebelum rendering, sehingga aman dari `undefined`.

### useParticles Array Kosong

Jika `useParticles` mengembalikan array kosong (edge case), `Burst` dirender dengan 0 partikel (tidak ada efek visual). `Shockwave` dirender terpisah dan tidak bergantung pada array partikel, sehingga tetap muncul. `onComplete` tetap dipanggil sesuai Timing_Contract.

### Timer Cleanup

`clearAllTimers()` dipanggil di cleanup effect dan di awal `play()`. Unmount sebelum animasi selesai tidak akan memicu `onComplete` karena semua timer dibatalkan.

### dominantPlace dengan Nilai Ekstrem

`dominantPlace()` menggunakan threshold `1000, 100, 10, 1` sehingga selalu mengembalikan salah satu `PlaceValue` yang valid untuk semua nilai `number` non-negatif. Nilai negatif sudah di-handle dengan `Math.abs()` sebelum digunakan.

## Testing Strategy

### Dual Testing Approach

Fitur ini cocok untuk property-based testing (PBT) pada komponen logic murni (pure functions), sementara rendering dan lifecycle menggunakan example-based tests.

**Unit Tests (example-based):**
- `idleInner()` dengan semua kombinasi kondisi (2×2×beberapa delay).
- `allianceInnerAnim()` untuk setiap phase dan faction.
- `WaitingLine` rendering: array kosong, 1-6 elemen, >6 elemen (label +N), side kiri vs kanan.
- `AllianceStage` rendering: settled aura muncul di phase settled, Popup "+ KUAT!" muncul.
- Hover state di-reset saat `play()` dipanggil.
- `data-testid`, `data-phase`, `data-faction` diperbarui saat phase berubah.

**Property-Based Tests (fast-check):**

Library: **fast-check** (tersedia di ekosistem JS/TS, cocok untuk Next.js/Jest).

Konfigurasi: minimum 100 iterasi per property test.

Tag format: `// Feature: alliance-animation-upgrade, Property {N}: {property_text}`

```
Property 1 — idleInner deterministik
  fc.property(fc.boolean(), fc.boolean(), fc.nat())
  → idleInner(a, b, c) harus selalu === idleInner(a, b, c) (idempoten)
  Tag: Feature: alliance-animation-upgrade, Property 1: idleInner returns consistent CSSProperties

Property 2 — idleInner: hovered selalu menghasilkan idle-hover-pop
  fc.property(fc.boolean(), fc.nat())
  → idleInner(isIdle, true, delay).animation harus mengandung "idle-hover-pop"
  Tag: Feature: alliance-animation-upgrade, Property 2: idleInner hover priority

Property 4 — useParticles star particles
  fc.property(fc.nat(), fc.integer({min:8, max:32}))
  → setiap partikel dalam useParticles(key, {count, star:true, colors:[...]}) harus memiliki star:true
  Tag: Feature: alliance-animation-upgrade, Property 4: all particles are star type

Property 5 — warna partikel dari palette
  fc.property(fc.constantFrom("ab","ku"), fc.nat())
  → setiap particle.color harus ada dalam palette faction yang dikonfigurasi
  Tag: Feature: alliance-animation-upgrade, Property 5: particle colors from faction palette

Property 6 — allianceInnerAnim settled glow
  fc.property(fc.float({min:0.01, max:5}))
  → allianceInnerAnim("settled","ab",scale) mengandung "settled-glow-blue"
  → allianceInnerAnim("settled","ku",scale) mengandung "settled-glow-red"
  Tag: Feature: alliance-animation-upgrade, Property 6: settled animation matches faction

Property 7 — CHAR_NAMES lookup aman
  fc.property(fc.constantFrom("ab","ku"), fc.integer())
  → CHAR_NAMES[f]?.[dominantPlace(Math.abs(v))] ?? "" harus mengembalikan string
  Tag: Feature: alliance-animation-upgrade, Property 7: char name lookup is safe

Property 9 — WaitingLine opacity formula
  fc.property(fc.integer({min:0, max:5}))
  → opacity[i] === Math.max(0.28, 0.75 - i * 0.09)
  Tag: Feature: alliance-animation-upgrade, Property 9: waiting line opacity formula

Property 10 — WaitingLine delay formula
  fc.property(fc.integer({min:0, max:5}))
  → delay[i] === i * 120
  Tag: Feature: alliance-animation-upgrade, Property 10: waiting line animation delay

Property 11 — SparkTrail offset linier
  fc.property(fc.integer({min:0, max:5}), fc.constantFrom("left","right"))
  → |offset[i]| === i * 12, tanda sesuai side
  Tag: Feature: alliance-animation-upgrade, Property 11: sparktrail offset linear

Property 12 — SparkTrail delay berurutan
  fc.property(fc.integer({min:0, max:5}))
  → delay[i] === i * 80
  Tag: Feature: alliance-animation-upgrade, Property 12: sparktrail delay sequential
```

**Regression Tests (existing — tidak diubah):**
- `__tests__/game/AllianceStage.test.ts` — timing contract tetap lulus tanpa modifikasi.
- `__tests__/game/BattleStage.test.ts` — tidak terpengaruh.
- `__tests__/game/AnimationEffects.property.test.tsx` — pastikan tetap lulus setelah penambahan `star?: boolean` ke `ParticleOptions`.

**Accessibility Smoke Tests:**
- Stage root memiliki `aria-hidden="true"` dan `role="presentation"`.
- `data-testid="alliance-stage"`, `data-phase`, `data-faction` tersedia di DOM.
- `data-testid="alliance-phase-label"` tersedia dan berisi nilai phase.
- Semua elemen efek visual memiliki `aria-hidden="true"` dan `pointerEvents: "none"`.
