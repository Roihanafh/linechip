# Design Document — svg-animation-integration

## Overview

Fitur ini mengintegrasikan animasi interaktif karakter SVG (antibodi vs virus) ke halaman
`/game-virus` pada project LineChip. Ada dua bagian utama:

1. **Penggantian karakter SVG** — delapan komponen SVG di `CharacterSVGs.tsx` diganti
   dengan versi referensi yang lebih kaya detail (ekspresi wajah, gradien, detail
   biologis) tanpa mengubah API publik sedikitpun.

2. **Komponen animasi baru** — tiga komponen baru (`BattleStage`, `AllianceStage`,
   `InteractionAnimation`) mengorkestrasi animasi karakter saat pengguna menekan
   "Hitung Hasil", menggantikan efek flash CSS sederhana yang ada sekarang.

Pendekatan ini memastikan semua halaman yang sudah ada mendapat desain karakter baru
secara otomatis, sementara logika animasi sepenuhnya terisolasi dalam komponen baru
tanpa merombak alur kalkulasi `game-virus/page.tsx`.

---

## Architecture

```
app/
  game-virus/
    page.tsx                     ← perubahan minimal (mount/unmount InteractionAnimation)
  animations.css                 ← tambah keyframe baru, tidak ada duplikasi

components/
  game/
    CharacterSVGs.tsx            ← ganti 8 implementasi SVG, API tidak berubah
    InteractionAnimation.tsx     ← orchestrator (baru)
    BattleStage.tsx              ← battle animation (baru)
    AllianceStage.tsx            ← alliance animation (baru)
    AnimationEffects.tsx         ← shared visual effects: Burst, Shockwave, Popup (baru)
```

**Alur data utama:**

```
game-virus/page.tsx
  canCompute=true → handleCompute()
    → setAnimating(true)         [blokir semua kontrol]
    → render <InteractionAnimation
        bil1Value  bil2Value
        onComplete → setResultValue(r); setAnimating(false) />

InteractionAnimation
  → classifyInteraction(bil1Value, bil2Value)
  → if "battle"  → <BattleStage  autoStart onComplete />
  → if "alliance"→ <AllianceStage autoStart onComplete />

BattleStage / AllianceStage
  → fase animasi via setTimeout + CSS keyframes
  → onComplete() dipanggil satu kali di akhir
```

---

## Components and Interfaces

### `classifyInteraction` (pure function)

```typescript
// components/game/InteractionAnimation.tsx

export type InteractionType = "battle" | "alliance";

export interface InteractionConfig {
  type: InteractionType;
  faction?: "ab" | "ku";          // hanya untuk alliance
  isPerfectNeutralization?: boolean; // hanya untuk battle, bil1+bil2===0
  abType: PlaceValue;              // dominant tier dari bilangan positif (battle) atau bil1 (alliance)
  kuType: PlaceValue;              // dominant tier dari bilangan negatif (battle) atau bil2 (alliance)
}

export function classifyInteraction(bil1: number, bil2: number): InteractionConfig {
  if (bil1 === 0 || bil2 === 0) {
    throw new Error("classifyInteraction: neither value may be zero");
  }
  if ((bil1 > 0) !== (bil2 > 0)) {
    // Tanda berbeda → Battle
    const posVal = bil1 > 0 ? bil1 : bil2;
    const negVal = bil1 < 0 ? bil1 : bil2;
    return {
      type: "battle",
      abType: dominantPlace(posVal),
      kuType: dominantPlace(negVal),
      isPerfectNeutralization: bil1 + bil2 === 0,
    };
  }
  // Tanda sama → Alliance
  const faction: "ab" | "ku" = bil1 > 0 ? "ab" : "ku";
  return {
    type: "alliance",
    faction,
    abType: dominantPlace(bil1),
    kuType: dominantPlace(bil2),
  };
}
```

---

### `InteractionAnimation`

```typescript
// components/game/InteractionAnimation.tsx

interface InteractionAnimationProps {
  bil1Value: number;
  bil2Value: number;
  onComplete: () => void;
  speed?: number;           // default 1; dibagi ke semua durasi
}
```

- Di-mount oleh `page.tsx` setelah `canCompute` true dan `handleCompute()` dipanggil.
- Memanggil `classifyInteraction` sekali saat mount; hasilnya tidak berubah selama
  lifecycle komponen.
- Merender `<BattleStage>` atau `<AllianceStage>` berdasarkan hasil klasifikasi dengan
  `autoStart={true}` dan `hideControls={true}`.
- Meneruskan `onComplete` langsung ke stage terpilih.
- Tidak merender kontrol kecepatan/loop saat digunakan dari `page.tsx` (`hideControls`).

---

### `BattleStage`

```typescript
// components/game/BattleStage.tsx

export type BattlePhase =
  | "idle" | "approach" | "impact" | "recoil" | "dissolve" | "done";

interface BattleStageProps {
  antibodyType: PlaceValue;
  virusType: PlaceValue;
  isPerfectNeutralization?: boolean;
  onComplete: () => void;
  autoStart?: boolean;
  hideControls?: boolean;
  speed?: number;
}
```

**Urutan fase dan timing (speed = 1):**

| Fase | Durasi | Keterangan |
|------|--------|------------|
| `idle` | — | Karakter di posisi awal (luar stage) |
| `approach` | 750 ms | Karakter bergerak ke titik benturan |
| `impact` | 500 ms | Flash + shockwave + shake |
| `recoil` | 280 ms | Mundur sedikit |
| `dissolve` | 750 ms | Scale+fade+rotate menghilang |
| `done` | — | Stabil; `onComplete` dipanggil |
| **Total** | **~2280 ms** | Di bawah batas 3000 ms |

**Positioning (inline styles):**

Konstanta layout di dalam file:

```typescript
const SZ = 80; // ukuran karakter (px)
// Posisi idle: karakter di luar viewport stage kiri/kanan
// idleTx kiri  = -(SZ/2) - 185
// idleTx kanan = 185 - SZ/2
// approachTx kiri  = -(SZ/2) - 38
// approachTx kanan = 38 - SZ/2
// recoilTx kiri   = -(SZ/2) - 55
// recoilTx kanan  = 55 - SZ/2
```

Posisi dihitung lewat fungsi `battleOuterStyle(phase, dir, scale)` yang mengembalikan
`React.CSSProperties`. Animasi menggunakan keyframe CSS yang didaftarkan di
`app/animations.css` (lihat seksi CSS di bawah).

**Efek visual pada setiap fase:**

- `approach`: class `battle-approach-left-kf` / `battle-approach-right-kf` pada
  `outerDiv`.
- `impact`: flash overlay + `<Shockwave>` + `<Burst>` (partikel) dari
  `AnimationEffects.tsx`. Inner div: keyframe `battle-shake-kf` (sudah ada).
- `recoil`: class `battle-recoil-left-kf` / `battle-recoil-right-kf` pada `outerDiv`.
- `dissolve`: `dissolve-ccw-kf` (kiri) / `dissolve-cw-kf` (kanan) pada inner div.
- `done` + `isPerfectNeutralization`: `<Popup text="NETRAL ✓" color="#86efac" />`.

**Scale (speed multiplier):**

```typescript
const scale = 1 / speed; // semua setTimeout dikalikan scale
// contoh: approach → setTimeout(() => setPhase("impact"), 750 * scale)
```

---

### `AllianceStage`

```typescript
// components/game/AllianceStage.tsx

export type AlliancePhase = "idle" | "approach" | "bounce" | "settled";

interface AllianceStageProps {
  charType1: PlaceValue;   // dominant tier bil1 (dipakai karakter kiri)
  charType2: PlaceValue;   // dominant tier bil2 (dipakai karakter kanan)
  faction: "ab" | "ku";
  onComplete: () => void;
  autoStart?: boolean;
  hideControls?: boolean;
  speed?: number;
}
```

**Urutan fase dan timing (speed = 1):**

| Fase | Durasi | Keterangan |
|------|--------|------------|
| `idle` | — | Karakter di posisi awal |
| `approach` | 750 ms | Kedua karakter bergerak ke tengah |
| `bounce` | 600 ms | Scale-bounce + sparkle burst |
| `settled` | ∞ | Aura glow; `onComplete` dipanggil |
| **Total hingga onComplete** | **~1350 ms** | Di bawah batas 2500 ms |

**Efek visual:**

- `approach`: `alliance-approach-left-kf` / `alliance-approach-right-kf`.
- `bounce`: inner div `bounce-merge-kf` + `<Shockwave>` + `<Burst>` sparkle.
- `settled`: inner div `settled-glow-blue-kf` (faction `"ab"`) atau
  `settled-glow-red-kf` (faction `"ku"`).
- Popup: `<Popup text="+ KUAT!" color={accentHex} />`.

**Catatan:** karakter kiri dan kanan boleh berbeda tier (charType1 ≠ charType2) —
masing-masing merender tipe tier miliknya sendiri.

---

### `AnimationEffects`

```typescript
// components/game/AnimationEffects.tsx

interface Particle {
  tx: number; ty: number; size: number;
  dur: number; delay: number;
  color: string; rot: number; star: boolean;
}

// Hook: generate N particles, re-generated setiap runKey berubah
export function useParticles(runKey: number, opts: ParticleOptions): Particle[];

// Renders particle burst overlay
export function Burst(props: { particles: Particle[]; scale: number; left?: string }): JSX.Element;

// Expands ring at centre of stage
export function Shockwave(props: { runKey: number; color: string; scale: number; size?: number }): JSX.Element;

// Floating text popup that rises and fades
export function Popup(props: { text: string; color: string; scale: number }): JSX.Element;
```

- Partikel menggunakan CSS custom properties `--tx`, `--ty`, `--r` yang di-set via
  `style` inline per elemen agar bisa dikontrol secara individual.
- `<Burst>` tidak lebih dari 20 partikel untuk Battle dan 16 untuk Alliance (total <30,
  memenuhi batas Req 9.3).
- `<Shockwave>` menggunakan `keyframe shockwave-kf` + `key={runKey}` untuk me-reset
  animasi pada setiap run.

---

### `SpeedControl` dan `LoopToggle` (inline di masing-masing Stage)

Kedua kontrol ini hanya dirender jika `hideControls === false`. Mereka kecil sehingga
tidak perlu file terpisah; cukup didefinisikan sebagai komponen internal di
`BattleStage.tsx` dan `AllianceStage.tsx`.

```typescript
// Contoh SpeedControl (inline)
function SpeedControl({ speed, setSpeed, accent }: { ... }) { ... }
function LoopToggle({ on, setOn, accent }: { ... }) { ... }
```

Ketika dipakai dari `InteractionAnimation` (mode game), `hideControls={true}` selalu
diteruskan sehingga kedua kontrol tidak muncul.

---

### Perubahan `game-virus/page.tsx`

Perubahan minimal — hanya tiga hal:

1. **Tambah state `animating`:**

```typescript
const [animating, setAnimating] = useState(false);
```

2. **Ganti fungsi `handleCompute`:**

```typescript
const handleCompute = () => {
  if (!canCompute) return;
  // Simpan nilai sebelum reset agar onComplete bisa pakainya
  const r = bil1Value + bil2Value;
  setAnimating(true);          // blokir semua kontrol
  // onComplete dipanggil oleh InteractionAnimation setelah animasi selesai
  handleComputeResult.current = () => {
    setResultValue(r);
    setBil1Value(0);
    setBil2Value(0);
    setAnimating(false);
    setPhase("settled");
    setTimeout(() => setPhase("idle"), 1400);
  };
};
const handleComputeResult = useRef<() => void>(() => {});
```

3. **Mount `InteractionAnimation` secara kondisional di dalam area reaktor:**

```tsx
{animating && (
  <InteractionAnimation
    bil1Value={bil1Value}
    bil2Value={bil2Value}
    onComplete={() => handleComputeResult.current()}
  />
)}
```

   Saat `animating === true`, area BilanganZone disembunyikan dan digantikan oleh
   `InteractionAnimation`. Setelah `onComplete`, `animating` kembali `false` sehingga
   area tersebut kembali ke normal.

4. **`poolDisabled` diperluas:**

```typescript
const poolDisabled = phase !== "idle" || resultValue !== null || animating;
```

**Tidak ada perubahan pada:** drag-drop handler, `undoLast`, `reset`, UI header,
panel hasil, BilanganZone rendering saat idle — semuanya tidak tersentuh.

---

## Data Models

### State di `game-virus/page.tsx` (baru)

```typescript
const [animating, setAnimating] = useState(false);
// Ref menyimpan callback hasil agar tidak perlu re-render tambahan
const handleComputeResult = useRef<() => void>(() => {});
```

### State di `BattleStage` / `AllianceStage`

```typescript
// BattleStage
const [phase, setPhase] = useState<BattlePhase>("idle");
const [runKey, setRunKey] = useState(0);           // trigger re-generate partikel
const [showFlash, setShowFlash] = useState(false);
const [speedState, setSpeedState] = useState(1);   // internal, diabaikan jika hideControls
const [loop, setLoop] = useState(false);
const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

// AllianceStage — sama, dengan AlliancePhase dan showBurst
```

### Tidak ada model data baru

Fitur ini murni visual — tidak ada perubahan pada model data kalkulasi, tidak ada
API endpoint baru, tidak ada storage baru.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid
executions of a system — essentially, a formal statement about what the system should do.
Properties serve as the bridge between human-readable specifications and machine-verifiable
correctness guarantees.*

### Property 1: UID suffix mencegah konflik id SVG

*For any* dua instance `AntibodyCharacter` atau `VirusCharacter` yang di-render di halaman
yang sama dengan nilai `uid` berbeda, tidak ada elemen `<defs>` id yang sama di antara
keduanya — setiap id harus mengandung uid masing-masing instance sebagai suffix.

**Validates: Requirements 0.4**

---

### Property 2: CharacterChips mendekomposisi nilai ke semua tier yang relevan

*For any* nilai positif `v`, `CharacterChips` harus merender setidaknya satu karakter
untuk setiap tier yang hadir dalam `decompose(v)` — tidak ada tier yang terlewat dan tidak
ada tier ekstra yang dirender.

**Validates: Requirements 0.5**

---

### Property 3: Klasifikasi Battle untuk semua pasangan tanda berbeda

*For any* bilangan `a > 0` dan `b < 0` (atau sebaliknya), `classifyInteraction(a, b)`
harus mengembalikan `type === "battle"`.

**Validates: Requirements 1.1**

---

### Property 4: Klasifikasi Alliance-ab untuk semua pasangan positif

*For any* dua bilangan `a > 0` dan `b > 0`, `classifyInteraction(a, b)` harus
mengembalikan `type === "alliance"` dengan `faction === "ab"`.

**Validates: Requirements 1.2**

---

### Property 5: Klasifikasi Alliance-ku untuk semua pasangan negatif

*For any* dua bilangan `a < 0` dan `b < 0`, `classifyInteraction(a, b)` harus
mengembalikan `type === "alliance"` dengan `faction === "ku"`.

**Validates: Requirements 1.3**

---

### Property 6: Perfect neutralization terdeteksi untuk semua pasangan zero-sum

*For any* bilangan `n ≠ 0`, `classifyInteraction(n, -n)` harus mengembalikan
`type === "battle"` dengan `isPerfectNeutralization === true`.

**Validates: Requirements 1.4**

---

### Property 7: Error untuk semua input dengan salah satu nilai nol

*For any* bilangan `v` (positif maupun negatif), `classifyInteraction(0, v)` dan
`classifyInteraction(v, 0)` keduanya harus melempar error atau mengembalikan sentinel
error — tidak pernah mengembalikan konfigurasi interaksi yang valid.

**Validates: Requirements 1.5**

---

### Property 8: Speed multiplier proporsional terhadap semua durasi setTimeout

*For any* nilai `speed = n > 0`, setiap timeout internal yang dijadwalkan oleh
`BattleStage` atau `AllianceStage` harus berdurasi `baseDuration / n` — tidak ada
timeout tunggal yang lepas dari scaling.

**Validates: Requirements 7.2**

---

### Property 9: Jumlah elemen partikel DOM tidak melebihi 30

*For any* konfigurasi `count` yang diteruskan ke `useParticles`, jumlah elemen `<span>`
yang dirender oleh `<Burst>` tidak boleh melebihi 30 — memastikan performa pada perangkat
menengah.

**Validates: Requirements 9.3**

---

## Error Handling

### Input tidak valid ke `classifyInteraction`

Kondisi: salah satu atau kedua nilai adalah `0`.

Penanganan: fungsi melempar `Error` dengan pesan deskriptif. `page.tsx` sudah memiliki
guard `canCompute` yang memastikan `hasChips && phase === "idle" && resultValue === null`
sebelum memanggil `handleCompute` — dalam kondisi normal, kedua nilai tidak pernah nol
saat tombol ditekan. Error ini adalah safety-net untuk bug programmer.

### Unmount sebelum animasi selesai

`BattleStage` dan `AllianceStage` menyimpan semua `setTimeout` id di `useRef<number[]>`.
`useEffect` cleanup function memanggil `clearTimeout` pada semua id tersebut:

```typescript
const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
useEffect(() => {
  return () => timers.current.forEach(clearTimeout);
}, []);
```

Ini mencegah `setState` dipanggil pada komponen yang sudah di-unmount.

### `prefers-reduced-motion`

Jika media query `(prefers-reduced-motion: reduce)` aktif, `InteractionAnimation`
mendeteksi kondisi ini lewat `window.matchMedia` saat mount dan langsung memanggil
`onComplete` setelah 200 ms tanpa merender Stage sama sekali.

```typescript
// InteractionAnimation.tsx — di useEffect mount
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reducedMotion) {
  const id = setTimeout(onComplete, 200);
  return () => clearTimeout(id);
}
```

---

## Testing Strategy

### Unit tests — `classifyInteraction` (pure function)

Library: Jest (sudah tersedia di project).

Fokus: semua acceptance criteria Req 1 yang berupa logika klasifikasi murni.

Contoh test cases:
- `(5, -3)` → `{ type: "battle", abType: "satuan", kuType: "satuan" }`
- `(120, -120)` → `{ type: "battle", isPerfectNeutralization: true }`
- `(50, 30)` → `{ type: "alliance", faction: "ab" }`
- `(-200, -10)` → `{ type: "alliance", faction: "ku" }`
- `(0, 5)` → throws

### Property-based tests — `classifyInteraction` dan `CharacterChips`

Library: **fast-check** (perlu ditambah ke devDependencies; tidak ada dependency baru di
runtime).

Tag format: `// Feature: svg-animation-integration, Property N: <teks>`

```typescript
// Feature: svg-animation-integration, Property 3: Klasifikasi Battle untuk semua pasangan tanda berbeda
fc.assert(
  fc.property(
    fc.integer({ min: 1, max: 9999 }),
    fc.integer({ min: -9999, max: -1 }),
    (a, b) => {
      const result = classifyInteraction(a, b);
      return result.type === "battle";
    }
  ),
  { numRuns: 100 }
);
```

```typescript
// Feature: svg-animation-integration, Property 7: Error untuk semua input dengan salah satu nilai nol
fc.assert(
  fc.property(
    fc.integer({ min: -9999, max: 9999 }).filter(v => v !== 0),
    (v) => {
      expect(() => classifyInteraction(0, v)).toThrow();
      expect(() => classifyInteraction(v, 0)).toThrow();
    }
  ),
  { numRuns: 100 }
);
```

Property 9 (particle count ≤ 30) diuji dengan unit test biasa karena `useParticles`
adalah fungsi deterministik yang menerima `count` — cukup verifikasi
`useParticles(1, { count: 30, ... }).length <= 30`.

### Component tests — animasi

Library: Jest + React Testing Library (sudah tersedia).

Fokus:
- `BattleStage` dan `AllianceStage`: memanggil `onComplete` tepat satu kali setelah
  fase `done`/`settled` (gunakan `jest.useFakeTimers()`).
- `InteractionAnimation`: dengan `prefers-reduced-motion` di-mock ke `true`, `onComplete`
  dipanggil dalam ≤300 ms.
- Cleanup: tidak ada `setState` dipanggil setelah unmount (verifikasi via
  `act` + `cleanup`).

### Integration / visual verification

Tidak ada automated visual regression test. Verifikasi manual di browser:
- Tampilkan `/game-virus`, isi dua bilangan berbeda tanda, klik "Hitung Hasil" → Battle.
- Isi dua bilangan sama tanda → Alliance.
- Isi bilangan zero-sum → "NETRAL ✓" muncul.
- Verifikasi `prefers-reduced-motion` lewat DevTools > Rendering > Emulate.

---

## CSS Keyframes — Pemetaan `index.css` → `animations.css`

### Keyframe yang sudah ada di `animations.css` (JANGAN diduplikasi)

| Nama di referensi `index.css` | Nama di `animations.css` |
|-------------------------------|--------------------------|
| `battle-shake` | `battle-shake-kf` |
| `idle-float` | `battle-float-kf` (semantik sama) |

### Keyframe yang perlu ditambahkan ke `animations.css`

Semua menggunakan konvensi suffix `-kf` yang sudah berlaku:

```css
/* Battle approach */
@keyframes battle-approach-left-kf   { … }
@keyframes battle-approach-right-kf  { … }

/* Battle recoil */
@keyframes battle-recoil-left-kf     { … }
@keyframes battle-recoil-right-kf    { … }

/* Dissolve */
@keyframes dissolve-ccw-kf           { … }
@keyframes dissolve-cw-kf            { … }

/* Flash impact */
@keyframes flash-impact-kf           { … }

/* Alliance approach */
@keyframes alliance-approach-left-kf  { … }
@keyframes alliance-approach-right-kf { … }

/* Alliance bounce & glow */
@keyframes bounce-merge-kf           { … }
@keyframes settled-glow-blue-kf      { … }
@keyframes settled-glow-red-kf       { … }

/* Shared effects */
@keyframes particle-fly-kf           { … }   /* pakai --tx, --ty, --r */
@keyframes shockwave-kf              { … }
@keyframes popup-rise-kf             { … }
@keyframes idle-hover-pop-kf         { … }
@keyframes bar-drain-kf              { … }
@keyframes stage-shake-kf            { … }
```

> Nilai konkret keyframe diambil verbatim dari
> `referensi/SVG Antibody Virus Animation/src/index.css`, hanya nama-nya yang
> disesuaikan (tambah `-kf`).

### Utility classes baru di `@layer utilities`

```css
.battle-approach-left  { animation: battle-approach-left-kf … }
.battle-approach-right { animation: battle-approach-right-kf … }
/* … dst untuk semua keyframe di atas */
.idle-hover-pop        { animation: idle-hover-pop-kf 220ms ease-out forwards }
.idle-float-char       { animation: battle-float-kf 3200ms ease-in-out infinite }
```

> Komponen animasi akan menggunakan inline `style.animation` untuk durasi dinamis
> (karena durasi bergantung pada `scale`), bukan utility class. Utility class hanya
> untuk kasus statis.

---

## Keputusan Desain

### Inline styles vs Tailwind untuk animasi

Animasi menggunakan `style={{ animation: "nama-kf Xms ease forwards" }}` secara inline
karena durasi bersifat dinamis (dikalikan `scale`). Tailwind utility tidak bisa mengubah
durasi secara programatik tanpa arbitrary values per-instance. Ini mengikuti pola yang
sama dengan kode referensi dan konsisten dengan `animations.css` yang sudah ada.

### `hideControls` prop daripada dua komponen terpisah

Satu komponen `BattleStage` dengan prop `hideControls` lebih mudah dimaintain daripada
`BattleStageGame` dan `BattleStagePreview`. Mode preview bisa ditampilkan di halaman
materi nantinya tanpa duplikasi kode.

### `handleComputeResult` sebagai ref

Menggunakan `useRef` untuk callback `onComplete` agar perubahan nilai `bil1Value` /
`bil2Value` setelah animasi dimulai tidak mempengaruhi hasil yang sudah "dikunci" saat
tombol ditekan. Ini menghindari stale closure.

### Tidak ada library animasi baru

Semua animasi menggunakan CSS keyframes + `setTimeout`. Ini konsisten dengan kode yang
sudah ada di project, tidak menambah bundle size, dan cukup untuk kebutuhan animasi
sekuensial yang sederhana ini.

### Penggantian SVG menjaga `polar` helper

Fungsi `polar` di `CharacterSVGs.tsx` yang ada dipakai oleh implementasi SVG baru juga
(versi referensi juga menggunakannya), jadi dipertahankan. API publik tetap sama.
