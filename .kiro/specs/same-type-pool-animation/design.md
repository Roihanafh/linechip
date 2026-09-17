# Design Document — same-type-pool-animation

## Overview

Fitur ini menambahkan dua hal ke halaman **Penjumlahan** (`app/model-chip/page.tsx`) dan **Pengurangan** (`app/model-chip/pengurangan/page.tsx`):

1. **AlliancePoolPanel** — sub-komponen baru di `ArenaPanel.tsx` yang merender `AllianceStage` di atas dan satu **Pool_Gabungan** chip SVG di bawah, menggantikan tampilan kosong yang hanya menampilkan animasi `AllianceStage` tanpa representasi jumlah chip total.

2. **Alliance phase di pengurangan** — `VizPhaseSub` diperluas dengan `"alliance"`, dan `useSubtractionOrchestrator` mendapat logika deteksi/routing sehingga kasus `a − (−b)` (yang secara aritmatika setara `a + b`) masuk ke fase alliance setelah TransformPanel, bukan di-skip ke `"done"`.

Semua perubahan bersifat additive. Komponen `AllianceStage`, `ArenaBattle`, dan `PairReactionStage` **tidak dimodifikasi**. Fungsi `isAllianceCase` yang sudah ada di `useAnimationOrchestrator.ts` di-re-export dan di-import oleh `useSubtractionOrchestrator`.

---

## Architecture

```
VizPhaseSub (subtractionTypes.ts)
  + "alliance" literal

useSubtractionOrchestrator (hooks/model-chip/useSubtractionOrchestrator.ts)
  ├─ isAllianceCase() — import dari useAnimationOrchestrator
  ├─ handleSubtract()
  │    ├─ alliance case → transform → setVizPhase("alliance")
  │    └─ battle case  → (existing path)
  ├─ handleNextClick()
  │    └─ transform waiting → beginAlliance() | beginBattle()
  ├─ replayAnimation()
  │    └─ alliance snapshot → transform → setVizPhase("alliance")
  └─ handleAllianceDone() — delegate ke innerOrch atau local (lihat Desain)

lib/model-chip/subtractionTypes.ts
  └─ VizPhaseSub += "alliance"

app/model-chip/pengurangan/page.tsx
  ├─ arenaPhase mapping: "alliance" tidak lagi difilter ke "idle"
  └─ onAllianceDone: dari SubtractionOrchestrator (bukan () => {})

components/model-chip/ArenaPanel.tsx
  └─ vizPhase === "alliance" branch
       ├─ AllianceStage (existing, tidak diubah)
       └─ AlliancePoolPanel (NEW — inline sub-komponen)

components/model-chip/AlliancePoolPanel.tsx  [BARU, atau inline di ArenaPanel]
  └─ CharacterChips (existing) untuk render chip SVG per tier
```

Diagram alur pengurangan (kasus alliance):

```
idle
  └─[handleSubtract, isAllianceCase=true, bil2≠0]→ transform (TransformPanel tampil)
       └─[auto: delay 900ms / click: handleNextClick]→ transform-exiting
            └─[400ms exit anim]→ alliance (ArenaPanel→AlliancePoolPanel)
                 └─[AllianceStage.onComplete]→ center
                      └─[2000ms]→ done
```

---

## Components and Interfaces

### 1. `VizPhaseSub` — Ekstensi (subtractionTypes.ts)

```typescript
// BEFORE
export type VizPhaseSub = "idle" | "transform" | "battle" | "center" | "done";

// AFTER
export type VizPhaseSub =
  | "idle"
  | "transform"
  | "alliance"
  | "battle"
  | "center"
  | "done";
```

`SubtractionSnapshot` tidak berubah.

---

### 2. `useSubtractionOrchestrator` — Penambahan Alliance Path

**Interface tambahan yang di-export:**

```typescript
export interface SubtractionOrchestratorReturn {
  // ... existing fields ...
  handleAllianceSub: () => void;  // dipanggil oleh ArenaPanel.onAllianceDone
}
```

Nama alias `handleAllianceSub` digunakan agar tidak konflik dengan `handleAllianceDone` dari `innerOrch`. Halaman pengurangan meneruskan ini sebagai `onAllianceDone` ke `ArenaPanel`.

**Logika inti — `beginAlliance()`:**

```typescript
const beginAlliance = useCallback((snap: SubtractionSnapshot) => {
  setTransformExiting(false);
  setWaitingForTransform(false);
  stateRef.current.setVizPhase("alliance");
}, []);
```

**Modifikasi `handleSubtract()`:**

```typescript
const handleSubtract = useCallback(() => {
  const { bil1, bil2 } = stateRef.current;
  if (bil1 === 0 && bil2 === 0) return;

  transformTimers.current.forEach(clearTimeout);
  transformTimers.current = [];
  setTransformExiting(false);
  setWaitingForTransform(false);

  const b_konversi = -bil2;
  const snap: SubtractionSnapshot = {
    bil1,
    bil2_original: bil2,
    bil2_converted: b_konversi,
  };

  stateRef.current.setSnapshot(snap);
  snapshotRef.current = snap;

  // NEW: deteksi alliance case
  if (isAllianceCase(bil1, b_konversi)) {
    if (bil2 !== 0) {
      stateRef.current.setVizPhase("transform");
      if (animModeRef.current === "auto") {
        const delay = Math.round(900 / animSpeedRef.current);
        const t = setTimeout(() => {
          setTransformExiting(true);
          const t2 = setTimeout(() => beginAlliance(snap), 400);
          transformTimers.current.push(t2);
        }, delay);
        transformTimers.current.push(t);
      } else {
        setWaitingForTransform(true);
      }
    } else {
      // bil2 === 0: isAllianceCase(x, 0) selalu false, jadi branch ini tidak tercapai
      // Catatan: jika bil2 === 0, b_konversi = 0, isAllianceCase(bil1, 0) = false
      // Branch ini tetap disertakan sebagai safety, langsung done
      stateRef.current.setVizPhase("done");
    }
    return;
  }

  // existing battle path
  if (bil2 !== 0) {
    stateRef.current.setVizPhase("transform");
    // ... existing transform → battle logic ...
  } else {
    beginBattle(snap);
  }
}, [beginBattle, beginAlliance]);
```

**Modifikasi `handleNextClick()`:**

```typescript
const handleNextClick = useCallback(() => {
  if (stateRef.current.vizPhase === "transform" && waitingForTransform) {
    setWaitingForTransform(false);
    setTransformExiting(true);
    const snap = snapshotRef.current;
    if (snap) {
      const isAlliance = isAllianceCase(snap.bil1, snap.bil2_converted);
      const t = setTimeout(() => {
        if (isAlliance) beginAlliance(snap);
        else beginBattle(snap);
      }, 400);
      transformTimers.current.push(t);
    }
  } else {
    innerOrch.handleNextClick();
  }
}, [waitingForTransform, beginAlliance, beginBattle, innerOrch]);
```

**`handleAllianceSub()` — Alliance done handler:**

```typescript
const handleAllianceSub = useCallback(() => {
  stateRef.current.setVizPhase("center");
  const t1 = setTimeout(
    () => setCenterExiting(true),
    Math.round(2000 / animSpeedRef.current),
  );
  const t2 = setTimeout(
    () => stateRef.current.setVizPhase("done"),
    Math.round(2000 / animSpeedRef.current) + Math.round(500 / animSpeedRef.current),
  );
  transformTimers.current.push(t1, t2);
}, []);
```

`centerExiting` diambil dari `innerOrch.centerExiting` yang sudah di-forward di return value — tidak perlu state terpisah karena `handleAllianceSub` men-set phase ke `"center"` lalu `"done"` via delay, dan tampilan "center" di pengurangan cukup dengan `ArenaCenter` yang sudah ada.

> **Catatan implementasi:** `SubtractionOrchestrator` sudah men-forward `centerExiting: innerOrch.centerExiting`. Ketika alliance path memanggil `stateRef.current.setVizPhase("center")`, `ArenaPanel` akan merender `<ArenaCenter>` yang sudah ada — path center tidak membutuhkan state baru.

**Modifikasi `replayAnimation()`:**

```typescript
const replayAnimation = useCallback(() => {
  const snap = stateRef.current.snapshot;
  if (!snap) return;

  transformTimers.current.forEach(clearTimeout);
  transformTimers.current = [];
  setTransformExiting(false);
  setWaitingForTransform(false);
  snapshotRef.current = snap;

  if (isAllianceCase(snap.bil1, snap.bil2_converted)) {
    if (snap.bil2_original !== 0) {
      stateRef.current.setVizPhase("transform");
      if (animModeRef.current === "auto") {
        const delay = Math.round(900 / animSpeedRef.current);
        const t = setTimeout(() => {
          setTransformExiting(true);
          const t2 = setTimeout(() => beginAlliance(snap), 400);
          transformTimers.current.push(t2);
        }, delay);
        transformTimers.current.push(t);
      } else {
        setWaitingForTransform(true);
      }
    } else {
      beginAlliance(snap);
    }
    return;
  }

  // existing battle replay path...
}, [beginBattle, beginAlliance]);
```

**`handleReset()` — tidak berubah** karena sudah membatalkan semua `transformTimers` dan memanggil `innerOrch.handleReset()`.

---

### 3. `AlliancePoolPanel` — Sub-komponen Baru (inline di ArenaPanel)

Didefinisikan sebagai fungsi lokal di dalam `ArenaPanel.tsx` (tidak perlu file terpisah karena ukurannya kecil dan tidak di-reuse).

**Interface:**

```typescript
interface AlliancePoolPanelProps {
  snapshot: { bil1: number; bil2: number };
  animSpeed: number;
  onAllianceDone: () => void;
  alliancePhase?: AlliancePhase; // untuk sync animasi idle-float vs static
}
```

> **Catatan:** `AllianceStage` tidak memberikan callback `onPhaseChange`, jadi `AlliancePoolPanel` tidak bisa mengetahui fase internal `AllianceStage`. Pool_Gabungan cukup menggunakan `idle-float` sepanjang waktu — secara visual tidak mengganggu karena animasi `AllianceStage` di atas lebih dominan secara perhatian visual. Ini menyederhanakan implementasi dan menghindari prop drilling yang tidak perlu (Requirement 5.5 dan 5.6 bersifat visual-only dan tidak diuji secara unit test).

**Logika:**

```typescript
function AlliancePoolPanel({
  snapshot,
  animSpeed,
  onAllianceDone,
}: AlliancePoolPanelProps) {
  const faction: "ab" | "ku" = snapshot.bil1 > 0 ? "ab" : "ku";
  const totalValue = Math.abs(snapshot.bil1) + Math.abs(snapshot.bil2);
  const signLabel = faction === "ab" ? "+" : "−";

  return (
    <div className="flex flex-col gap-3">
      {/* AllianceStage — tidak dimodifikasi */}
      <AllianceStage
        bil1Value={snapshot.bil1}
        bil2Value={snapshot.bil2}
        faction={faction}
        autoStart={true}
        hideControls={true}
        speed={animSpeed}
        onComplete={onAllianceDone}
      />

      {/* Pool_Gabungan */}
      <div
        aria-hidden="true"
        data-testid="alliance-pool"
        data-total={String(totalValue)}
        className="flex flex-col items-center gap-1.5 px-2 pb-2"
      >
        {/* Header */}
        <p className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
          faction === "ab" ? "text-intblue" : "text-intpink"
        }`}>
          Total: {signLabel}{totalValue.toLocaleString("id-ID")}
        </p>

        {/* Chips */}
        {totalValue === 0 ? (
          <p className="font-mono text-slate-400 italic text-[9px]">tidak ada chip</p>
        ) : (
          <CharacterChips
            value={totalValue}
            type={faction}
            maxPerTier={12}
            uidPrefix="alliance-pool"
            phase="idle"
          />
        )}
      </div>
    </div>
  );
}
```

**Integrasi di `ArenaPanel`:**

```tsx
{vizPhase === "alliance" && snapshot && (
  <AlliancePoolPanel
    snapshot={snapshot}
    animSpeed={animSpeed}
    onAllianceDone={onAllianceDone}
  />
)}
```

Menggantikan blok yang sebelumnya hanya merender `<AllianceStage>` langsung.

---

### 4. `app/model-chip/pengurangan/page.tsx` — Dua Perubahan

**Perubahan 1 — `arenaPhase` mapping:**

```typescript
// BEFORE
const arenaPhase: VizPhase =
  vizPhase === "transform" || vizPhase === "idle"
    ? "idle"
    : (vizPhase as VizPhase);

// AFTER
const arenaPhase: VizPhase =
  vizPhase === "transform" || vizPhase === "idle"
    ? "idle"
    : vizPhase === "alliance"
    ? "alliance"
    : (vizPhase as VizPhase);
```

**Perubahan 2 — `onAllianceDone` callback:**

```tsx
// BEFORE
<ArenaPanel
  ...
  onAllianceDone={() => {}}
  ...
/>

// AFTER
<ArenaPanel
  ...
  onAllianceDone={orch.handleAllianceSub}
  ...
/>
```

Dan kondisi render `ArenaPanel`:

```tsx
// BEFORE: hanya render saat vizPhase !== "idle" && vizPhase !== "transform"
// AFTER: tidak berubah — alliance, battle, center, done semuanya sudah tercakup
// arenaSnapshot juga tidak berubah:
const arenaSnapshot = snapshot
  ? { bil1: snapshot.bil1, bil2: snapshot.bil2_converted }
  : null;
// bil2 dalam arenaSnapshot = bil2_converted sehingga ArenaPanel mendapatkan
// dua bilangan yang sudah positif-positif (atau negatif-negatif) → faction benar
```

---

### 5. `ArenaPanelProps` — Tipe Tidak Berubah

`ArenaPanelProps.vizPhase` bertipe `VizPhase` (dari `lib/model-chip/types.ts`), dan `VizPhase` sudah mengandung `"alliance"`. Tidak ada perubahan tipe di `ArenaPanel`.

---

## Data Models

### State — Tidak Ada Penambahan State Baru

`useSubtractionOrchestrator` tidak memerlukan state baru. Fase alliance ditangani sepenuhnya via:
- `stateRef.current.setVizPhase("alliance")` — menggunakan `VizPhaseSub` yang diperluas
- `transformTimers.current` — timer yang sudah ada untuk handle delay center → done
- `snapshotRef.current` — sudah menyimpan snapshot untuk replay

### Snapshot di Alliance Path

Untuk kasus `5 − (−3)`:
- `bil1 = 5`, `bil2 = -3`
- `bil2_converted = -(-3) = 3`
- `snap = { bil1: 5, bil2_original: -3, bil2_converted: 3 }`
- `isAllianceCase(5, 3) = true` → alliance path
- `arenaSnapshot = { bil1: 5, bil2: 3 }` → `AllianceStage` menerima dua nilai positif → faction `"ab"`
- `totalValue = |5| + |3| = 8`

Untuk kasus `−4 − 3`:
- `bil1 = -4`, `bil2 = 3`
- `bil2_converted = -3`
- `isAllianceCase(-4, -3) = true` → alliance path
- `arenaSnapshot = { bil1: -4, bil2: -3 }` → faction `"ku"`
- `totalValue = |-4| + |-3| = 7`

### `CharacterChips` — Komponen yang Digunakan

`CharacterChips` sudah ada di `components/game/CharacterSVGs.tsx` dan menerima:
- `value: number` — nilai absolut yang didekomposisi
- `type: "ab" | "ku"` — menentukan karakter SVG
- `maxPerTier: number` — batas chip per tier (set ke 12)
- `phase?: "idle" | "charging" | "exploding" | "settled"` — animasi
- `uidPrefix?: string` — deduplicasi gradient ID

Pool_Gabungan menggunakan `phase="idle"` sepanjang waktu (idle-float animation).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Alliance path terpicu untuk semua kasus tipe-sama di pengurangan

*For any* pasangan `(bil1, bil2)` di mana `isAllianceCase(bil1, -bil2)` bernilai `true` (keduanya akan bertipe sama setelah konversi), memanggil `handleSubtract()` saat `vizPhase === "idle"` SHALL menyebabkan `vizPhase` pada akhirnya menjadi `"alliance"` (setelah fase transform jika `bil2 !== 0`).

**Validates: Requirements 2.1, 2.2**

### Property 2: Guard — tidak ada perubahan state saat vizPhase bukan "idle"

*For any* `vizPhase ∈ {"transform", "alliance", "battle", "center", "done"}` dan sembarang nilai `(bil1, bil2)`, memanggil `handleSubtract()` SHALL tidak mengubah `vizPhase` maupun `snapshot`.

**Validates: Requirements 2.4**

### Property 3: Reset membersihkan state di semua fase aktif

*For any* `vizPhase ∈ {"alliance", "center"}` yang dicapai melalui jalur alliance, memanggil `handleReset()` SHALL men-set `vizPhase` ke `"idle"` dan `snapshot` ke `null`.

**Validates: Requirements 2.5**

### Property 4: Delay animSpeed scaling — alliance completion

*For any* `animSpeed ∈ (0, ∞)`, setelah `handleAllianceSub()` dipanggil, delay menuju `vizPhase === "center"` SHALL tepat `Math.round(2000 / animSpeed)` ms dan delay tambahan menuju `"done"` SHALL tepat `Math.round(500 / animSpeed)` ms.

**Validates: Requirements 3.3**

### Property 5: Replay alliance — semua snapshot yang memenuhi isAllianceCase

*For any* snapshot di mana `isAllianceCase(snapshot.bil1, snapshot.bil2_converted)` bernilai `true`, memanggil `replayAnimation()` SHALL menghasilkan `vizPhase === "alliance"` (langsung atau setelah transform jika `bil2_original !== 0`).

**Validates: Requirements 4.1, 4.2**

### Property 6: AlliancePoolPanel selalu hadir saat vizPhase === "alliance"

*For any* snapshot yang valid (nilai bukan nol), saat `ArenaPanel` dirender dengan `vizPhase === "alliance"`, output DOM SHALL mengandung elemen dengan `data-testid="alliance-pool"` DAN elemen dengan `data-testid="alliance-stage"`.

**Validates: Requirements 5.1, 9.2**

### Property 7: data-total selalu akurat

*For any* `snapshot = { bil1, bil2 }`, elemen dengan `data-testid="alliance-pool"` SHALL memiliki atribut `data-total` yang bernilai `String(Math.abs(bil1) + Math.abs(bil2))`.

**Validates: Requirements 5.2, 7.4, 9.3**

### Property 8: Header faction-aware selalu benar

*For any* `faction ∈ {"ab", "ku"}` dan `totalValue > 0`, teks header di dalam `alliance-pool` SHALL:
- Mengandung `"+"` diikuti `totalValue` untuk faction `"ab"`
- Mengandung `"−"` diikuti `totalValue` untuk faction `"ku"`

**Validates: Requirements 5.8**

### Property 9: aria-hidden pada Pool_Gabungan

*For any* rendered `AlliancePoolPanel`, container `data-testid="alliance-pool"` SHALL memiliki atribut `aria-hidden="true"`.

**Validates: Requirements 9.1**

### Property 10: Header dan status ArenaPanel saat alliance

*For any* snapshot, saat `ArenaPanel` dirender dengan `vizPhase === "alliance"`, elemen `data-testid="arena-header"` SHALL mengandung teks `"🤝 Persekutuan!"` dan elemen status SHALL mengandung `"Bergabung"`.

**Validates: Requirements 6.3**

### Property 11: Accent bar tidak animate-pulse saat alliance

*For any* snapshot, saat `ArenaPanel` dirender dengan `vizPhase === "alliance"`, class dari top accent bar SHALL tidak mengandung substring `"animate-pulse"`.

**Validates: Requirements 6.4**

---

## Error Handling

### isAllianceCase(bil1, 0)

`isAllianceCase` mengharuskan kedua argumen bukan nol. Ketika `bil2 === 0`, maka `b_konversi = 0`, dan `isAllianceCase(bil1, 0)` selalu `false` — tidak ada penanganan khusus diperlukan.

### Snapshot null saat replayAnimation

Guard `if (!snap) return` sudah ada dan dipertahankan.

### totalValue === 0 di Pool_Gabungan

Ditangani eksplisit: render pesan `"tidak ada chip"` alih-alih memanggil `CharacterChips` dengan `value=0` (yang mengembalikan `null`).

### Timer cleanup saat unmount / reset

`transformTimers.current` dibersihkan di `handleReset()` dan di dalam `useEffect` cleanup yang sudah ada. `handleAllianceSub` menggunakan `transformTimers.current.push(t1, t2)` sehingga timer-timer ini juga ikut dibersihkan saat reset.

### Race condition arenaPhase di pengurangan

Mapping `arenaPhase` di halaman pengurangan hanya melakukan narrowing tipe TypeScript — tidak ada side effect runtime. Penambahan cabang `vizPhase === "alliance" → "alliance"` tidak mengganggu cabang lain.

---

## Testing Strategy

### Dual Testing Approach

Fitur ini cocok untuk property-based testing pada logika orchestrator (pure state machine transitions), sementara rendering menggunakan example-based tests.

**Unit Tests (example-based):**
- `handleSubtract(5, -3)` → `vizPhase = "transform"` langsung (mode auto), lalu "alliance" setelah delay.
- `handleSubtract(-4, 3)` → sama, faction "ku".
- `handleSubtract(5, 0)` → `vizPhase = "done"` langsung (bukan alliance karena isAllianceCase(5, 0) = false).
- `handleSubtract(5, -3)` saat `vizPhase = "battle"` → tidak ada perubahan state.
- `replayAnimation()` dengan alliance snapshot dan `bil2_original !== 0` → `vizPhase = "transform"`.
- `replayAnimation()` dengan null snapshot → tidak ada perubahan.
- `handleReset()` saat `vizPhase = "alliance"` → `vizPhase = "idle"`, snapshot = null.
- `AlliancePoolPanel` dengan `totalValue = 0` → render pesan "tidak ada chip".
- `AlliancePoolPanel` dengan `bil1 = 11, bil2 = 19` → `data-total = "30"`.
- `ArenaPanel` dengan `vizPhase = "alliance"` → merender `data-testid="alliance-pool"` dan `data-testid="alliance-stage"`.
- `ArenaPanel` dengan `vizPhase = "alliance"` → header "🤝 Persekutuan!", status "Bergabung", accent bar tidak punya `animate-pulse`.

**Property-Based Tests (fast-check):**

Library: **fast-check** (sudah tersedia di project — lihat `package.json`).

Konfigurasi: minimum 100 iterasi per property test.

Tag format: `// Feature: same-type-pool-animation, Property {N}: {property_text}`

```
Property 1 — Alliance path triggered for all same-type pairs
  fc.property(
    fc.integer({ min: 1, max: 9999 }),
    fc.integer({ min: 1, max: 9999 }),
  )
  // Test dengan (pos, neg) → bil1=pos, bil2=-neg → bil2_converted=neg → isAllianceCase(pos,neg)=true
  → simulate handleSubtract(pos, -(neg)) saat vizPhase="idle"
    ASSERT: vizPhase immediately = "transform" (karena bil2 ≠ 0)
  Tag: Feature: same-type-pool-animation, Property 1: alliance path triggered for all same-type pairs

  // Juga test kasus negatif-negatif:
  fc.property(
    fc.integer({ min: 1, max: 9999 }),
    fc.integer({ min: 1, max: 9999 }),
  )
  // bil1=-a, bil2=b → bil2_converted=-b → isAllianceCase(-a,-b)=true
  → simulate handleSubtract(-pos, neg) saat vizPhase="idle"
    ASSERT: vizPhase immediately = "transform"
  Tag: Feature: same-type-pool-animation, Property 1: alliance path triggered for all same-type pairs (negative-negative)

Property 2 — Guard prevents state change when not idle
  fc.property(
    fc.constantFrom("transform", "alliance", "battle", "center", "done"),
    fc.integer({ min: -9999, max: 9999 }),
    fc.integer({ min: -9999, max: 9999 }),
  )
  → simulate handleSubtract(bil1, bil2) saat vizPhase = phase
    ASSERT: vizPhase setelah panggilan === phase (tidak berubah)
  Tag: Feature: same-type-pool-animation, Property 2: guard prevents state change when not idle

Property 5 — Replay routes to alliance for all valid alliance snapshots
  fc.property(
    fc.integer({ min: 1, max: 9999 }),
    fc.integer({ min: 1, max: 9999 }),
  )
  // snapshot = { bil1: pos, bil2_original: -neg, bil2_converted: neg }
  → simulate replayAnimation() dengan snapshot alliance
    ASSERT: vizPhase = "transform" (karena bil2_original ≠ 0, mode auto)
  Tag: Feature: same-type-pool-animation, Property 5: replay routes to alliance for all valid snapshots

Property 6 — AlliancePoolPanel always present when vizPhase === "alliance"
  fc.property(
    fc.integer({ min: -9999, max: 9999 }).filter(n => n !== 0),
    fc.integer({ min: -9999, max: 9999 }).filter(n => n !== 0),
  )
  → render ArenaPanel with vizPhase="alliance", snapshot={bil1, bil2}
    ASSERT: DOM contains data-testid="alliance-pool"
    ASSERT: DOM contains data-testid="alliance-stage"
  Tag: Feature: same-type-pool-animation, Property 6: AlliancePoolPanel always present

Property 7 — data-total always accurate
  fc.property(
    fc.integer({ min: -9999, max: 9999 }).filter(n => n !== 0),
    fc.integer({ min: -9999, max: 9999 }).filter(n => n !== 0),
  )
  → render AlliancePoolPanel with snapshot={bil1, bil2}
    ASSERT: element.getAttribute("data-total") === String(|bil1| + |bil2|)
  Tag: Feature: same-type-pool-animation, Property 7: data-total always accurate

Property 8 — Header faction-aware always correct
  fc.property(
    fc.constantFrom("ab", "ku"),
    fc.integer({ min: 1, max: 9999 }),
  )
  → render AlliancePoolPanel with faction, totalValue
    ASSERT: header text contains faction === "ab" ? "+" : "−"
    ASSERT: header text contains String(totalValue)
  Tag: Feature: same-type-pool-animation, Property 8: header faction-aware always correct

Property 9 — aria-hidden on Pool_Gabungan
  fc.property(
    fc.integer({ min: -9999, max: 9999 }).filter(n => n !== 0),
    fc.integer({ min: -9999, max: 9999 }).filter(n => n !== 0),
  )
  → render AlliancePoolPanel with snapshot={bil1, bil2}
    ASSERT: element[data-testid="alliance-pool"].getAttribute("aria-hidden") === "true"
  Tag: Feature: same-type-pool-animation, Property 9: aria-hidden present on Pool_Gabungan

Property 10 — ArenaPanel header and status for alliance
  fc.property(
    fc.integer({ min: -9999, max: 9999 }).filter(n => n !== 0),
    fc.integer({ min: -9999, max: 9999 }).filter(n => n !== 0),
  )
  → render ArenaPanel with vizPhase="alliance", snapshot={bil1, bil2}
    ASSERT: data-testid="arena-header" textContent includes "Persekutuan"
    ASSERT: status text includes "Bergabung"
  Tag: Feature: same-type-pool-animation, Property 10: ArenaPanel header correct for alliance

Property 11 — Accent bar no animate-pulse for alliance
  fc.property(
    fc.integer({ min: -9999, max: 9999 }).filter(n => n !== 0),
    fc.integer({ min: -9999, max: 9999 }).filter(n => n !== 0),
  )
  → render ArenaPanel with vizPhase="alliance", snapshot={bil1, bil2}
    ASSERT: top accent bar className does not contain "animate-pulse"
  Tag: Feature: same-type-pool-animation, Property 11: no animate-pulse on accent bar for alliance
```

**Regression Tests (existing — harus tetap lulus):**
- `__tests__/game/AllianceStage.test.ts` — Timing_Contract tidak berubah.
- `__tests__/game/BattleStage.test.ts` — tidak ada perubahan di BattleStage.
- `__tests__/game/AnimationEffects.property.test.tsx` — tidak ada perubahan di AnimationEffects.
- `__tests__/game/InteractionAnimation.reduced-motion.test.ts` — tidak ada perubahan di InteractionAnimation.
- `__tests__/model-chip/subtractionState.property.test.ts` — state hook tidak berubah strukturnya.
- `__tests__/model-chip/TransformPanel.test.tsx` — TransformPanel tidak berubah.

**Accessibility Smoke Tests (baru):**
- `data-testid="alliance-pool"` hadir di DOM saat `vizPhase === "alliance"`.
- `aria-hidden="true"` pada container `alliance-pool`.
- `data-total` bernilai string integer yang benar.

---

## Files Changed

| File | Perubahan |
|------|-----------|
| `lib/model-chip/subtractionTypes.ts` | Tambah `"alliance"` ke `VizPhaseSub` |
| `hooks/model-chip/useSubtractionOrchestrator.ts` | Alliance path: `beginAlliance()`, `handleAllianceSub()`, modifikasi `handleSubtract()`, `handleNextClick()`, `replayAnimation()` |
| `components/model-chip/ArenaPanel.tsx` | Ganti blok `vizPhase === "alliance"` dengan `AlliancePoolPanel`, tambah sub-komponen `AlliancePoolPanel` inline |
| `app/model-chip/pengurangan/page.tsx` | Fix `arenaPhase` mapping, fix `onAllianceDone` prop |

## Files NOT Changed

| File | Alasan |
|------|--------|
| `components/game/AllianceStage.tsx` | Tidak dimodifikasi (Req 8.1) |
| `components/model-chip/ArenaBattle.tsx` | Tidak dimodifikasi (Req 8.2) |
| `components/game/PairReactionStage.tsx` | Tidak dimodifikasi (Req 8.3) |
| `hooks/model-chip/useAnimationOrchestrator.ts` | `isAllianceCase` di-export, tidak ada perubahan lain |
| `app/model-chip/page.tsx` | Halaman penjumlahan sudah menggunakan alliance path dengan benar |
| `lib/model-chip/types.ts` | `VizPhase` sudah mengandung `"alliance"` |
| `components/game/CharacterSVGs.tsx` | `CharacterChips` digunakan tanpa modifikasi |
