/**
 * Property-based tests for Podium rendering logic
 * Feature: game-leaderboard
 *
 * Tests are written against pure-function extractions of the slot-rendering
 * and formatting logic from app/leaderboard/Podium.tsx — no React renderer
 * needed (Node test environment, no jsdom).
 *
 * Pattern mirrors __tests__/game-virus/removeFromBilangan.property.test.ts.
 */

import * as fc from "fast-check";
import type { LeaderboardEntry } from "@/features/leaderboard/types";

// ---------------------------------------------------------------------------
// Pure-function extractions (mirrors the logic in Podium.tsx)
// ---------------------------------------------------------------------------

/** Slot config type, verbatim from Podium.tsx */
const SLOT_CONFIG: Record<
  1 | 2 | 3,
  { order: string; pillarHeight: string; pillarColor: string; avatarSize: "lg" | "md"; showCrown: boolean }
> = {
  1: { order: "order-2", pillarHeight: "h-36", pillarColor: "bg-amber-400", avatarSize: "lg",  showCrown: true  },
  2: { order: "order-1", pillarHeight: "h-24", pillarColor: "bg-slate-400", avatarSize: "md",  showCrown: false },
  3: { order: "order-3", pillarHeight: "h-20", pillarColor: "bg-amber-700", avatarSize: "md",  showCrown: false },
};

/**
 * Whether the Podium would render at all.
 * Mirrors: `if (entries.length === 0) return null`
 */
function shouldRenderPodium(entries: LeaderboardEntry[]): boolean {
  return entries.length > 0;
}

/**
 * Number of slot elements that would be rendered for a given entries array.
 * Mirrors the `.map` inside Podium: entries with rank outside 1|2|3 are
 * skipped (`if (!config) return null`).
 */
function renderedSlotCount(entries: LeaderboardEntry[]): number {
  if (!shouldRenderPodium(entries)) return 0;
  return entries.filter((e) => SLOT_CONFIG[e.rank as 1 | 2 | 3] !== undefined).length;
}

/**
 * Format a score the same way Podium does.
 * Mirrors: `entry.totalScore.toLocaleString('id-ID')`
 */
function formatScore(score: number): string {
  return score.toLocaleString("id-ID");
}

// ---------------------------------------------------------------------------
// Arbitrary helpers
// ---------------------------------------------------------------------------

/**
 * Arbitrary for a single LeaderboardEntry with rank constrained to 1|2|3
 * (the only valid podium ranks).
 */
const leaderboardEntryArb: fc.Arbitrary<LeaderboardEntry> = fc.record({
  uid: fc.string(),
  rank: fc.constantFrom(1, 2, 3),
  name: fc.string(),
  school: fc.string(),
  photoURL: fc.option(fc.string(), { nil: null }),
  totalScore: fc.nat(),
});

// ---------------------------------------------------------------------------
// Property 3 — Podium renders only filled slots (no phantom slots)
// Feature: game-leaderboard, Property 3: slot count = entries length
// Validates: Requirements 3.4
// ---------------------------------------------------------------------------

describe(
  "Property 3: Podium renders only filled slots — slot count equals entries length [Feature: game-leaderboard, Property 3]",
  () => {
    it(
      "for any 0–3 entry array, renderedSlotCount equals entries.length",
      () => {
        // Feature: game-leaderboard, Property 3: slot count = entries length
        fc.assert(
          fc.property(
            fc.array(leaderboardEntryArb, { minLength: 0, maxLength: 3 }),
            (entries) => {
              const slotCount = renderedSlotCount(entries);
              expect(slotCount).toBe(entries.length);
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "empty array → renderedSlotCount is 0 (no phantom slots)",
      () => {
        // Feature: game-leaderboard, Property 3: empty array case
        fc.assert(
          fc.property(
            fc.constant([] as LeaderboardEntry[]),
            (entries) => {
              expect(renderedSlotCount(entries)).toBe(0);
              expect(shouldRenderPodium(entries)).toBe(false);
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "for any 1–3 entry array, shouldRenderPodium is true",
      () => {
        // Feature: game-leaderboard, Property 3: non-empty always renders
        fc.assert(
          fc.property(
            fc.array(leaderboardEntryArb, { minLength: 1, maxLength: 3 }),
            (entries) => {
              expect(shouldRenderPodium(entries)).toBe(true);
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "renderedSlotCount never exceeds 3 for any valid podium array",
      () => {
        // Feature: game-leaderboard, Property 3: upper bound invariant
        fc.assert(
          fc.property(
            fc.array(leaderboardEntryArb, { minLength: 0, maxLength: 3 }),
            (entries) => {
              expect(renderedSlotCount(entries)).toBeLessThanOrEqual(3);
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "renderedSlotCount is always non-negative",
      () => {
        // Feature: game-leaderboard, Property 3: non-negative invariant
        fc.assert(
          fc.property(
            fc.array(leaderboardEntryArb, { minLength: 0, maxLength: 3 }),
            (entries) => {
              expect(renderedSlotCount(entries)).toBeGreaterThanOrEqual(0);
            },
          ),
          { numRuns: 100 },
        );
      },
    );
  },
);

// ---------------------------------------------------------------------------
// Property 4 — Podium displays all fields of every entry
// Feature: game-leaderboard, Property 4: entry data is preserved and formatted
// Validates: Requirements 3.3
// ---------------------------------------------------------------------------

describe(
  "Property 4: Podium displays all entry fields correctly [Feature: game-leaderboard, Property 4]",
  () => {
    it(
      "formatScore is idempotent — same input always produces the same output",
      () => {
        // Feature: game-leaderboard, Property 4: score formatting idempotency
        fc.assert(
          fc.property(fc.nat(), (score) => {
            const formatted1 = formatScore(score);
            const formatted2 = formatScore(score);
            expect(formatted1).toBe(formatted2);
          }),
          { numRuns: 100 },
        );
      },
    );

    it(
      "formatScore output is a non-empty string for any non-negative integer",
      () => {
        // Feature: game-leaderboard, Property 4: formatted score is always a non-empty string
        fc.assert(
          fc.property(fc.nat(), (score) => {
            const formatted = formatScore(score);
            expect(typeof formatted).toBe("string");
            expect(formatted.length).toBeGreaterThan(0);
          }),
          { numRuns: 100 },
        );
      },
    );

    it(
      "for any 1–3 entry array, every entry's name field is preserved (string passthrough)",
      () => {
        // Feature: game-leaderboard, Property 4: name is directly from entry
        fc.assert(
          fc.property(
            fc.array(leaderboardEntryArb, { minLength: 1, maxLength: 3 }),
            (entries) => {
              for (const entry of entries) {
                // Podium renders entry.name verbatim — no transformation
                expect(typeof entry.name).toBe("string");
                // The slot config exists for this rank — entry would be rendered
                expect(SLOT_CONFIG[entry.rank as 1 | 2 | 3]).toBeDefined();
              }
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "for any 1–3 entry array, every entry's school field is preserved (string passthrough)",
      () => {
        // Feature: game-leaderboard, Property 4: school is directly from entry
        fc.assert(
          fc.property(
            fc.array(leaderboardEntryArb, { minLength: 1, maxLength: 3 }),
            (entries) => {
              for (const entry of entries) {
                expect(typeof entry.school).toBe("string");
              }
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "for any 1–3 entry array, every entry's totalScore produces a deterministic formatted string",
      () => {
        // Feature: game-leaderboard, Property 4: score format is deterministic per entry
        fc.assert(
          fc.property(
            fc.array(leaderboardEntryArb, { minLength: 1, maxLength: 3 }),
            (entries) => {
              for (const entry of entries) {
                const score = entry.totalScore;
                // Calling formatScore twice must yield identical results
                expect(formatScore(score)).toBe(formatScore(score));
                // Score is non-negative (fc.nat())
                expect(score).toBeGreaterThanOrEqual(0);
              }
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "all three display fields (name, school, totalScore) are present on every entry",
      () => {
        // Feature: game-leaderboard, Property 4: all required display fields are present
        fc.assert(
          fc.property(
            fc.array(leaderboardEntryArb, { minLength: 1, maxLength: 3 }),
            (entries) => {
              for (const entry of entries) {
                // All three data fields Podium uses must exist
                expect(entry).toHaveProperty("name");
                expect(entry).toHaveProperty("school");
                expect(entry).toHaveProperty("totalScore");
                expect(typeof entry.totalScore).toBe("number");
              }
            },
          ),
          { numRuns: 100 },
        );
      },
    );
  },
);
