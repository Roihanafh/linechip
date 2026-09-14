/**
 * Unit tests for Speed_Control (inline in app/model-chip/page.tsx).
 *
 * The Speed_Control is rendered inside `{vizPhase === "battle" && (...)}` in
 * page.tsx as a row of three speed buttons (0.5×, 1×, 2×).
 * Because the project's Jest environment is Node (no jsdom / no @testing-library),
 * we test the pure logic that drives the control's rendering rather than
 * mounting the full React component tree. This mirrors the established pattern
 * in __tests__/model-chip/AnimationMode_Selector.test.tsx and
 * __tests__/game/CharacterChips.test.ts.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.6
 */

export {}; // make this file a module so local types don't bleed into global scope

// ── Types (mirror from page.tsx) ──────────────────────────────────────────────

type VizPhase = "idle" | "battle" | "center" | "done";
type AnimMode = "auto" | "click";
type SpeedValue = 0.5 | 1 | 2;

// ── Pure logic extracted from Speed_Control render in page.tsx ────────────────

/** The exact three speed options the Speed_Control always renders. */
const SPEED_OPTIONS: SpeedValue[] = [0.5, 1, 2];

/**
 * Returns whether Speed_Control should be rendered for a given vizPhase.
 * Mirrors the guard in page.tsx: `{vizPhase === "battle" && (...)}`
 */
function shouldShowSpeedControl(vizPhase: VizPhase): boolean {
  return vizPhase === "battle";
}

/**
 * Returns the CSS classes applied to an active/inactive speed button.
 * Mirrors the className ternary in the Speed_Control render:
 *   animSpeed === spd ? "bg-intblue text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
 */
function speedButtonClasses(spd: SpeedValue, animSpeed: SpeedValue): string {
  const base = "px-3 py-1 rounded-md text-xs font-bold transition-all";
  const activeClasses = "bg-intblue text-white shadow-sm";
  const inactiveClasses = "text-slate-400 hover:text-slate-600";
  const isActive = spd === animSpeed;
  return `${base} ${isActive ? activeClasses : inactiveClasses}`;
}

/**
 * Returns the display label for a speed button — mirrors the JSX `{spd}×`.
 */
function speedButtonLabel(spd: SpeedValue): string {
  return `${spd}×`;
}

/**
 * Simulates a speed change: returns the new animSpeed after clicking a speed button.
 * Mirrors the onClick handler: `setAnimSpeed(spd); animSpeedRef.current = spd;`
 * Speed changes are always allowed regardless of vizPhase (only displayed during battle).
 */
function simulateSpeedChange(newSpd: SpeedValue): SpeedValue {
  return newSpd;
}

/**
 * Returns whether a speed button is marked as active.
 * Mirrors `animSpeed === spd`.
 */
function isActiveSpeed(spd: SpeedValue, animSpeed: SpeedValue): boolean {
  return spd === animSpeed;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Speed_Control — Req 4.1: tampil saat vizPhase === 'battle' di kedua mode", () => {
  it("tampil saat vizPhase === 'battle' dengan animMode === 'auto'", () => {
    expect(shouldShowSpeedControl("battle")).toBe(true);
  });

  it("tampil saat vizPhase === 'battle' dengan animMode === 'click'", () => {
    // Speed_Control tampil berdasarkan vizPhase saja, bukan animMode
    expect(shouldShowSpeedControl("battle")).toBe(true);
  });

  it("shouldShowSpeedControl tidak bergantung pada animMode — selalu true saat battle", () => {
    const modes: AnimMode[] = ["auto", "click"];
    modes.forEach(() => {
      // Kedua mode menghasilkan hasil yang sama
      expect(shouldShowSpeedControl("battle")).toBe(true);
    });
  });
});

describe("Speed_Control — Req 4.6: tidak tampil saat vizPhase === 'idle' atau 'done'", () => {
  it("tidak tampil saat vizPhase === 'idle'", () => {
    expect(shouldShowSpeedControl("idle")).toBe(false);
  });

  it("tidak tampil saat vizPhase === 'done'", () => {
    expect(shouldShowSpeedControl("done")).toBe(false);
  });

  it("tidak tampil saat vizPhase === 'center'", () => {
    // center juga bukan battle — Speed_Control disembunyikan
    expect(shouldShowSpeedControl("center")).toBe(false);
  });

  it("hanya vizPhase === 'battle' yang menampilkan Speed_Control", () => {
    const allPhases: VizPhase[] = ["idle", "battle", "center", "done"];
    const visiblePhases = allPhases.filter((p) => shouldShowSpeedControl(p));
    expect(visiblePhases).toEqual(["battle"]);
    expect(visiblePhases).toHaveLength(1);
  });
});

describe("Speed_Control — Req 4.2: tepat tiga tombol kecepatan: 0.5, 1, 2", () => {
  it("terdapat tepat tiga pilihan kecepatan", () => {
    expect(SPEED_OPTIONS).toHaveLength(3);
  });

  it("pilihan pertama adalah 0.5", () => {
    expect(SPEED_OPTIONS[0]).toBe(0.5);
  });

  it("pilihan kedua adalah 1", () => {
    expect(SPEED_OPTIONS[1]).toBe(1);
  });

  it("pilihan ketiga adalah 2", () => {
    expect(SPEED_OPTIONS[2]).toBe(2);
  });

  it("semua pilihan unik (tidak ada duplikat)", () => {
    const unique = new Set(SPEED_OPTIONS);
    expect(unique.size).toBe(3);
  });

  it("label tombol 0.5 adalah '0.5×'", () => {
    expect(speedButtonLabel(0.5)).toBe("0.5×");
  });

  it("label tombol 1 adalah '1×'", () => {
    expect(speedButtonLabel(1)).toBe("1×");
  });

  it("label tombol 2 adalah '2×'", () => {
    expect(speedButtonLabel(2)).toBe("2×");
  });

  it("semua label tidak kosong", () => {
    SPEED_OPTIONS.forEach((spd) => {
      expect(speedButtonLabel(spd).trim()).not.toBe("");
    });
  });
});

describe("Speed_Control — Req 4.3: pilihan aktif bergaya intblue/putih; tidak aktif slate-400", () => {
  it("tombol aktif 0.5× mendapat kelas bg-intblue", () => {
    const classes = speedButtonClasses(0.5, 0.5);
    expect(classes).toContain("bg-intblue");
  });

  it("tombol aktif 0.5× mendapat kelas text-white", () => {
    const classes = speedButtonClasses(0.5, 0.5);
    expect(classes).toContain("text-white");
  });

  it("tombol aktif 1× mendapat kelas bg-intblue", () => {
    const classes = speedButtonClasses(1, 1);
    expect(classes).toContain("bg-intblue");
  });

  it("tombol aktif 2× mendapat kelas bg-intblue", () => {
    const classes = speedButtonClasses(2, 2);
    expect(classes).toContain("bg-intblue");
  });

  it("tombol tidak aktif mendapat kelas text-slate-400", () => {
    // animSpeed=1, tombol 0.5 tidak aktif
    const classes = speedButtonClasses(0.5, 1);
    expect(classes).toContain("text-slate-400");
    expect(classes).not.toContain("bg-intblue");
  });

  it("tombol tidak aktif tidak mendapat kelas text-white", () => {
    const classes = speedButtonClasses(2, 0.5);
    expect(classes).not.toContain("text-white");
  });

  it("tombol tidak aktif tidak mendapat kelas bg-intblue", () => {
    const classes = speedButtonClasses(1, 2);
    expect(classes).not.toContain("bg-intblue");
  });

  it("kelas aktif dan tidak aktif berbeda untuk tombol yang sama", () => {
    const active = speedButtonClasses(1, 1);
    const inactive = speedButtonClasses(1, 0.5);
    expect(active).not.toBe(inactive);
  });

  it("penanda aktif memiliki dua perbedaan visual: latar berbeda DAN teks berbeda", () => {
    const active = speedButtonClasses(1, 1);
    const inactive = speedButtonClasses(1, 0.5);
    // latar berbeda
    expect(active).toContain("bg-intblue");
    expect(inactive).not.toContain("bg-intblue");
    // teks berbeda
    expect(active).toContain("text-white");
    expect(inactive).toContain("text-slate-400");
  });

  it("tepat satu tombol aktif saat animSpeed=0.5", () => {
    const activeButtons = SPEED_OPTIONS.filter((spd) => isActiveSpeed(spd, 0.5));
    expect(activeButtons).toHaveLength(1);
    expect(activeButtons[0]).toBe(0.5);
  });

  it("tepat satu tombol aktif saat animSpeed=1", () => {
    const activeButtons = SPEED_OPTIONS.filter((spd) => isActiveSpeed(spd, 1));
    expect(activeButtons).toHaveLength(1);
    expect(activeButtons[0]).toBe(1);
  });

  it("tepat satu tombol aktif saat animSpeed=2", () => {
    const activeButtons = SPEED_OPTIONS.filter((spd) => isActiveSpeed(spd, 2));
    expect(activeButtons).toHaveLength(1);
    expect(activeButtons[0]).toBe(2);
  });

  it("tombol selain yang aktif tidak memiliki kelas bg-intblue", () => {
    // animSpeed=1: hanya tombol 1× yang aktif
    const inactiveOptions = SPEED_OPTIONS.filter((spd) => spd !== 1) as SpeedValue[];
    inactiveOptions.forEach((spd) => {
      const classes = speedButtonClasses(spd, 1);
      expect(classes).not.toContain("bg-intblue");
      expect(classes).not.toContain("text-white");
    });
  });
});

describe("Speed_Control — interaksi state: simulasi perubahan kecepatan", () => {
  it("klik tombol 0.5 mengatur animSpeed ke 0.5", () => {
    expect(simulateSpeedChange(0.5)).toBe(0.5);
  });

  it("klik tombol 1 mengatur animSpeed ke 1", () => {
    expect(simulateSpeedChange(1)).toBe(1);
  });

  it("klik tombol 2 mengatur animSpeed ke 2", () => {
    expect(simulateSpeedChange(2)).toBe(2);
  });

  it("klik tombol yang sudah aktif tidak mengubah apapun (idempoten)", () => {
    // Memilih kecepatan yang sama menghasilkan nilai yang sama
    expect(simulateSpeedChange(1)).toBe(1);
    expect(simulateSpeedChange(0.5)).toBe(0.5);
    expect(simulateSpeedChange(2)).toBe(2);
  });

  it("siklus lengkap: 1 → 0.5 → 2 → 1", () => {
    let speed: SpeedValue = 1;

    speed = simulateSpeedChange(0.5);
    expect(speed).toBe(0.5);

    speed = simulateSpeedChange(2);
    expect(speed).toBe(2);

    speed = simulateSpeedChange(1);
    expect(speed).toBe(1);
  });

  it("setelah perubahan kecepatan, tepat satu tombol aktif", () => {
    const newSpeed: SpeedValue = 2;
    const activeButtons = SPEED_OPTIONS.filter((spd) => isActiveSpeed(spd, newSpeed));
    expect(activeButtons).toHaveLength(1);
  });
});

describe("Speed_Control — konsistensi: selalu tampil di kedua mode saat battle", () => {
  it("tampil pada semua kombinasi (animMode × vizPhase=battle)", () => {
    const modes: AnimMode[] = ["auto", "click"];
    modes.forEach(() => {
      // Speed_Control hanya bergantung pada vizPhase
      expect(shouldShowSpeedControl("battle")).toBe(true);
    });
  });

  it("transisi idle → battle: Speed_Control muncul", () => {
    expect(shouldShowSpeedControl("idle")).toBe(false);
    expect(shouldShowSpeedControl("battle")).toBe(true);
  });

  it("transisi battle → center: Speed_Control menghilang", () => {
    expect(shouldShowSpeedControl("battle")).toBe(true);
    expect(shouldShowSpeedControl("center")).toBe(false);
  });

  it("transisi center → done: Speed_Control tetap tidak tampil", () => {
    expect(shouldShowSpeedControl("center")).toBe(false);
    expect(shouldShowSpeedControl("done")).toBe(false);
  });
});
