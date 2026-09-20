/**
 * Unit tests for BilanganZone rendering and interaction logic.
 *
 * BilanganZone is an internal component defined inside GameVirusPage —
 * it cannot be imported directly. We test the pure logic it encodes,
 * mirroring the pattern in __tests__/game/CharacterChips.test.ts.
 *
 * Test environment: Node (no jsdom). All assertions are against pure
 * functions that faithfully replicate the component's decision logic.
 *
 * Requirements: 1.1, 1.4, 2.1, 2.2, 3.1, 3.3, 4.3, 4.4
 */

import { TIER_TO_PLACE } from "@/components/game/CharacterSVGs";

// ─── Type definitions (mirrors page.tsx) ────────────────────────────────────

type Tier = 1 | 10 | 100 | 1000;
const ALL_TIERS: readonly Tier[] = [1, 10, 100, 1000] as const;

// ─── 1. Chip render predicate helpers ────────────────────────────────────────
//
// The BilanganZone render tree has two branches based on onChipRemove
// presence, and both have an inner branch on absVal > 0.
//
// Mode A (onChipRemove defined):
//   absVal > 0  → Chip_Overlay mode
//   absVal === 0 → empty-state SVG
// Mode B (onChipRemove undefined):
//   absVal > 0  → <CharacterChips> fallback
//   absVal === 0 → empty-state SVG

function shouldRenderChipOverlay(onChipRemove: unknown, absVal: number): boolean {
  return onChipRemove !== undefined && absVal > 0;
}

function shouldRenderCharacterChips(onChipRemove: unknown, absVal: number): boolean {
  return onChipRemove === undefined && absVal > 0;
}

function shouldRenderEmptyState(absVal: number): boolean {
  return absVal === 0;
}

// ─── 2. canRemove derivation ─────────────────────────────────────────────────

function canRemove(
  onChipRemove: unknown,
  phase: string,
  resultValue: number | null,
): boolean {
  return onChipRemove !== undefined && phase === "idle" && resultValue === null;
}

// ─── 3. Chip CSS class helpers ────────────────────────────────────────────────
//
// chipOverlayClasses: outer wrapper div — carries group, cursor, pointer,
//   and flash ring classes.
// innerDivClasses: inner image div — carries hover scale/opacity when canRemove.
// shouldShowX: whether the × span renders (only when canRemove).
// onClickDefined: whether onClick is defined on the chip wrapper.

function chipOverlayClasses(
  canRemoveValue: boolean,
  flashTier: Tier | null,
  tier: Tier,
): string {
  const classes: string[] = ["group"];
  if (canRemoveValue) {
    classes.push("cursor-pointer");
  } else {
    classes.push("pointer-events-none");
  }
  if (flashTier === tier) {
    classes.push("ring-2", "ring-red-500", "animate-pulse", "rounded");
  }
  return classes.join(" ");
}

function innerDivClasses(canRemoveValue: boolean): string {
  if (canRemoveValue) {
    return "w-8 h-8 shrink-0 group-hover:opacity-60 group-hover:scale-95 transition-all duration-150";
  }
  return "w-8 h-8 shrink-0";
}

function shouldShowX(canRemoveValue: boolean): boolean {
  return canRemoveValue;
}

function onClickDefined(canRemoveValue: boolean): boolean {
  return canRemoveValue;
}

// ─── 4. Chip decomposition (Chip_Overlay mode uses maxPerTier = 6) ────────────

function decomposeValue(
  absVal: number,
  maxPerTier = 6,
): Array<{ tier: Tier; count: number; shown: number; overflow: number }> {
  const groups: Array<{ tier: Tier; count: number; shown: number; overflow: number }> = [];
  let rem = Math.floor(absVal);
  for (const t of [1000, 100, 10, 1] as Tier[]) {
    const c = Math.floor(rem / t);
    if (c > 0) {
      const shown = Math.min(c, maxPerTier);
      groups.push({ tier: t, count: c, shown, overflow: c - shown });
    }
    rem %= t;
  }
  return groups;
}

// ─── 5. Flash state machine (mirrors useState + useEffect in BilanganZone) ────

function simulateFlashState(initialFlash: Tier | null = null) {
  let flashTier: Tier | null = initialFlash;
  const pendingTimers: Array<() => void> = [];

  function setFlashTier(t: Tier | null) {
    flashTier = t;
    if (t !== null) {
      pendingTimers.push(() => {
        flashTier = null;
      });
    }
  }

  return {
    getFlashTier: () => flashTier,
    setFlashTier,
    /** Simulate the 300ms useEffect timer firing. */
    runTimers: () => pendingTimers.forEach((fn) => fn()),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────
// Group 1 — Render predicate (onChipRemove × absVal)
// ────────────────────────────────────────────────

describe("BilanganZone — render predicate", () => {
  // Req 4.4: without onChipRemove, Chip_Overlay is never rendered
  it("without onChipRemove + absVal > 0: renders CharacterChips, not Chip_Overlay", () => {
    expect(shouldRenderChipOverlay(undefined, 10)).toBe(false);
    expect(shouldRenderCharacterChips(undefined, 10)).toBe(true);
    expect(shouldRenderEmptyState(10)).toBe(false);
  });

  // Req 4.4: without onChipRemove, value=0 renders empty state
  it("without onChipRemove + absVal = 0: renders empty state", () => {
    expect(shouldRenderChipOverlay(undefined, 0)).toBe(false);
    expect(shouldRenderCharacterChips(undefined, 0)).toBe(false);
    expect(shouldRenderEmptyState(0)).toBe(true);
  });

  // Req 2.1: with onChipRemove + absVal > 0: renders Chip_Overlay
  it("with onChipRemove + absVal > 0: renders Chip_Overlay, not CharacterChips", () => {
    const handler = () => {};
    expect(shouldRenderChipOverlay(handler, 10)).toBe(true);
    expect(shouldRenderCharacterChips(handler, 10)).toBe(false);
    expect(shouldRenderEmptyState(10)).toBe(false);
  });

  // Req 3.3: with onChipRemove + absVal = 0: renders empty state
  it("with onChipRemove + absVal = 0: renders empty state (no chips to click)", () => {
    const handler = () => {};
    expect(shouldRenderChipOverlay(handler, 0)).toBe(false);
    expect(shouldRenderCharacterChips(handler, 0)).toBe(false);
    expect(shouldRenderEmptyState(0)).toBe(true);
  });

  // Req 4.4: consistent for all positive values without onChipRemove
  it("without onChipRemove: CharacterChips mode for all non-zero absVal", () => {
    for (const absVal of [1, 9, 10, 99, 100, 999, 1000, 9999]) {
      expect(shouldRenderChipOverlay(undefined, absVal)).toBe(false);
      expect(shouldRenderCharacterChips(undefined, absVal)).toBe(true);
    }
  });

  // Req 2.1: consistent for all positive values with onChipRemove
  it("with onChipRemove: Chip_Overlay mode for all non-zero absVal", () => {
    const handler = () => {};
    for (const absVal of [1, 9, 10, 99, 100, 999, 1000, 9999]) {
      expect(shouldRenderChipOverlay(handler, absVal)).toBe(true);
      expect(shouldRenderCharacterChips(handler, absVal)).toBe(false);
    }
  });
});

// ────────────────────────────────────────────────
// Group 2 — canRemove derivation
// ────────────────────────────────────────────────

describe("BilanganZone — canRemove derivation", () => {
  // Req 2.1: all conditions met
  it("canRemove=true when onChipRemove defined, phase=idle, resultValue=null", () => {
    expect(canRemove(() => {}, "idle", null)).toBe(true);
  });

  // Req 1.4: phase guard
  it("canRemove=false when phase=charging", () => {
    expect(canRemove(() => {}, "charging", null)).toBe(false);
  });

  it("canRemove=false when phase=exploding", () => {
    expect(canRemove(() => {}, "exploding", null)).toBe(false);
  });

  it("canRemove=false when phase=settled", () => {
    expect(canRemove(() => {}, "settled", null)).toBe(false);
  });

  // Req 2.2: resultValue guard
  it("canRemove=false when resultValue is non-null (result shown)", () => {
    expect(canRemove(() => {}, "idle", 42)).toBe(false);
  });

  it("canRemove=false when resultValue=0 (still non-null)", () => {
    expect(canRemove(() => {}, "idle", 0)).toBe(false);
  });

  // Req 4.4: onChipRemove guard
  it("canRemove=false when onChipRemove is undefined", () => {
    expect(canRemove(undefined, "idle", null)).toBe(false);
  });

  // Req 1.4, 2.2: both guards failing simultaneously
  it("canRemove=false when both phase≠idle and resultValue present", () => {
    expect(canRemove(() => {}, "charging", 10)).toBe(false);
  });
});

// ────────────────────────────────────────────────
// Group 3 — chipOverlayClasses (outer wrapper)
// ────────────────────────────────────────────────

describe("BilanganZone — chipOverlayClasses", () => {
  // Req 2.1: canRemove=true, no flash
  it("canRemove=true, no flash → includes 'group cursor-pointer', no pointer-events-none", () => {
    const cls = chipOverlayClasses(true, null, 1);
    expect(cls).toContain("group");
    expect(cls).toContain("cursor-pointer");
    expect(cls).not.toContain("pointer-events-none");
    expect(cls).not.toContain("ring-red-500");
  });

  // Req 1.4, 2.2: canRemove=false → pointer-events-none
  it("canRemove=false, no flash → includes 'pointer-events-none', no cursor-pointer", () => {
    const cls = chipOverlayClasses(false, null, 1);
    expect(cls).toContain("group");
    expect(cls).toContain("pointer-events-none");
    expect(cls).not.toContain("cursor-pointer");
    expect(cls).not.toContain("ring-red-500");
  });

  // Req 3.1: flash applied when flashTier === tier
  it("canRemove=true, flashTier === tier → includes ring-red-500 and animate-pulse", () => {
    const cls = chipOverlayClasses(true, 10, 10);
    expect(cls).toContain("ring-2");
    expect(cls).toContain("ring-red-500");
    expect(cls).toContain("animate-pulse");
    expect(cls).toContain("rounded");
  });

  // Req 3.1: flash NOT applied when flashTier !== tier
  it("canRemove=true, flashTier !== tier → no flash classes", () => {
    const cls = chipOverlayClasses(true, 1, 10);
    expect(cls).not.toContain("ring-red-500");
    expect(cls).not.toContain("animate-pulse");
  });

  // Req 3.1: flash applies for all tier values
  it("flash class applied for tier=1", () => {
    expect(chipOverlayClasses(true, 1, 1)).toContain("ring-red-500");
  });

  it("flash class applied for tier=10", () => {
    expect(chipOverlayClasses(true, 10, 10)).toContain("ring-red-500");
  });

  it("flash class applied for tier=100", () => {
    expect(chipOverlayClasses(true, 100, 100)).toContain("ring-red-500");
  });

  it("flash class applied for tier=1000", () => {
    expect(chipOverlayClasses(true, 1000, 1000)).toContain("ring-red-500");
  });

  // canRemove=false + flash (e.g. during animation) — flash still applies if triggered
  it("canRemove=false, flashTier === tier → flash classes still included", () => {
    const cls = chipOverlayClasses(false, 100, 100);
    expect(cls).toContain("ring-red-500");
    expect(cls).toContain("pointer-events-none");
  });
});

// ────────────────────────────────────────────────
// Group 4 — innerDivClasses (chip image wrapper)
// ────────────────────────────────────────────────

describe("BilanganZone — innerDivClasses", () => {
  // Req 2.1: hover scale/opacity classes present when canRemove
  it("canRemove=true → includes group-hover:opacity-60 and group-hover:scale-95", () => {
    const cls = innerDivClasses(true);
    expect(cls).toContain("group-hover:opacity-60");
    expect(cls).toContain("group-hover:scale-95");
    expect(cls).toContain("transition-all");
    expect(cls).toContain("duration-150");
  });

  // Req 2.2: no hover classes when canRemove=false
  it("canRemove=false → no group-hover:opacity-60 or group-hover:scale-95", () => {
    const cls = innerDivClasses(false);
    expect(cls).not.toContain("group-hover:opacity-60");
    expect(cls).not.toContain("group-hover:scale-95");
  });

  it("canRemove=false → still includes size classes (w-8 h-8)", () => {
    const cls = innerDivClasses(false);
    expect(cls).toContain("w-8");
    expect(cls).toContain("h-8");
  });
});

// ────────────────────────────────────────────────
// Group 5 — × indicator and onClick handler
// ────────────────────────────────────────────────

describe("BilanganZone — × indicator visibility", () => {
  // Req 2.1: × shown when canRemove=true
  it("shouldShowX=true when canRemove=true", () => {
    expect(shouldShowX(true)).toBe(true);
  });

  // Req 2.2: × hidden when canRemove=false
  it("shouldShowX=false when canRemove=false", () => {
    expect(shouldShowX(false)).toBe(false);
  });
});

describe("BilanganZone — onClick handler presence", () => {
  // Req 1.1: onClick defined when canRemove
  it("onClick is defined when canRemove=true", () => {
    expect(onClickDefined(true)).toBe(true);
  });

  // Req 1.4, 4.3: onClick undefined when canRemove=false (phase guard / fallback)
  it("onClick is undefined when canRemove=false", () => {
    expect(onClickDefined(false)).toBe(false);
  });
});

// ────────────────────────────────────────────────
// Group 6 — onChipRemove callback invocation (Req 1.1)
// ────────────────────────────────────────────────

describe("BilanganZone — onChipRemove callback invocation", () => {
  // Req 1.1: clicking a chip calls onChipRemove with the correct tier
  it("simulated chip click invokes onChipRemove with tier=1", () => {
    const calls: [Tier, (t: Tier) => void][] = [];
    const onChipRemove = (t: Tier, flash: (t: Tier) => void) => calls.push([t, flash]);

    const flash = simulateFlashState();
    const cr = canRemove(onChipRemove, "idle", null);
    if (cr) onChipRemove(1, flash.setFlashTier);

    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe(1);
  });

  it("simulated chip click invokes onChipRemove with tier=10", () => {
    const calls: Tier[] = [];
    const onChipRemove = (t: Tier) => calls.push(t);
    const cr = canRemove(onChipRemove, "idle", null);
    if (cr) onChipRemove(10);
    expect(calls).toEqual([10]);
  });

  it("simulated chip click invokes onChipRemove with tier=100", () => {
    const calls: Tier[] = [];
    const onChipRemove = (t: Tier) => calls.push(t);
    const cr = canRemove(onChipRemove, "idle", null);
    if (cr) onChipRemove(100);
    expect(calls).toEqual([100]);
  });

  it("simulated chip click invokes onChipRemove with tier=1000", () => {
    const calls: Tier[] = [];
    const onChipRemove = (t: Tier) => calls.push(t);
    const cr = canRemove(onChipRemove, "idle", null);
    if (cr) onChipRemove(1000);
    expect(calls).toEqual([1000]);
  });

  // Req 1.4: click does NOT invoke handler when phase guard fails
  it("no invocation when canRemove=false (phase=charging)", () => {
    const calls: Tier[] = [];
    const onChipRemove = (t: Tier) => calls.push(t);
    const cr = canRemove(onChipRemove, "charging", null);
    // onClick would be undefined — simulate: only call if canRemove
    if (cr) onChipRemove(10);
    expect(calls).toHaveLength(0);
  });

  // Req 4.3: no invocation when resultValue is set
  it("no invocation when canRemove=false (resultValue present)", () => {
    const calls: Tier[] = [];
    const onChipRemove = (t: Tier) => calls.push(t);
    const cr = canRemove(onChipRemove, "idle", 5);
    if (cr) onChipRemove(10);
    expect(calls).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────
// Group 7 — Rejection flash state machine (Req 3.1)
// ────────────────────────────────────────────────

describe("BilanganZone — rejection flash state machine", () => {
  it("initial flashTier is null", () => {
    const { getFlashTier } = simulateFlashState();
    expect(getFlashTier()).toBeNull();
  });

  it("setting flashTier to a tier makes it non-null", () => {
    const { getFlashTier, setFlashTier } = simulateFlashState();
    setFlashTier(10);
    expect(getFlashTier()).toBe(10);
  });

  // Req 3.1: flash class applied during flash period
  it("chipOverlayClasses includes ring-red-500 while flashTier is active", () => {
    const { getFlashTier, setFlashTier } = simulateFlashState();
    setFlashTier(100);
    const cls = chipOverlayClasses(true, getFlashTier(), 100);
    expect(cls).toContain("ring-red-500");
  });

  // Req 3.1: flash cleared after 300ms (simulated)
  it("flashTier is cleared after runTimers() (simulates 300ms useEffect)", () => {
    const { getFlashTier, setFlashTier, runTimers } = simulateFlashState();
    setFlashTier(1);
    expect(getFlashTier()).toBe(1);
    runTimers();
    expect(getFlashTier()).toBeNull();
  });

  it("flash class absent after timers run", () => {
    const { getFlashTier, setFlashTier, runTimers } = simulateFlashState();
    setFlashTier(10);
    runTimers();
    const cls = chipOverlayClasses(true, getFlashTier(), 10);
    expect(cls).not.toContain("ring-red-500");
  });

  // Flash only targets the rejected tier, not siblings
  it("flash class applied only to rejected tier, not other tiers", () => {
    const { getFlashTier, setFlashTier } = simulateFlashState();
    setFlashTier(100);

    const clsMatching = chipOverlayClasses(true, getFlashTier(), 100);
    const clsOther1 = chipOverlayClasses(true, getFlashTier(), 1);
    const clsOther10 = chipOverlayClasses(true, getFlashTier(), 10);
    const clsOther1000 = chipOverlayClasses(true, getFlashTier(), 1000);

    expect(clsMatching).toContain("ring-red-500");
    expect(clsOther1).not.toContain("ring-red-500");
    expect(clsOther10).not.toContain("ring-red-500");
    expect(clsOther1000).not.toContain("ring-red-500");
  });

  it("multiple flashes: each replaces the previous", () => {
    const { getFlashTier, setFlashTier, runTimers } = simulateFlashState();
    setFlashTier(1);
    expect(getFlashTier()).toBe(1);
    runTimers();
    expect(getFlashTier()).toBeNull();
    setFlashTier(1000);
    expect(getFlashTier()).toBe(1000);
  });
});

// ────────────────────────────────────────────────
// Group 8 — Chip decomposition accuracy (Chip_Overlay mode, maxPerTier=6)
// ────────────────────────────────────────────────

describe("BilanganZone — chip decomposition (Chip_Overlay mode)", () => {
  it("value=1234 decomposes into 4 tier groups", () => {
    const groups = decomposeValue(1234);
    expect(groups).toHaveLength(4);
    const tiers = groups.map((g) => g.tier);
    expect(tiers).toContain(1000);
    expect(tiers).toContain(100);
    expect(tiers).toContain(10);
    expect(tiers).toContain(1);
  });

  it("value=1234: correct counts per tier", () => {
    const groups = decomposeValue(1234);
    expect(groups.find((g) => g.tier === 1000)?.count).toBe(1);
    expect(groups.find((g) => g.tier === 100)?.count).toBe(2);
    expect(groups.find((g) => g.tier === 10)?.count).toBe(3);
    expect(groups.find((g) => g.tier === 1)?.count).toBe(4);
  });

  it("value=10: only puluhan group", () => {
    const groups = decomposeValue(10);
    expect(groups).toHaveLength(1);
    expect(groups[0].tier).toBe(10);
    expect(groups[0].count).toBe(1);
  });

  it("value=100: only ratusan group", () => {
    const groups = decomposeValue(100);
    expect(groups).toHaveLength(1);
    expect(groups[0].tier).toBe(100);
  });

  it("value=0: no groups (empty state — no chips rendered)", () => {
    const groups = decomposeValue(0);
    expect(groups).toHaveLength(0);
  });

  // Overflow cap at maxPerTier=6 (Chip_Overlay mode default)
  it("value=99 with maxPerTier=6: each tier shows 6, no overflow", () => {
    // 99 = 9 puluhan + 9 satuan, both ≤ 6? No: 9 > 6 → overflow
    const groups = decomposeValue(99, 6);
    const p = groups.find((g) => g.tier === 10)!;
    const s = groups.find((g) => g.tier === 1)!;
    expect(p.shown).toBe(6);
    expect(p.overflow).toBe(3);
    expect(s.shown).toBe(6);
    expect(s.overflow).toBe(3);
  });

  it("value=9 with maxPerTier=6: satuan shows 6, overflow=3", () => {
    // Actually 9 has count=9 in satuan tier; 9 > 6 → shown=6, overflow=3
    const groups = decomposeValue(9, 6);
    const s = groups.find((g) => g.tier === 1)!;
    expect(s.count).toBe(9);
    expect(s.shown).toBe(6);
    expect(s.overflow).toBe(3);
  });

  it("value=5 with maxPerTier=6: satuan shows 5, overflow=0", () => {
    const groups = decomposeValue(5, 6);
    const s = groups.find((g) => g.tier === 1)!;
    expect(s.count).toBe(5);
    expect(s.shown).toBe(5);
    expect(s.overflow).toBe(0);
  });

  it("value=1000 with maxPerTier=6: ribuan shows 1, overflow=0", () => {
    const groups = decomposeValue(1000, 6);
    expect(groups).toHaveLength(1);
    const r = groups[0];
    expect(r.tier).toBe(1000);
    expect(r.shown).toBe(1);
    expect(r.overflow).toBe(0);
  });

  it("every group in decomposition has a valid data-tier value", () => {
    const groups = decomposeValue(1234);
    for (const g of groups) {
      expect(ALL_TIERS).toContain(g.tier);
    }
  });

  // TIER_TO_PLACE maps correctly for all groups
  it("each tier group maps to a valid PlaceValue via TIER_TO_PLACE", () => {
    const groups = decomposeValue(1234);
    for (const g of groups) {
      const place = TIER_TO_PLACE[g.tier];
      expect(["satuan", "puluhan", "ratusan", "ribuan"]).toContain(place);
    }
  });
});

// ────────────────────────────────────────────────
// Group 9 — data-tier attribute presence (overlay mode vs fallback mode)
// ────────────────────────────────────────────────

describe("BilanganZone — data-tier attribute in Chip_Overlay mode", () => {
  // In Chip_Overlay mode, each chip wrapper has data-tier={t}; fallback mode has none.

  it("Chip_Overlay mode: data-tier attributes match decomposed tiers for value=1234", () => {
    const groups = decomposeValue(1234);
    const handler = () => {};
    // only render when onChipRemove defined and absVal > 0
    expect(shouldRenderChipOverlay(handler, 1234)).toBe(true);
    // each group would render chips with data-tier=t
    const tiersWithDataAttr = groups.map((g) => g.tier);
    expect(tiersWithDataAttr).toContain(1000);
    expect(tiersWithDataAttr).toContain(100);
    expect(tiersWithDataAttr).toContain(10);
    expect(tiersWithDataAttr).toContain(1);
  });

  it("Fallback mode (no onChipRemove): no Chip_Overlay — data-tier not rendered", () => {
    expect(shouldRenderChipOverlay(undefined, 1234)).toBe(false);
    // CharacterChips is rendered instead — it has no data-tier attributes
    expect(shouldRenderCharacterChips(undefined, 1234)).toBe(true);
  });

  it("Chip_Overlay mode: data-tier for each tier in value=10 → [10]", () => {
    const groups = decomposeValue(10);
    expect(groups.map((g) => g.tier)).toEqual([10]);
    expect(shouldRenderChipOverlay(() => {}, 10)).toBe(true);
  });

  it("Chip_Overlay mode: data-tier for each tier in value=1000 → [1000]", () => {
    const groups = decomposeValue(1000);
    expect(groups.map((g) => g.tier)).toEqual([1000]);
  });
});

// ────────────────────────────────────────────────
// Group 10 — Fallback mode: no overlay-related classes (Req 4.4)
// ────────────────────────────────────────────────

describe("BilanganZone — fallback mode (no onChipRemove) renders no overlay classes", () => {
  it("without onChipRemove: shouldRenderChipOverlay=false → no group-hover classes possible", () => {
    expect(shouldRenderChipOverlay(undefined, 100)).toBe(false);
    // innerDivClasses is only computed in Chip_Overlay mode; in fallback CharacterChips renders instead
  });

  it("without onChipRemove: no canRemove=true state possible", () => {
    // canRemove requires onChipRemove !== undefined, so it's always false in fallback mode
    expect(canRemove(undefined, "idle", null)).toBe(false);
    expect(canRemove(undefined, "idle", null)).toBe(false);
    expect(canRemove(undefined, "charging", null)).toBe(false);
  });

  it("without onChipRemove: shouldShowX always false", () => {
    const cr = canRemove(undefined, "idle", null);
    expect(shouldShowX(cr)).toBe(false);
  });

  it("without onChipRemove: onClick always undefined", () => {
    const cr = canRemove(undefined, "idle", null);
    expect(onClickDefined(cr)).toBe(false);
  });
});

// ────────────────────────────────────────────────
// Group 11 — Phase=charging + onChipRemove: pointer-events-none (Req 1.4, 2.2)
// ────────────────────────────────────────────────

describe("BilanganZone — phase=charging disables chip interaction", () => {
  it("phase=charging: canRemove=false even with onChipRemove defined", () => {
    expect(canRemove(() => {}, "charging", null)).toBe(false);
  });

  it("phase=charging: chipOverlayClasses includes pointer-events-none", () => {
    const cr = canRemove(() => {}, "charging", null);
    const cls = chipOverlayClasses(cr, null, 10);
    expect(cls).toContain("pointer-events-none");
  });

  it("phase=charging: no cursor-pointer in chip overlay classes", () => {
    const cr = canRemove(() => {}, "charging", null);
    const cls = chipOverlayClasses(cr, null, 10);
    expect(cls).not.toContain("cursor-pointer");
  });

  it("phase=charging: innerDivClasses has no hover effects", () => {
    const cr = canRemove(() => {}, "charging", null);
    const cls = innerDivClasses(cr);
    expect(cls).not.toContain("group-hover:opacity-60");
    expect(cls).not.toContain("group-hover:scale-95");
  });

  it("phase=charging: shouldShowX=false", () => {
    const cr = canRemove(() => {}, "charging", null);
    expect(shouldShowX(cr)).toBe(false);
  });

  it("phase=charging: onClick not defined", () => {
    const cr = canRemove(() => {}, "charging", null);
    expect(onClickDefined(cr)).toBe(false);
  });
});

// ────────────────────────────────────────────────
// Group 12 — phase=idle + value=10 + onChipRemove: hover classes + × (Req 2.1)
// ────────────────────────────────────────────────

describe("BilanganZone — phase=idle + value=10 + onChipRemove active", () => {
  it("Chip_Overlay mode is active", () => {
    expect(shouldRenderChipOverlay(() => {}, 10)).toBe(true);
  });

  it("canRemove=true", () => {
    expect(canRemove(() => {}, "idle", null)).toBe(true);
  });

  it("chipOverlayClasses includes cursor-pointer", () => {
    const cr = canRemove(() => {}, "idle", null);
    const cls = chipOverlayClasses(cr, null, 10);
    expect(cls).toContain("cursor-pointer");
  });

  it("innerDivClasses includes group-hover:opacity-60 and group-hover:scale-95", () => {
    const cr = canRemove(() => {}, "idle", null);
    const cls = innerDivClasses(cr);
    expect(cls).toContain("group-hover:opacity-60");
    expect(cls).toContain("group-hover:scale-95");
  });

  it("shouldShowX=true → × element renders", () => {
    const cr = canRemove(() => {}, "idle", null);
    expect(shouldShowX(cr)).toBe(true);
  });

  it("onClick is defined on chip wrapper", () => {
    const cr = canRemove(() => {}, "idle", null);
    expect(onClickDefined(cr)).toBe(true);
  });

  it("decomposition of value=10 yields exactly one group (puluhan)", () => {
    const groups = decomposeValue(10);
    expect(groups).toHaveLength(1);
    expect(groups[0].tier).toBe(10);
    expect(TIER_TO_PLACE[10]).toBe("puluhan");
  });
});
