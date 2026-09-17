# Design Document — model-chip-animation-upgrade

## Overview

Fitur ini meningkatkan kualitas visual dua komponen dalam alur model-chip: `PairReactionStage.tsx` dan `CharacterColumn.tsx`, mengikuti pola yang sudah dibangun oleh `alliance-animation-upgrade`. Semua perubahan dilakukan **hanya** pada kedua file tersebut — tidak ada file baru, tidak ada keyframe CSS baru, dan Timing_Contract `pairCycleDuration()` tidak berubah.

`PairReactionStage` mendapat: idle hover pop saat fase approach (menggunakan `idleInner()` yang sama polanya dengan AllianceStage), SparkTrail berbasis `✦` di belakang setiap karakter, star particles dengan Mixed_Palette biru+merah, char name bar di bawah stage, serta atribut aksesibilitas `aria-hidden` dan `role="presentation"`.

`CharacterColumn` mendapat: animasi `idle-float` pada setiap chip saat `stepPhase === "idle"` dengan delay bergeser `(i % 6) * 120ms`.

## Architecture

```
PairReactionStage.tsx
├── idleInner()          — pure function: (isApproach, hovered, delayMs) → CSSProperties
├── SparkTrail           — sub-komponen inline: 6 partikel ✦ dengan offset linier
├── SpeedButtons         — tidak berubah
└── PairReactionStage    — komponen utama
    ├── state: phase, showFlash, internalSpeed, hover (NEW)
    ├── particles (useParticles: star: true, Mixed_Palette)
    ├── Stage root (aria-hidden, role, data-phase)
    │   ├── Background grid (aria-hidden)
    │   ├── VS divider (approach only, aria-hidden)
    │   ├── Phase label (data-testid="pair-reaction-phase")
    │   ├── Energy bars (non-approach)
    │   ├── SparkTrail kiri + kanan (approach only) [NEW]
    │   ├── Flash + Shockwave + Burst (showFlash)
    │   ├── Popup "NETRAL ✓" (done + isPerfect)
    │   ├── Left character (hover-aware idle animation) [UPDATED]
    │   ├── Right character (hover-aware idle animation) [UPDATED]
    │   └── Char name bar (approach only) [NEW]
    └── SpeedButtons (speedProp === undefined)

CharacterColumn.tsx
└── CharacterColumn      — updated chip rendering
    └── chip div (idle-float saat stepPhase === "idle") [UPDATED]
```

## Components and Interfaces

### `idleInner()` — Pure Helper Function (baru di PairReactionStage)

Diadopsi langsung dari pola `AllianceStage`, namun dengan parameter `isApproach` (bukan `isIdle`), karena fase "approach" pada PairReactionStage adalah fase di mana karakter masih bisa di-hover:

```typescript
function idleInner(
  isApproach: boolean,
  hovered: boolean,
  delayMs: number
): React.CSSProperties {
  if (hovered) {
    return { animation: "idle-hover-pop 220ms ease-out forwards" };
  }
  if (isApproach) {
    return { animation: `idle-float 2800ms ease-in-out ${delayMs}ms infinite` };
  }
  return {};
}
```

**Kontrak:**
- `hovered = true`: selalu kembalikan `idle-hover-pop` tanpa delay, tanpa loop.
- `isApproach = true` dan `hovered = false`: kembalikan `idle-float` dengan `delayMs` yang diberikan.
- `isApproach = false`: kembalikan `{}` (animasi dikontrol oleh phase impact/recoil/dissolve).

Nilai delay: karakter kiri menggunakan `delayMs = 0`, karakter kanan menggunakan `delayMs = 700`.

### `SparkTrail` — Sub-komponen Inline (baru di PairReactionStage)

```typescript
function SparkTrail({
  side,
  faction,
}: {
  side: "left" | "right";
  faction: "ab" | "ku";
}): React.ReactElement
```

Merender 6 `<span>` berisi `✦`. Warna: `#93c5fd` untuk `"ab"`, `#f87171` untuk `"ku"`. Offset horizontal per partikel ke-i: `side === "left" ? i * 12 : -(i * 12)` px (default 0 jika side tidak valid). Delay: `i * 80ms` (0-indexed).

```typescript
Array.from({ length: 6 }, (_, i) => (
  <span
    key={i}
    aria-hidden="true"
    style={{
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: `translate(${offset}px, -50%)`,
      fontSize: `${8 + (i % 3)}px`,
      color: accentColor,
      textShadow: `0 0 6px ${accentColor}`,
      animation: `particle-fly 600ms ease-out ${i * 80}ms forwards,
                  popup-rise 600ms ease-out ${i * 80}ms forwards`,
      pointerEvents: "none",
      userSelect: "none",
    }}
  >✦</span>
))
```

### State Management — Tambahan `hover`

```typescript
const [hover, setHover] = useState<null | "l" | "r">(null);
```

Reset ke `null` saat `runKey` atau `effectiveSpeed` berubah (di dalam `useEffect` yang sudah ada), **sebelum** `setPhase("approach")`. Guard clause pada `onMouseEnter`: hanya set hover jika `phase === "approach"`.

### PairReactionStageProps — Tidak Berubah

Tidak ada prop baru yang ditambahkan. Semua prop existing dipertahankan dengan tipe dan nilai default yang identik.

### `useParticles` — Upgrade Konfigurasi

```typescript
const particles = useParticles(runKey, {
  count: 22,
  colors: ["#93c5fd", "#f87171", "#60a5fa", "#fca5a5", "#bfdbfe", "#fecaca"], // Mixed_Palette
  spread: 110,
  star: true,   // ← NEW
});
```

Perubahan dari implementasi sebelumnya:
- Tambah `star: true`.
- Ganti palet oranye/merah ke Mixed_Palette biru+merah (sesuai pertarungan ab vs ku).
- `spread` naik dari 110 ke 110 (tidak berubah, sudah tepat).
- `count` tetap 22 (dalam rentang 8–32 yang disyaratkan).

**Catatan:** `useParticles` di `AnimationEffects.tsx` sudah mendukung `star?: boolean` setelah `alliance-animation-upgrade`. Interface `ParticleOptions` sudah memiliki field `star?: boolean`. Tidak ada perubahan pada `AnimationEffects.tsx`.

### Char Name Bar (PairReactionStage)

```tsx
<div
  aria-hidden="true"
  style={{
    position: "absolute",
    bottom: 8, left: 16, right: 16,
    display: "flex",
    justifyContent: "space-between",
    opacity: phase === "approach" ? 1 : 0,
    transition: "opacity 300ms",
    pointerEvents: "none",
  }}
>
  <span style={{ fontSize: 11, fontWeight: 700, color: leftAccent }}>
    {CHAR_NAMES[leftFaction]?.[leftType] ?? ""}
  </span>
  <span style={{ fontSize: 11, fontWeight: 700, color: rightAccent }}>
    {CHAR_NAMES[rightFaction]?.[rightType] ?? ""}
  </span>
</div>
```

Konstanta warna aksen:
```typescript
const leftAccent  = leftFaction  === "ab" ? "rgba(96,165,250,0.8)" : "rgba(248,113,113,0.8)";
const rightAccent = rightFaction === "ab" ? "rgba(96,165,250,0.8)" : "rgba(248,113,113,0.8)";
```

`rightFaction` sudah tersedia sebagai `leftFaction === "ab" ? "ku" : "ab"`.

### CharacterColumn — Chip `idle-float`

Tambah helper function `chipIdleAnim(stepPhase, globalIdx)` untuk menentukan animasi idle:

```typescript
function chipIdleAnim(stepPhase: StepPhase, globalIdx: number): string | undefined {
  if (stepPhase === "idle") {
    return `idle-float 2800ms ease-in-out ${(globalIdx % 6) * 120}ms infinite`;
  }
  return undefined;
}
```

Pada loop render chip, tambahkan variabel `globalIdx` yang dihitung lintas semua tier (increment setiap chip yang dirender). Animasi `idle-float` diterapkan **hanya** jika chip tidak dalam kondisi khusus (decomposing, gone, dimmed):

```typescript
// Tidak ada kondisi khusus aktif dan stepPhase === "idle"
const idleAnim = !isDecomposingChip && !isGone && !isDimmed
  ? chipIdleAnim(stepPhase, globalIdx)
  : undefined;
```

Style chip mendapat property `animation` dengan prioritas: kondisi khusus > idleAnim.

## Data Models

### State PairReactionStage (lengkap setelah upgrade)

```typescript
// Existing — tidak berubah
const [phase, setPhase]             = useState<Phase>("approach");
const [showFlash, setShowFlash]     = useState(false);
const [internalSpeed, setInternalSpeed] = useState(1);

// NEW
const [hover, setHover]             = useState<null | "l" | "r">(null);
```

### Reset hover di useEffect

```typescript
useEffect(() => {
  timers.current.forEach(clearTimeout);
  timers.current = [];
  setHover(null);         // ← NEW: reset hover saat runKey/speed berubah
  setPhase("approach");
  setShowFlash(false);
  // ... timer schedules tidak berubah
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [runKey, effectiveSpeed]);
```

### Konstanta Warna Stage Root

Stage root sudah menggunakan `background: "radial-gradient(..., #fff5f5 ..."`. Tidak berubah — tetap gradien merah muda karena ini adalah stage pertarungan.

### CSS Keyframes — Konfirmasi Tidak Ada Penambahan

Semua keyframe yang dibutuhkan sudah tersedia di `app/animations.css`:

| Keyframe | Digunakan untuk | Status |
|----------|-----------------|--------|
| `idle-float` | Karakter approach + chip CharacterColumn | ✅ Ada |
| `idle-hover-pop` | Hover karakter pada approach | ✅ Ada |
| `particle-fly` | SparkTrail ✦ | ✅ Ada |
| `shockwave` | Shockwave ring saat impact | ✅ Ada |
| `popup-rise` | SparkTrail delay + Popup | ✅ Ada |
| `battle-approach-left` | Outer-div approach kiri | ✅ Ada |
| `battle-approach-right` | Outer-div approach kanan | ✅ Ada |
| `battle-recoil-left` | Outer-div recoil kiri | ✅ Ada |
| `battle-recoil-right` | Outer-div recoil kanan | ✅ Ada |
| `battle-shake` | Inner-div saat impact | ✅ Ada |
| `dissolve-ccw` | Inner-div dissolve kiri | ✅ Ada |
| `dissolve-cw` | Inner-div dissolve kanan | ✅ Ada |

**Tidak ada blok `@keyframes` baru** yang perlu ditambahkan ke `animations.css`.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: `idleInner` deterministik dan memprioritaskan hover

*For any* kombinasi `(isApproach: boolean, hovered: boolean, delayMs: number ≥ 0)`, fungsi `idleInner()` harus selalu mengembalikan objek `CSSProperties` yang sama untuk input yang sama, dan ketika `hovered = true`, hasilnya harus selalu mengandung `"idle-hover-pop"` tanpa memperhatikan nilai `isApproach`.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: `idleInner` mengembalikan `{}` di luar fase approach

*For any* nilai `delayMs ≥ 0`, ketika `isApproach = false` dan `hovered = false`, `idleInner()` harus mengembalikan objek kosong `{}` — tidak mengandung properti `animation` apapun.

**Validates: Requirements 1.6**

### Property 3: Semua partikel dari `useParticles` bertipe star dan berwarna dari Mixed_Palette

*For any* `runKey` dan konfigurasi dengan `star: true` dan `colors = Mixed_Palette` dan `count = N (8 ≤ N ≤ 32)`, setiap partikel yang dihasilkan `useParticles()` harus memiliki `star: true` dan `color` yang merupakan anggota dari `Mixed_Palette`.

**Validates: Requirements 2.1, 2.2**

### Property 4: SparkTrail offset linier dan konsisten dengan side

*For any* indeks `i ∈ {0, 1, 2, 3, 4, 5}` dan `side ∈ {"left", "right"}`, offset horizontal partikel ke-i dalam SparkTrail harus sama persis dengan `i * 12` piksel — positif untuk `"left"` (menjauhi tengah ke kiri), negatif untuk `"right"` (menjauhi tengah ke kanan). Untuk `side` selain `"left"` atau `"right"`, offset harus 0.

**Validates: Requirements 3.2, 3.7**

### Property 5: SparkTrail delay berurutan linear

*For any* indeks `i ∈ {0, 1, 2, 3, 4, 5}` (0-based), delay animasi partikel ke-i dalam SparkTrail harus sama persis dengan `i * 80` ms.

**Validates: Requirements 3.3**

### Property 6: SparkTrail warna selalu sesuai faction

*For any* `faction ∈ {"ab", "ku"}`, warna yang digunakan SparkTrail harus selalu `"#93c5fd"` untuk `"ab"` dan `"#f87171"` untuk `"ku"` — tidak ada warna lain yang digunakan.

**Validates: Requirements 3.4**

### Property 7: Lookup `CHAR_NAMES` selalu aman untuk semua kombinasi valid

*For any* `faction ∈ {"ab", "ku"}` dan `type ∈ {"satuan", "puluhan", "ratusan", "ribuan"}`, ekspresi `CHAR_NAMES[faction]?.[type] ?? ""` harus mengembalikan string non-kosong yang valid, dan tidak pernah melempar error.

**Validates: Requirements 4.1, 4.5**

### Property 8: Char name bar opacity hanya 1 saat phase approach

*For any* `phase` selain `"approach"`, nilai opacity char name bar harus 0 (tidak terlihat). Untuk phase `"approach"`, opacity harus 1.

**Validates: Requirements 4.1, 4.4**

### Property 9: Delay idle-float chip menggunakan formula `(i % 6) * 120ms`

*For any* indeks chip global `i ≥ 0`, delay animasi `idle-float` chip ke-i saat `stepPhase === "idle"` harus sama persis dengan `(i % 6) * 120` ms, sehingga nilai selalu berada dalam interval `[0, 600)` ms.

**Validates: Requirements 6.2**

### Property 10: Kondisi khusus chip menimpa idle-float

*For any* chip yang berada dalam kondisi khusus (isDecomposingChip = true, isGone = true, atau isDimmed = true), animasi `idle-float` tidak boleh diterapkan pada chip tersebut, tanpa memperhatikan nilai `stepPhase`.

**Validates: Requirements 6.5**

### Property 11: `pairCycleDuration` konsisten dengan formula D_BASE

*For any* `speed > 0`, nilai `pairCycleDuration(speed)` harus sama persis dengan `Math.round((700 + 480 + 260 + 680) / speed) + 160`.

**Validates: Requirements 7.2**

## Error Handling

### Faction Tidak Dikenal

Meskipun `leftFaction` bertipe `"ab" | "ku"` di TypeScript, komponen harus aman di runtime. Semua kondisi faction menggunakan ekspresi kondisional dengan fallback:

```typescript
const leftAccent = leftFaction === "ab" ? "rgba(96,165,250,0.8)" : "rgba(248,113,113,0.8)";
```

Ekspresi `CHAR_NAMES[leftFaction]?.[leftType] ?? ""` menggunakan optional chaining dan nullish coalescing untuk mengembalikan string kosong tanpa error.

### Hover State Guard

Event handler `onMouseEnter` pada inner-div karakter menggunakan guard clause:

```typescript
onMouseEnter={() => { if (phase === "approach") setHover("l"); }}
```

`onMouseLeave` selalu reset ke `null` (aman di semua phase).

### useParticles Array Kosong

Jika `useParticles` mengembalikan array kosong, `Burst` dirender dengan 0 partikel. `Shockwave` dirender terpisah dan tidak bergantung pada array partikel — tetap muncul. `onDone` tetap dipanggil sesuai Timing_Contract.

### Timer Cleanup

`timers.current.forEach(clearTimeout)` dipanggil di awal `useEffect` cleanup dan di awal effect itu sendiri (saat runKey/speed berubah). Unmount sebelum animasi selesai tidak akan memicu `onDone` karena semua timer dibatalkan.

### CharacterColumn: globalIdx Counter

Counter `globalIdx` di-reset ke 0 di awal render dan di-increment di dalam loop chip. Ini adalah variabel lokal dalam render function, sehingga aman dari race condition. Nilai `i % 6` memastikan delay selalu dalam rentang valid `[0, 600)` ms bahkan untuk chip dengan indeks sangat besar (lebih dari 12 chip yang terrender).

## Testing Strategy

### Dual Testing Approach

Fitur ini cocok untuk property-based testing (PBT) pada pure functions (`idleInner`, `chipIdleAnim`, formula offset/delay SparkTrail, formula pairCycleDuration), sementara rendering lifecycle dan atribut aksesibilitas menggunakan example-based tests.

**Library PBT:** `fast-check` (sudah digunakan di `__tests__/game/AnimationEffects.property.test.tsx`).

**Konfigurasi:** Minimum 100 iterasi per property test.

**Tag format:** `// Feature: model-chip-animation-upgrade, Property {N}: {property_text}`

**Unit Tests (example-based):**
- `idleInner()`: semua kombinasi kondisi (2×2×beberapa delay).
- Hover state di-reset saat `runKey` berubah.
- SparkTrail tidak dirender saat phase bukan approach.
- Char name bar opacity = 0 saat phase bukan approach.
- Burst + Shockwave dirender saat showFlash = true.
- `data-testid="pair-reaction-phase"` berisi nilai phase yang benar.
- Atribut `aria-hidden="true"` pada stage root.
- CharacterColumn: chip tidak mendapat idle-float saat stepPhase bukan "idle".
- CharacterColumn: kondisi khusus menimpa idle-float.

**Property-Based Tests (fast-check):**

```
Property 1 — idleInner deterministik dan hover priority
  fc.property(fc.boolean(), fc.boolean(), fc.nat())
  → idleInner(a, b, c) selalu === idleInner(a, b, c) (deterministik)
  → idleInner(*, true, c).animation mengandung "idle-hover-pop"
  Tag: Feature: model-chip-animation-upgrade, Property 1: idleInner consistent and hover priority

Property 2 — idleInner kosong di luar approach
  fc.property(fc.nat())
  → idleInner(false, false, n) menghasilkan {} (tidak ada key animation)
  Tag: Feature: model-chip-animation-upgrade, Property 2: idleInner empty outside approach

Property 3 — partikel star dari Mixed_Palette
  fc.property(fc.nat(), fc.integer({min:8, max:32}))
  → setiap partikel dalam useParticles(key, {count, star:true, colors:Mixed_Palette})
    memiliki star:true dan color ∈ Mixed_Palette
  Tag: Feature: model-chip-animation-upgrade, Property 3: all particles star type from mixed palette

Property 4 — SparkTrail offset linier per side
  fc.property(fc.integer({min:0, max:5}), fc.constantFrom("left","right"))
  → |offset[i]| === i * 12, tanda: + untuk "left", - untuk "right"
  → side tidak valid → offset = 0
  Tag: Feature: model-chip-animation-upgrade, Property 4: sparktrail offset linear by side

Property 5 — SparkTrail delay berurutan
  fc.property(fc.integer({min:0, max:5}))
  → delay[i] === i * 80
  Tag: Feature: model-chip-animation-upgrade, Property 5: sparktrail delay sequential

Property 6 — SparkTrail warna sesuai faction
  fc.property(fc.constantFrom("ab","ku"))
  → faction "ab" → color "#93c5fd"; faction "ku" → color "#f87171"
  Tag: Feature: model-chip-animation-upgrade, Property 6: sparktrail color matches faction

Property 7 — CHAR_NAMES lookup aman
  fc.property(fc.constantFrom("ab","ku"), fc.constantFrom("satuan","puluhan","ratusan","ribuan"))
  → CHAR_NAMES[f]?.[t] ?? "" selalu mengembalikan string non-kosong, tidak pernah throw
  Tag: Feature: model-chip-animation-upgrade, Property 7: char name lookup safe

Property 8 — char name bar opacity
  fc.property(fc.constantFrom("approach","impact","recoil","dissolve","done"))
  → phase === "approach" → opacity 1; lainnya → opacity 0
  Tag: Feature: model-chip-animation-upgrade, Property 8: char name bar opacity by phase

Property 9 — chip idle-float delay formula
  fc.property(fc.integer({min:0, max:100}))
  → delay(i) === (i % 6) * 120, nilai dalam [0, 600)
  Tag: Feature: model-chip-animation-upgrade, Property 9: chip idle float delay formula

Property 10 — kondisi khusus chip menimpa idle-float
  fc.property(fc.boolean(), fc.boolean(), fc.boolean(), fc.nat())
  → jika isDecomposing || isGone || isDimmed → tidak ada animasi idle-float
  Tag: Feature: model-chip-animation-upgrade, Property 10: special conditions override idle float

Property 11 — pairCycleDuration konsisten
  fc.property(fc.float({min:0.1, max:5}))
  → pairCycleDuration(s) === Math.round(2120 / s) + 160
  Tag: Feature: model-chip-animation-upgrade, Property 11: pairCycleDuration formula invariant
```

**Regression Tests (existing — tidak diubah):**
- `__tests__/game/BattleStage.test.ts` — tidak terpengaruh oleh perubahan ini.
- `__tests__/game/AnimationEffects.property.test.tsx` — `star?: boolean` di `ParticleOptions` sudah ada dari `alliance-animation-upgrade`, tidak berubah.
- `__tests__/game/CharacterChips.test.ts` — pastikan tetap lulus setelah penambahan idle-float di CharacterColumn.

**Accessibility Smoke Tests:**
- Stage root memiliki `aria-hidden="true"` dan `role="presentation"`.
- `data-testid="pair-reaction-phase"` tersedia dan berisi nilai phase.
- `data-phase` tersedia dan diperbarui saat phase berubah.
- Semua elemen efek visual memiliki `aria-hidden="true"` dan `pointerEvents: "none"`.
