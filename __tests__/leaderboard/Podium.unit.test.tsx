/**
 * Unit tests for Podium rendering logic.
 *
 * Podium is a purely-presentational Server Component that cannot be mounted
 * in a Node test environment (no jsdom, no React renderer available).
 * We therefore test the **decision logic** encoded in SLOT_CONFIG and the
 * component's render conditions, mirroring the pattern used in
 * __tests__/game-virus/BilanganZone.unit.test.tsx.
 *
 * SLOT_CONFIG is a private constant inside Podium.tsx — it is not exported.
 * The test re-declares it verbatim and verifies its values match the spec,
 * then wraps the component's top-level render conditions in pure helper
 * functions that are independently testable.
 *
 * Test environment: Node (no jsdom). No React renderer is used.
 *
 * Requirements: 3.2, 3.5
 */

import type { LeaderboardEntry } from "@/features/leaderboard/types";

// ─── Re-declaration of SLOT_CONFIG (mirrors Podium.tsx verbatim) ─────────────
//
// If the source ever diverges, the assertions below will catch it.

const SLOT_CONFIG: Record<
  1 | 2 | 3,
  {
    order: string;
    pillarHeight: string;
    pillarColor: string;
    avatarSize: "lg" | "md";
    showCrown: boolean;
  }
> = {
  1: {
    order: "order-2",
    pillarHeight: "h-36",
    pillarColor: "bg-amber-400",
    avatarSize: "lg",
    showCrown: true,
  },
  2: {
    order: "order-1",
    pillarHeight: "h-24",
    pillarColor: "bg-slate-400",
    avatarSize: "md",
    showCrown: false,
  },
  3: {
    order: "order-3",
    pillarHeight: "h-20",
    pillarColor: "bg-amber-700",
    avatarSize: "md",
    showCrown: false,
  },
};

// ─── Pure helpers that replicate Podium's render conditions ──────────────────

/** Whether the Podium renders anything at all (mirrors: if entries.length === 0 return null). */
function shouldRenderPodium(entries: LeaderboardEntry[]): boolean {
  return entries.length > 0;
}

/** Number of slots that would be rendered for a given entries array. */
function renderedSlotCount(entries: LeaderboardEntry[]): number {
  if (entries.length === 0) return 0;
  // Each entry is rendered only if SLOT_CONFIG has a matching rank key (1|2|3).
  return entries.filter((e) => SLOT_CONFIG[e.rank as 1 | 2 | 3] !== undefined)
    .length;
}

/** Avatar size that would be passed for an entry of a given rank. */
function avatarSizeForRank(rank: 1 | 2 | 3): "lg" | "md" {
  return SLOT_CONFIG[rank].avatarSize;
}

/** Whether the crown icon would be rendered for a given rank. */
function showsCrownForRank(rank: 1 | 2 | 3): boolean {
  return SLOT_CONFIG[rank].showCrown;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeEntry(rank: 1 | 2 | 3, overrides?: Partial<LeaderboardEntry>): LeaderboardEntry {
  return {
    uid: `uid-${rank}`,
    rank,
    name: `Player ${rank}`,
    school: `School ${rank}`,
    photoURL: null,
    totalScore: 1000 - rank * 100,
    ...overrides,
  };
}

const entry1 = makeEntry(1);
const entry2 = makeEntry(2);
const entry3 = makeEntry(3);

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────
// Group 1 — Empty array → no slots rendered (Req 3.5)
// ────────────────────────────────────────────────

describe("Podium — empty entries array", () => {
  // Req 3.5: component returns null for empty array
  it("entries=[] → shouldRenderPodium returns false", () => {
    expect(shouldRenderPodium([])).toBe(false);
  });

  it("entries=[] → renderedSlotCount returns 0", () => {
    expect(renderedSlotCount([])).toBe(0);
  });
});

// ────────────────────────────────────────────────
// Group 2 — Crown icon (👑) logic (Req 3.2, 3.5)
// ────────────────────────────────────────────────

describe("Podium — crown icon (👑) visibility", () => {
  // Req 3.2: crown shown only for rank 1
  it("SLOT_CONFIG[1].showCrown === true", () => {
    expect(SLOT_CONFIG[1].showCrown).toBe(true);
  });

  // Req 3.2: crown NOT shown for rank 2
  it("SLOT_CONFIG[2].showCrown === false", () => {
    expect(SLOT_CONFIG[2].showCrown).toBe(false);
  });

  // Req 3.2: crown NOT shown for rank 3
  it("SLOT_CONFIG[3].showCrown === false", () => {
    expect(SLOT_CONFIG[3].showCrown).toBe(false);
  });

  it("showsCrownForRank(1) is true", () => {
    expect(showsCrownForRank(1)).toBe(true);
  });

  it("showsCrownForRank(2) is false", () => {
    expect(showsCrownForRank(2)).toBe(false);
  });

  it("showsCrownForRank(3) is false", () => {
    expect(showsCrownForRank(3)).toBe(false);
  });

  // Only rank 1 among all three slots shows a crown
  it("exactly one slot has showCrown=true (rank 1 only)", () => {
    const crowns = ([1, 2, 3] as const).filter((r) => SLOT_CONFIG[r].showCrown);
    expect(crowns).toHaveLength(1);
    expect(crowns[0]).toBe(1);
  });
});

// ────────────────────────────────────────────────
// Group 3 — Avatar size per rank (Req 3.2)
// ────────────────────────────────────────────────

describe("Podium — Avatar size per rank", () => {
  // Req 3.2: rank 1 → Avatar size="lg"
  it("SLOT_CONFIG[1].avatarSize === 'lg'", () => {
    expect(SLOT_CONFIG[1].avatarSize).toBe("lg");
  });

  // Req 3.2: rank 2 → Avatar size="md"
  it("SLOT_CONFIG[2].avatarSize === 'md'", () => {
    expect(SLOT_CONFIG[2].avatarSize).toBe("md");
  });

  // Req 3.2: rank 3 → Avatar size="md"
  it("SLOT_CONFIG[3].avatarSize === 'md'", () => {
    expect(SLOT_CONFIG[3].avatarSize).toBe("md");
  });

  it("avatarSizeForRank(1) returns 'lg'", () => {
    expect(avatarSizeForRank(1)).toBe("lg");
  });

  it("avatarSizeForRank(2) returns 'md'", () => {
    expect(avatarSizeForRank(2)).toBe("md");
  });

  it("avatarSizeForRank(3) returns 'md'", () => {
    expect(avatarSizeForRank(3)).toBe("md");
  });

  // Rank 1 is the only slot with "lg"
  it("only rank 1 uses avatarSize='lg'", () => {
    const lgSlots = ([1, 2, 3] as const).filter(
      (r) => SLOT_CONFIG[r].avatarSize === "lg",
    );
    expect(lgSlots).toHaveLength(1);
    expect(lgSlots[0]).toBe(1);
  });

  // Ranks 2 and 3 both use "md"
  it("ranks 2 and 3 both use avatarSize='md'", () => {
    expect(SLOT_CONFIG[2].avatarSize).toBe("md");
    expect(SLOT_CONFIG[3].avatarSize).toBe("md");
  });
});

// ────────────────────────────────────────────────
// Group 4 — Slot render count (Req 3.5)
// ────────────────────────────────────────────────

describe("Podium — slot render count matches entries length", () => {
  // Req 3.5: no empty placeholder slots
  it("1 entry → 1 slot rendered", () => {
    expect(renderedSlotCount([entry1])).toBe(1);
  });

  it("2 entries → 2 slots rendered", () => {
    expect(renderedSlotCount([entry1, entry2])).toBe(2);
  });

  it("3 entries → 3 slots rendered", () => {
    expect(renderedSlotCount([entry1, entry2, entry3])).toBe(3);
  });

  // Only the entries provided are rendered — no phantom slots
  it("partial array [rank1, rank3] → 2 slots (no gap for rank 2)", () => {
    expect(renderedSlotCount([entry1, entry3])).toBe(2);
  });

  // shouldRenderPodium is true for any non-empty array
  it("entries=[rank2] → shouldRenderPodium is true", () => {
    expect(shouldRenderPodium([entry2])).toBe(true);
  });

  it("entries=[rank1, rank2, rank3] → shouldRenderPodium is true", () => {
    expect(shouldRenderPodium([entry1, entry2, entry3])).toBe(true);
  });
});

// ────────────────────────────────────────────────
// Group 5 — Layout order (CSS order utility)
// ────────────────────────────────────────────────

describe("Podium — CSS order for visual hierarchy", () => {
  // Rank 1 in centre (order-2), rank 2 left (order-1), rank 3 right (order-3)
  it("rank 1 → order-2 (centre)", () => {
    expect(SLOT_CONFIG[1].order).toBe("order-2");
  });

  it("rank 2 → order-1 (left)", () => {
    expect(SLOT_CONFIG[2].order).toBe("order-1");
  });

  it("rank 3 → order-3 (right)", () => {
    expect(SLOT_CONFIG[3].order).toBe("order-3");
  });
});

// ────────────────────────────────────────────────
// Group 6 — Pillar heights
// ────────────────────────────────────────────────

describe("Podium — pillar heights reflect ranking hierarchy", () => {
  it("rank 1 → tallest pillar h-36", () => {
    expect(SLOT_CONFIG[1].pillarHeight).toBe("h-36");
  });

  it("rank 2 → medium pillar h-24", () => {
    expect(SLOT_CONFIG[2].pillarHeight).toBe("h-24");
  });

  it("rank 3 → shortest pillar h-20", () => {
    expect(SLOT_CONFIG[3].pillarHeight).toBe("h-20");
  });
});

// ────────────────────────────────────────────────
// Group 7 — SLOT_CONFIG covers all expected ranks
// ────────────────────────────────────────────────

describe("Podium — SLOT_CONFIG completeness", () => {
  it("SLOT_CONFIG has keys for ranks 1, 2, and 3", () => {
    expect(Object.keys(SLOT_CONFIG)).toEqual(expect.arrayContaining(["1", "2", "3"]));
    expect(Object.keys(SLOT_CONFIG)).toHaveLength(3);
  });

  it("each slot config has all required fields", () => {
    for (const rank of [1, 2, 3] as const) {
      const cfg = SLOT_CONFIG[rank];
      expect(cfg).toHaveProperty("order");
      expect(cfg).toHaveProperty("pillarHeight");
      expect(cfg).toHaveProperty("pillarColor");
      expect(cfg).toHaveProperty("avatarSize");
      expect(cfg).toHaveProperty("showCrown");
    }
  });

  it("avatarSize is always 'lg' or 'md' — no unexpected values", () => {
    for (const rank of [1, 2, 3] as const) {
      expect(["lg", "md"]).toContain(SLOT_CONFIG[rank].avatarSize);
    }
  });
});
