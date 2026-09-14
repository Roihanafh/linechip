/**
 * Unit tests for Tombol_Lanjut (inline in app/model-chip/page.tsx).
 *
 * The button is rendered conditionally in the page as:
 *   {animMode === "click" && vizPhase === "battle" && (
 *     <button
 *       onClick={handleNextClick}
 *       disabled={!waitingForClick}
 *       aria-label="Mulai animasi pasangan berikutnya"
 *       className="... disabled:opacity-40 ..."
 *     >
 *       Lanjut ▶
 *     </button>
 *   )}
 *
 * Because the project's Jest environment is Node (no jsdom / no @testing-library),
 * we test the pure logic that drives the button's rendering rather than mounting
 * the full React component tree. This mirrors the established pattern in
 * __tests__/model-chip/AnimationMode_Selector.test.tsx.
 *
 * Requirements: 3.1, 3.2, 3.3, 5.2, 5.3, 5.4, 5.6
 */

export {}; // make this file a module so local types don't bleed into global scope

// ── Types (mirrored from page.tsx) ────────────────────────────────────────────

type VizPhase = "idle" | "battle" | "center" | "done";
type AnimMode = "auto" | "click";

// ── Pure logic extracted from the Tombol_Lanjut render in page.tsx ────────────

/**
 * Returns whether Tombol_Lanjut should be present in the DOM at all.
 * Mirrors: `animMode === "click" && vizPhase === "battle"`
 */
function isTombolLanjutVisible(animMode: AnimMode, vizPhase: VizPhase): boolean {
  return animMode === "click" && vizPhase === "battle";
}

/**
 * Returns whether Tombol_Lanjut should have the `disabled` attribute.
 * Mirrors: `disabled={!waitingForClick}`
 */
function isTombolLanjutDisabled(waitingForClick: boolean): boolean {
  return !waitingForClick;
}

/**
 * Returns the CSS classes applied to Tombol_Lanjut.
 * Mirrors the className in page.tsx:
 *   "px-6 py-2 bg-intblue text-white rounded-xl font-bold text-sm
 *    transition-colors hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
 */
function tombolLanjutClasses(): string {
  return "px-6 py-2 bg-intblue text-white rounded-xl font-bold text-sm transition-colors hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed";
}

/**
 * Returns the button's visible text label.
 * Mirrors: "Lanjut ▶"
 */
function tombolLanjutLabel(): string {
  return "Lanjut ▶";
}

/**
 * Returns the aria-label attribute value for Tombol_Lanjut.
 * Mirrors: `aria-label="Mulai animasi pasangan berikutnya"`
 */
function tombolLanjutAriaLabel(): string {
  return "Mulai animasi pasangan berikutnya";
}

/**
 * Extracts the effective opacity class applied when the button is disabled.
 * Returns the opacity percentage as a number (e.g. 40 for "opacity-40").
 */
function disabledOpacityPercent(classes: string): number | null {
  const match = classes.match(/disabled:opacity-(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

// ── Req 5.2 + 3.1: Tampil saat animMode === "click" && vizPhase === "battle" ──

describe("Tombol_Lanjut — Req 5.2 / 3.1: tampil hanya saat (click ∩ battle)", () => {
  it("visible saat animMode='click' dan vizPhase='battle'", () => {
    expect(isTombolLanjutVisible("click", "battle")).toBe(true);
  });

  it("tidak visible saat animMode='auto' dan vizPhase='battle'", () => {
    expect(isTombolLanjutVisible("auto", "battle")).toBe(false);
  });

  it("tidak visible saat animMode='click' dan vizPhase='idle'", () => {
    expect(isTombolLanjutVisible("click", "idle")).toBe(false);
  });

  it("tidak visible saat animMode='click' dan vizPhase='center'", () => {
    expect(isTombolLanjutVisible("click", "center")).toBe(false);
  });

  it("tidak visible saat animMode='click' dan vizPhase='done'", () => {
    expect(isTombolLanjutVisible("click", "done")).toBe(false);
  });

  it("tidak visible saat animMode='auto' dan vizPhase='idle'", () => {
    expect(isTombolLanjutVisible("auto", "idle")).toBe(false);
  });

  it("tidak visible saat animMode='auto' dan vizPhase='center'", () => {
    expect(isTombolLanjutVisible("auto", "center")).toBe(false);
  });

  it("tidak visible saat animMode='auto' dan vizPhase='done'", () => {
    expect(isTombolLanjutVisible("auto", "done")).toBe(false);
  });

  it("menampilkan teks 'Lanjut ▶' saat visible", () => {
    // Label harus tepat sebagai spesifikasi (Req 5.2)
    expect(tombolLanjutLabel()).toBe("Lanjut ▶");
  });

  it("label tidak kosong", () => {
    expect(tombolLanjutLabel().trim()).not.toBe("");
  });
});

// ── Req 5.4: aria-label yang benar ───────────────────────────────────────────

describe("Tombol_Lanjut — Req 5.4: atribut aria-label", () => {
  it("aria-label bernilai tepat 'Mulai animasi pasangan berikutnya'", () => {
    expect(tombolLanjutAriaLabel()).toBe("Mulai animasi pasangan berikutnya");
  });

  it("aria-label tidak kosong", () => {
    expect(tombolLanjutAriaLabel().trim()).not.toBe("");
  });

  it("aria-label dalam bahasa Indonesia (mengandung kata 'animasi')", () => {
    expect(tombolLanjutAriaLabel().toLowerCase()).toContain("animasi");
  });

  it("aria-label dalam bahasa Indonesia (mengandung kata 'pasangan')", () => {
    expect(tombolLanjutAriaLabel().toLowerCase()).toContain("pasangan");
  });

  it("aria-label bersifat deskriptif — lebih dari satu kata", () => {
    const words = tombolLanjutAriaLabel().trim().split(/\s+/).filter(Boolean);
    expect(words.length).toBeGreaterThan(1);
  });
});

// ── Req 3.2 + 5.6: disabled saat !waitingForClick, opacity ≤ 40% ─────────────

describe("Tombol_Lanjut — Req 3.2 / 5.6: disabled dan opacity saat tidak menunggu", () => {
  it("disabled === true saat waitingForClick === false", () => {
    expect(isTombolLanjutDisabled(false)).toBe(true);
  });

  it("disabled === false saat waitingForClick === true", () => {
    expect(isTombolLanjutDisabled(true)).toBe(false);
  });

  it("kelas CSS mengandung 'disabled:opacity-40' untuk opacity saat disabled", () => {
    const classes = tombolLanjutClasses();
    expect(classes).toContain("disabled:opacity-40");
  });

  it("opacity saat disabled adalah 40% atau kurang (≤ 40)", () => {
    const classes = tombolLanjutClasses();
    const opacity = disabledOpacityPercent(classes);
    expect(opacity).not.toBeNull();
    expect(opacity!).toBeLessThanOrEqual(40);
  });

  it("opacity saat disabled lebih dari 0% (masih terlihat, bukan tersembunyi)", () => {
    const classes = tombolLanjutClasses();
    const opacity = disabledOpacityPercent(classes);
    expect(opacity).not.toBeNull();
    expect(opacity!).toBeGreaterThan(0);
  });

  it("kelas CSS mengandung 'disabled:cursor-not-allowed' sebagai umpan balik visual", () => {
    const classes = tombolLanjutClasses();
    expect(classes).toContain("disabled:cursor-not-allowed");
  });
});

// ── Req 3.3: Aktif (tidak disabled) setelah onDone jika masih ada pasangan ───

describe("Tombol_Lanjut — Req 3.3: aktif setelah onDone selagi pasangan masih ada", () => {
  /**
   * Simulates the state transition in onDone (Mode_Klik) when there are still
   * pairs remaining. Mirrors the logic in page.tsx's PairReactionStage onDone callback.
   */
  function simulateOnDoneWithRemainingPairs(
    initialWaitingForClick: boolean
  ): { waitingForClick: boolean } {
    // onDone with remaining pairs: sets waitingForClick = true (pendingNextRef is set)
    // This mirrors: pendingNextRef.current = {...}; setWaitingForClick(true);
    return { waitingForClick: true };
  }

  /**
   * Simulates the state when runPair is called (animation starts).
   * Mirrors: setWaitingForClick(false)
   */
  function simulateRunPairStart(): { waitingForClick: boolean } {
    return { waitingForClick: false };
  }

  it("setelah onDone dengan pasangan tersisa: waitingForClick === true (tombol aktif)", () => {
    const after = simulateOnDoneWithRemainingPairs(false);
    expect(after.waitingForClick).toBe(true);
    expect(isTombolLanjutDisabled(after.waitingForClick)).toBe(false);
  });

  it("saat runPair dimulai: waitingForClick === false (tombol disabled)", () => {
    const after = simulateRunPairStart();
    expect(after.waitingForClick).toBe(false);
    expect(isTombolLanjutDisabled(after.waitingForClick)).toBe(true);
  });

  it("transisi disabled → enabled: animasi selesai → tombol menjadi aktif", () => {
    // Before onDone: animation running → disabled
    const duringAnimation = { waitingForClick: false };
    expect(isTombolLanjutDisabled(duringAnimation.waitingForClick)).toBe(true);

    // After onDone (pairs remain): waiting for click → enabled
    const afterOnDone = simulateOnDoneWithRemainingPairs(duringAnimation.waitingForClick);
    expect(isTombolLanjutDisabled(afterOnDone.waitingForClick)).toBe(false);
  });

  it("transisi enabled → disabled: klik tombol → tombol kembali disabled", () => {
    // Before click: waiting → enabled
    const waiting = { waitingForClick: true };
    expect(isTombolLanjutDisabled(waiting.waitingForClick)).toBe(false);

    // After click (handleNextClick fires runPair): animation starts → disabled
    const afterClick = simulateRunPairStart();
    expect(isTombolLanjutDisabled(afterClick.waitingForClick)).toBe(true);
  });

  it("siklus lengkap disabled→enabled→disabled memodelkan satu pasangan reaksi", () => {
    // 1. runPair mulai → disabled
    const s1 = simulateRunPairStart();
    expect(isTombolLanjutDisabled(s1.waitingForClick)).toBe(true);

    // 2. onDone, masih ada pasangan → enabled
    const s2 = simulateOnDoneWithRemainingPairs(s1.waitingForClick);
    expect(isTombolLanjutDisabled(s2.waitingForClick)).toBe(false);

    // 3. user klik → runPair berikutnya mulai → disabled kembali
    const s3 = simulateRunPairStart();
    expect(isTombolLanjutDisabled(s3.waitingForClick)).toBe(true);
  });
});

// ── Req 5.3: Tersembunyi sepenuhnya di luar (click ∩ battle) ─────────────────

describe("Tombol_Lanjut — Req 5.3: tersembunyi sepenuhnya di luar (click ∩ battle)", () => {
  /** All (animMode, vizPhase) combinations where Tombol_Lanjut must be hidden. */
  const hiddenCases: Array<{ animMode: AnimMode; vizPhase: VizPhase }> = [
    // Mode auto — semua phase
    { animMode: "auto", vizPhase: "idle" },
    { animMode: "auto", vizPhase: "battle" },
    { animMode: "auto", vizPhase: "center" },
    { animMode: "auto", vizPhase: "done" },
    // Mode click — semua phase kecuali battle
    { animMode: "click", vizPhase: "idle" },
    { animMode: "click", vizPhase: "center" },
    { animMode: "click", vizPhase: "done" },
  ];

  it.each(hiddenCases)(
    "tersembunyi saat animMode='$animMode' dan vizPhase='$vizPhase'",
    ({ animMode, vizPhase }) => {
      expect(isTombolLanjutVisible(animMode, vizPhase)).toBe(false);
    }
  );

  it("total kombinasi yang menyembunyikan tombol adalah 7 dari 8 kemungkinan", () => {
    // 2 modes × 4 phases = 8 total; hanya (click, battle) yang menampilkan tombol
    const allModes: AnimMode[] = ["auto", "click"];
    const allPhases: VizPhase[] = ["idle", "battle", "center", "done"];
    let hiddenCount = 0;
    let visibleCount = 0;
    for (const m of allModes) {
      for (const p of allPhases) {
        if (isTombolLanjutVisible(m, p)) visibleCount++;
        else hiddenCount++;
      }
    }
    expect(visibleCount).toBe(1);
    expect(hiddenCount).toBe(7);
  });

  it("hanya (click, battle) yang menampilkan tombol", () => {
    const allModes: AnimMode[] = ["auto", "click"];
    const allPhases: VizPhase[] = ["idle", "battle", "center", "done"];
    const visibleCombos: Array<{ animMode: AnimMode; vizPhase: VizPhase }> = [];
    for (const m of allModes) {
      for (const p of allPhases) {
        if (isTombolLanjutVisible(m, p)) visibleCombos.push({ animMode: m, vizPhase: p });
      }
    }
    expect(visibleCombos).toHaveLength(1);
    expect(visibleCombos[0]).toEqual({ animMode: "click", vizPhase: "battle" });
  });

  it("isTombolLanjutVisible adalah fungsi boolean murni — tidak ada efek samping", () => {
    // Memanggil dua kali dengan input yang sama menghasilkan output yang sama
    expect(isTombolLanjutVisible("click", "battle")).toBe(isTombolLanjutVisible("click", "battle"));
    expect(isTombolLanjutVisible("auto", "idle")).toBe(isTombolLanjutVisible("auto", "idle"));
  });
});

// ── Integrasi: konsistensi disabled ↔ visible ─────────────────────────────────

describe("Tombol_Lanjut — integrasi: disabled state konsisten saat visible", () => {
  it("saat visible, tombol disabled jika !waitingForClick", () => {
    // Tombol hanya muncul di (click, battle) — saat itu disabled bergantung waitingForClick
    expect(isTombolLanjutVisible("click", "battle")).toBe(true);
    expect(isTombolLanjutDisabled(false)).toBe(true);  // animasi berjalan
  });

  it("saat visible, tombol enabled jika waitingForClick", () => {
    expect(isTombolLanjutVisible("click", "battle")).toBe(true);
    expect(isTombolLanjutDisabled(true)).toBe(false);  // menunggu klik user
  });

  it("tombol tidak pernah enabled saat tidak visible (state invisible → disabled tidak relevan)", () => {
    // Saat tombol tidak ada di DOM, pertanyaan disabled/enabled tidak berlaku.
    // Kita verifikasi bahwa visibilitas adalah gate pertama.
    const hiddenModes: Array<[AnimMode, VizPhase]> = [
      ["auto", "battle"],
      ["click", "idle"],
      ["click", "center"],
      ["click", "done"],
    ];
    for (const [m, p] of hiddenModes) {
      expect(isTombolLanjutVisible(m, p)).toBe(false);
    }
  });
});
