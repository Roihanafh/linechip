# Implementation Plan: svg-animation-integration

## Overview

Integrasi animasi SVG karakter antibodi dan virus ke halaman `/game-virus`. Implementasi dibagi menjadi dua bagian: (1) penggantian implementasi SVG karakter di `CharacterSVGs.tsx` dengan versi referensi yang lebih kaya detail, dan (2) pembuatan komponen animasi baru (`BattleStage`, `AllianceStage`, `InteractionAnimation`) yang menggantikan efek flash CSS sederhana saat "Hitung Hasil" ditekan.

## Tasks

- [x] 1. Ganti implementasi SVG karakter di CharacterSVGs.tsx
  - Salin implementasi 8 komponen SVG dari `referensi/SVG Antibody Virus Animation/src/imports/pasted_text/character-svgr.tsx` ke `components/game/CharacterSVGs.tsx`: `AntibodySatuan`, `AntibodyPuluhan`, `AntibodyRatusan`, `AntibodyRibuan`, `VirusSatuan`, `VirusPuluhan`, `VirusRatusan`, `VirusRibuan`
  - Pertahankan semua API publik tanpa perubahan: nama komponen, types, exports (`AntibodyCharacter`, `VirusCharacter`, `CharacterChips`, `PlaceValue`, `CHAR_NAMES`, `TIER_TO_PLACE`, `dominantPlace`), dan fungsi helper `polar`
  - Pastikan setiap komponen karakter baru tetap menerima prop `uid?: string` dan menggunakannya sebagai suffix pada semua `id` elemen `<defs>` SVG

  - [x] 1.1 Ganti implementasi SVG AntibodySatuan, AntibodyPuluhan, AntibodyRatusan, AntibodyRibuan
    - Salin badan SVG dari file referensi ke masing-masing komponen di `CharacterSVGs.tsx`
    - Verifikasi prop `uid` masih digunakan sebagai suffix gradient id (contoh: `` `ab1${uid}` ``)
    - _Requirements: 0.1, 0.2, 0.4_

  - [x] 1.2 Ganti implementasi SVG VirusSatuan, VirusPuluhan, VirusRatusan, VirusRibuan
    - Salin badan SVG dari file referensi ke masing-masing komponen
    - Verifikasi prop `uid` masih digunakan sebagai suffix pada semua gradient id
    - _Requirements: 0.1, 0.2, 0.4_

  - [x] 1.3 Tulis property test untuk uid suffix mencegah konflik id SVG
    - **Property 1: UID suffix mencegah konflik id SVG**
    - Untuk setiap pasangan uid berbeda, tidak ada elemen `<defs>` id yang sama di antara dua instance karakter berbeda
    - **Validates: Requirements 0.4**

  - [x] 1.4 Tulis unit test CharacterChips tetap berfungsi normal
    - Verifikasi dekomposisi nilai ke tier, rendering per-tier, dan phase (idle/charging/exploding/settled) tidak terpengaruh
    - _Requirements: 0.5_

- [x] 2. Tambah CSS keyframes baru ke animations.css
  - Tambahkan semua keyframe animasi yang dibutuhkan ke `app/animations.css`, mengadaptasi nilai dari `referensi/SVG Antibody Virus Animation/src/index.css` dengan suffix `-kf` sesuai konvensi yang ada
  - Jangan duplikasi keyframe yang sudah ada: `battle-shake-kf` dan `battle-float-kf`
  - Tambahkan utility classes baru di `@layer utilities` untuk setiap keyframe baru

  - [x] 2.1 Tambah keyframes Battle (approach, recoil, dissolve, flash, stage-shake)
    - Tambahkan: `battle-approach-left-kf`, `battle-approach-right-kf`, `battle-recoil-left-kf`, `battle-recoil-right-kf`
    - Tambahkan: `dissolve-ccw-kf`, `dissolve-cw-kf`, `flash-impact-kf`, `stage-shake-kf`
    - Nilai konkret diadaptasi dari referensi `index.css` (battle-approach-left/right, battle-recoil-left/right, dissolve-ccw/cw, flash-impact, stage-shake)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 2.2 Tambah keyframes Alliance (approach, bounce, settled-glow)
    - Tambahkan: `alliance-approach-left-kf`, `alliance-approach-right-kf`
    - Tambahkan: `bounce-merge-kf`, `settled-glow-blue-kf`, `settled-glow-red-kf`
    - _Requirements: 6.5, 6.6, 6.7_

  - [x] 2.3 Tambah keyframes efek bersama (particle-fly, shockwave, popup, idle-hover-pop, bar-drain)
    - Tambahkan: `particle-fly-kf` (menggunakan CSS custom properties `--tx`, `--ty`, `--r`)
    - Tambahkan: `shockwave-kf`, `popup-rise-kf`, `idle-hover-pop-kf`, `bar-drain-kf`
    - _Requirements: 6.8, 6.9, 6.10, 6.11_

- [x] 3. Checkpoint — Fondasi siap
  - Pastikan `CharacterSVGs.tsx` ter-compile tanpa error TypeScript dan semua halaman yang mengimpornya (game-virus, model-chip, dll.) masih merender karakter dengan benar.
  - Pastikan `animations.css` tidak mengandung nama keyframe duplikat.
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Buat AnimationEffects.tsx
  - Buat file baru `components/game/AnimationEffects.tsx` yang mengekspor shared visual effects untuk digunakan oleh BattleStage dan AllianceStage

  - [x] 4.1 Implementasi hook useParticles dan komponen Burst
    - Implementasi `useParticles(runKey, opts)`: generate array Particle via `useMemo`, di-regenerate setiap `runKey` berubah
    - Implementasi `Burst({ particles, scale, left? })`: render partikel dengan CSS custom props `--tx`, `--ty`, `--r` sebagai inline style
    - Batasi maksimum partikel: 20 untuk battle, 16 untuk alliance (total < 30)
    - _Requirements: 9.3_

  - [x] 4.2 Tulis property test jumlah elemen partikel DOM tidak melebihi 30
    - **Property 9: Jumlah elemen partikel DOM tidak melebihi 30**
    - Untuk setiap nilai `count` yang diteruskan ke `useParticles`, jumlah elemen yang dirender `<Burst>` tidak melebihi 30
    - **Validates: Requirements 9.3**

  - [x] 4.3 Implementasi komponen Shockwave dan Popup
    - Implementasi `Shockwave({ runKey, color, scale, size? })`: menggunakan `key={runKey}` untuk reset animasi, keyframe `shockwave-kf`
    - Implementasi `Popup({ text, color, scale })`: teks popup dengan keyframe `popup-rise-kf`
    - _Requirements: 3.3, 4.4, 3.8_

- [x] 5. Buat BattleStage.tsx
  - Buat file baru `components/game/BattleStage.tsx` dengan full battle animation lifecycle

  - [x] 5.1 Implementasi state management dan timer lifecycle BattleStage
    - Definisikan type `BattlePhase = "idle" | "approach" | "impact" | "recoil" | "dissolve" | "done"`
    - State: `phase`, `runKey`, `showFlash`, `speedState`, `loop`; Ref: `timers` untuk cleanup
    - Implementasi `useEffect` cleanup: `timers.current.forEach(clearTimeout)`
    - Implementasi fungsi `play()` dengan urutan setTimeout: approach (750ms) → impact (500ms) → recoil (280ms) → dissolve (750ms) → done
    - _Requirements: 2.5, 3.9, 7.1_

  - [x] 5.2 Implementasi posisi dan animasi karakter BattleStage
    - Implementasi `battleOuterStyle(phase, dir, scale)` dengan konstanta layout `SZ = 80`
    - Inner div menggunakan `battleInnerAnim(phase, dir, scale)` untuk shake (impact) dan dissolve (dissolve-ccw/cw)
    - Gunakan keyframe dari `animations.css`: `battle-approach-left-kf`/`battle-approach-right-kf` untuk approach, `battle-recoil-left-kf`/`battle-recoil-right-kf` untuk recoil
    - Render `AntibodyCharacter` (kiri) dan `VirusCharacter` (kanan) dari `CharacterSVGs.tsx`
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6_

  - [x] 5.3 Implementasi efek impact dan "NETRAL ✓" popup BattleStage
    - Saat `showFlash === true`: render flash overlay + `<Shockwave>` + `<Burst>` dari `AnimationEffects.tsx`
    - Saat `isPerfectNeutralization && phase === "done"`: render `<Popup text="NETRAL ✓" color="#86efac" />`
    - _Requirements: 3.3, 3.7, 3.8_

  - [x] 5.4 Implementasi SpeedControl, LoopToggle, dan prop hideControls BattleStage
    - Implementasi komponen internal `SpeedControl` dan `LoopToggle`
    - Render keduanya hanya jika `hideControls === false`
    - Prop `speed` dari luar dikombinasikan dengan internal `speedState`: `speed = speedProp ?? speedState`
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.6_

  - [x] 5.5 Tulis component test BattleStage memanggil onComplete tepat 1x
    - Gunakan `jest.useFakeTimers()`, render BattleStage dengan `autoStart`, advance timer, verifikasi `onComplete` dipanggil tepat 1x
    - _Requirements: 2.4_

  - [x] 5.6 Tulis property test speed multiplier proporsional terhadap semua durasi setTimeout
    - **Property 8: Speed multiplier proporsional terhadap semua durasi setTimeout**
    - Untuk setiap nilai `speed = n > 0`, setiap timeout dijadwalkan dengan durasi `baseDuration / n`
    - **Validates: Requirements 7.2**

- [x] 6. Buat AllianceStage.tsx
  - Buat file baru `components/game/AllianceStage.tsx` dengan full alliance animation lifecycle

  - [x] 6.1 Implementasi state management dan timer lifecycle AllianceStage
    - Definisikan type `AlliancePhase = "idle" | "approach" | "bounce" | "settled"`
    - State: `phase`, `runKey`, `showBurst`, `speedState`, `loop`; Ref: `timers` untuk cleanup
    - Implementasi `useEffect` cleanup: `timers.current.forEach(clearTimeout)`
    - Implementasi fungsi `play()`: approach (750ms) → bounce (600ms) → settled (panggil `onComplete`)
    - _Requirements: 2.5, 4.7, 7.1_

  - [x] 6.2 Implementasi posisi dan animasi karakter AllianceStage
    - Implementasi `allianceOuterStyle(phase, dir, scale)` menggunakan `alliance-approach-left-kf`/`alliance-approach-right-kf`
    - Karakter kiri menggunakan `charType1`, karakter kanan menggunakan `charType2` (boleh berbeda tier)
    - Inner div menggunakan `bounce-merge-kf` (bounce) dan `settled-glow-blue-kf`/`settled-glow-red-kf` (settled)
    - Render `AntibodyCharacter` untuk faction `"ab"`, `VirusCharacter` untuk faction `"ku"`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 6.3 Implementasi efek burst dan settled-glow AllianceStage
    - Saat `showBurst === true`: render `<Shockwave>` + `<Burst sparks>` di titik pertemuan
    - Saat `phase === "settled"`: render aura glow ellipse + `<Popup text="+ KUAT!" color={accentHex} />`
    - Panggil `onComplete` saat memasuki phase `settled`
    - _Requirements: 4.4, 4.5, 4.6_

  - [x] 6.4 Implementasi SpeedControl, LoopToggle, dan prop hideControls AllianceStage
    - Implementasi `SpeedControl` dan `LoopToggle` internal, hanya tampil jika `!hideControls`
    - Prop `speed` dari luar dikombinasikan: `speed = speedProp ?? speedState`
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.6_

  - [x] 6.5 Tulis component test AllianceStage memanggil onComplete tepat 1x
    - Gunakan `jest.useFakeTimers()`, render AllianceStage dengan `autoStart`, advance timer, verifikasi `onComplete` dipanggil tepat 1x
    - _Requirements: 2.4_

- [x] 7. Checkpoint — Stages siap
  - Pastikan BattleStage dan AllianceStage merender tanpa error dan semua CSS keyframe terhubung dengan benar.
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Buat InteractionAnimation.tsx
  - Buat file baru `components/game/InteractionAnimation.tsx` yang mengekspor `classifyInteraction` (pure function) dan `InteractionAnimation` (component)

  - [x] 8.1 Implementasi fungsi classifyInteraction
    - Definisikan types `InteractionType`, `InteractionConfig`
    - Logika: tanda berbeda → `"battle"`, tanda sama positif → `"alliance"` faction `"ab"`, tanda sama negatif → `"alliance"` faction `"ku"`
    - Deteksi perfect neutralization: `bil1 + bil2 === 0`
    - Throw `Error` jika salah satu nilai adalah `0`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 8.2 Tulis property test klasifikasi Battle untuk semua pasangan tanda berbeda
    - **Property 3: Klasifikasi Battle untuk semua pasangan tanda berbeda**
    - Untuk setiap `a > 0` dan `b < 0` (atau sebaliknya), `classifyInteraction(a, b)` mengembalikan `type === "battle"`
    - Gunakan fast-check: `fc.integer({ min: 1, max: 9999 })` dan `fc.integer({ min: -9999, max: -1 })`
    - **Validates: Requirements 1.1**

  - [x] 8.3 Tulis property test klasifikasi Alliance-ab untuk semua pasangan positif
    - **Property 4: Klasifikasi Alliance-ab untuk semua pasangan positif**
    - Untuk setiap `a > 0` dan `b > 0`, mengembalikan `type === "alliance"` dengan `faction === "ab"`
    - **Validates: Requirements 1.2**

  - [x] 8.4 Tulis property test klasifikasi Alliance-ku untuk semua pasangan negatif
    - **Property 5: Klasifikasi Alliance-ku untuk semua pasangan negatif**
    - Untuk setiap `a < 0` dan `b < 0`, mengembalikan `type === "alliance"` dengan `faction === "ku"`
    - **Validates: Requirements 1.3**

  - [x] 8.5 Tulis property test perfect neutralization terdeteksi untuk semua pasangan zero-sum
    - **Property 6: Perfect neutralization terdeteksi untuk semua pasangan zero-sum**
    - Untuk setiap `n ≠ 0`, `classifyInteraction(n, -n)` mengembalikan `type === "battle"` dengan `isPerfectNeutralization === true`
    - **Validates: Requirements 1.4**

  - [x] 8.6 Tulis property test error untuk semua input dengan salah satu nilai nol
    - **Property 7: Error untuk semua input dengan salah satu nilai nol**
    - Untuk setiap `v ≠ 0`, `classifyInteraction(0, v)` dan `classifyInteraction(v, 0)` keduanya throw error
    - **Validates: Requirements 1.5**

  - [x] 8.7 Implementasi komponen InteractionAnimation
    - Props: `bil1Value`, `bil2Value`, `onComplete`, `speed?: number`
    - Panggil `classifyInteraction` sekali saat mount; render `<BattleStage>` atau `<AllianceStage>` berdasarkan hasil dengan `autoStart={true}` dan `hideControls={true}`
    - Deteksi `prefers-reduced-motion` via `window.matchMedia`; jika aktif, skip animasi dan panggil `onComplete` setelah 200ms
    - Cleanup semua `setTimeout` saat unmount
    - Gunakan `role="presentation"` / `aria-hidden="true"` pada container animasi
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 9.1, 9.2_

  - [x] 8.8 Tulis component test InteractionAnimation dengan prefers-reduced-motion
    - Mock `window.matchMedia` mengembalikan `{ matches: true }` untuk `(prefers-reduced-motion: reduce)`
    - Verifikasi `onComplete` dipanggil dalam ≤ 300ms tanpa merender Stage
    - _Requirements: 9.2_

- [x] 9. Update game-virus/page.tsx
  - Perubahan minimal pada `app/game-virus/page.tsx` untuk mengintegrasikan InteractionAnimation

  - [x] 9.1 Tambah state animating dan ref handleComputeResult
    - Tambahkan `const [animating, setAnimating] = useState(false)`
    - Tambahkan `const handleComputeResult = useRef<() => void>(() => {})`
    - Import `InteractionAnimation` dari `@/components/game/InteractionAnimation`
    - _Requirements: 5.1, 5.2_

  - [x] 9.2 Update handleCompute dan poolDisabled
    - Update `handleCompute`: set `animating=true`, simpan closure `() => { setResultValue(r); ...; setAnimating(false); }` ke `handleComputeResult.current`; hapus setTimeout lama
    - Update `poolDisabled`: tambah `|| animating`
    - _Requirements: 5.1, 5.2, 8.1_

  - [x] 9.3 Mount InteractionAnimation dan sembunyikan BilanganZone saat animating
    - Di area reaktor: jika `animating === true`, render `<InteractionAnimation bil1Value bil2Value onComplete={() => handleComputeResult.current()} />` dan sembunyikan `BilanganZone`
    - Jika `animating === false`, tampilkan `BilanganZone` seperti biasa
    - Tidak ada perubahan pada drag-drop handler, `undoLast`, `reset`, panel hasil, atau UI lainnya
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 8.4, 8.5_

- [x] 10. Final checkpoint — Integrasi lengkap
  - Verifikasi end-to-end: isi Bilangan 1 dan 2 dengan tanda berbeda → Battle animation → hasil muncul
  - Verifikasi: dua bilangan tanda sama → Alliance animation → hasil muncul
  - Verifikasi: bilangan zero-sum → "NETRAL ✓" muncul
  - Verifikasi: tombol Undo, drag-drop, dan Reset Ulang masih berfungsi normal
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks bertanda `*` bersifat opsional dan bisa dilewati untuk MVP lebih cepat
- fast-check perlu ditambahkan ke devDependencies sebelum menjalankan PBT: `npm install -D fast-check`
- Semua durasi animasi dikalikan `scale = 1 / speed` — tidak ada timeout yang lepas dari scaling (Property 8)
- Komponen animasi tidak dirender saat `prefers-reduced-motion: reduce` aktif; `onComplete` dipanggil langsung setelah 200ms (Req 9.2)
- `hideControls={true}` selalu diteruskan dari `InteractionAnimation` ke stage — SpeedControl dan LoopToggle tidak pernah muncul di konteks game (Req 10.5)
- Property 1 (uid suffix) dan Property 2 (CharacterChips decomposition) diuji via unit test biasa karena deterministik
- Urutan implementasi penting: CharacterSVGs → animations.css → AnimationEffects → BattleStage → AllianceStage → InteractionAnimation → page.tsx → tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "2.1", "2.2", "2.3"] },
    { "id": 2, "tasks": ["4.1", "4.3"] },
    { "id": 3, "tasks": ["4.2", "5.1", "6.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4", "6.2", "6.3", "6.4"] },
    { "id": 5, "tasks": ["5.5", "5.6", "6.5", "8.1"] },
    { "id": 6, "tasks": ["8.2", "8.3", "8.4", "8.5", "8.6", "8.7"] },
    { "id": 7, "tasks": ["8.8", "9.1"] },
    { "id": 8, "tasks": ["9.2"] },
    { "id": 9, "tasks": ["9.3"] }
  ]
}
```
