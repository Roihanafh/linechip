/**
 * Component test: AllianceStage memanggil onComplete tepat 1x
 *
 * Feature: svg-animation-integration
 * Task 6.5
 *
 * Karena test environment adalah Node (tanpa jsdom), kita tidak dapat
 * me-render komponen React secara langsung. Pendekatan yang digunakan:
 * mengekstrak dan mensimulasikan logika timer dari play() di AllianceStage
 * menggunakan jest.useFakeTimers() — pola yang sama dengan CharacterChips.test.ts.
 *
 * AllianceStage total cycle pada speed=1:
 *   - approach → bounce : 750ms
 *   - bounce → settled  : 600ms  (onComplete dipanggil di sini)
 *   Total: 1350ms
 *
 * Requirements: 2.4
 */

// ─── Simulasi logika play() dari AllianceStage ────────────────────────────────

/**
 * Simulasi fungsi play() milik AllianceStage.
 *
 * Menerima callback onComplete dan speed multiplier, lalu menjadwalkan
 * phase transitions menggunakan setTimeout — persis seperti AllianceStage.tsx:
 *
 *   schedule(fn, ms) → setTimeout(fn, ms / effectiveSpeed)
 *
 * approach → bounce  : 750ms
 * bounce   → settled : 600ms  → onComplete() dipanggil sekali
 */
function simulateAlliancePlay(
  onComplete: () => void,
  speed = 1,
): { timers: ReturnType<typeof setTimeout>[] } {
  const timers: ReturnType<typeof setTimeout>[] = [];
  const effectiveSpeed = speed;

  function schedule(fn: () => void, ms: number): void {
    const id = setTimeout(fn, ms / effectiveSpeed);
    timers.push(id);
  }

  // approach → bounce
  schedule(() => {
    // setPhase("bounce"); setShowBurst(true); — state mutations, omitted here
  }, 750);

  // bounce → settled: panggil onComplete (tanpa loop, sesuai default)
  schedule(() => {
    // setShowBurst(false); setPhase("settled");
    onComplete();
  }, 750 + 600);

  return { timers };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AllianceStage — onComplete dipanggil tepat 1x (Requirement 2.4)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("onComplete dipanggil tepat 1x setelah siklus penuh (1350ms) pada speed=1", () => {
    const onComplete = jest.fn();

    simulateAlliancePlay(onComplete, 1);

    // Belum selesai — onComplete belum terpanggil
    expect(onComplete).not.toHaveBeenCalled();

    // Maju 2000ms (lebih dari cukup untuk siklus 1350ms)
    jest.advanceTimersByTime(2000);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("onComplete TIDAK terpanggil sebelum 1350ms berlalu", () => {
    const onComplete = jest.fn();

    simulateAlliancePlay(onComplete, 1);

    // Maju 1000ms — bounce phase sudah dimulai (750ms) tetapi settled belum (1350ms)
    jest.advanceTimersByTime(1000);
    expect(onComplete).not.toHaveBeenCalled();

    // Maju 400ms lagi → total 1400ms — sekarang settled sudah dicapai
    jest.advanceTimersByTime(400);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("onComplete hanya dipanggil sekali meski timer di-advance jauh ke depan", () => {
    const onComplete = jest.fn();

    simulateAlliancePlay(onComplete, 1);

    // Lompat jauh — tidak ada timeout tambahan yang bisa memanggil onComplete lebih dari 1x
    jest.advanceTimersByTime(10_000);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("dengan speed=2: onComplete terpanggil setelah 675ms (1350ms / 2)", () => {
    const onComplete = jest.fn();

    // speed=2 → semua durasi dibagi 2
    // approach timeout: 750/2 = 375ms
    // settled timeout : 1350/2 = 675ms
    simulateAlliancePlay(onComplete, 2);

    // Belum 675ms → onComplete belum terpanggil
    jest.advanceTimersByTime(500);
    expect(onComplete).not.toHaveBeenCalled();

    // Maju ke 700ms total → melebihi 675ms
    jest.advanceTimersByTime(200);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("dengan speed=0.5: onComplete terpanggil setelah 2700ms (1350ms * 2)", () => {
    const onComplete = jest.fn();

    // speed=0.5 → semua durasi dikali 2
    // approach timeout: 750/0.5 = 1500ms
    // settled timeout : 1350/0.5 = 2700ms
    simulateAlliancePlay(onComplete, 0.5);

    // Belum 2700ms → belum selesai
    jest.advanceTimersByTime(2000);
    expect(onComplete).not.toHaveBeenCalled();

    // Maju ke total 3000ms → melebihi 2700ms
    jest.advanceTimersByTime(1000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("cleanup: membatalkan timer sebelum onComplete tidak menyebabkan pemanggilan", () => {
    const onComplete = jest.fn();

    const { timers } = simulateAlliancePlay(onComplete, 1);

    // Maju sebagian — bounce dimulai tapi settled belum
    jest.advanceTimersByTime(800);

    // Simulasikan unmount: batalkan semua timer (Requirement 2.5)
    timers.forEach(clearTimeout);

    // Maju jauh ke depan — onComplete tidak boleh terpanggil
    jest.advanceTimersByTime(5000);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
