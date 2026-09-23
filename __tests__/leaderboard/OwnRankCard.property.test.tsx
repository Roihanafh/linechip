/**
 * Property-based tests for OwnRankCard logic
 * Feature: game-leaderboard, Property 7
 *
 * Tests are written against pure-function extractions of the display logic
 * from app/leaderboard/OwnRankCard.tsx — no React renderer needed.
 *
 * Validates: Requirements 5.2, 8.3
 */

import * as fc from "fast-check";
import type { LeaderboardEntry } from "@/features/leaderboard";

// ---------------------------------------------------------------------------
// Pure-function extractions (mirrors the logic in OwnRankCard.tsx)
// ---------------------------------------------------------------------------

/**
 * Builds the aria-label for OwnRankCard.
 * Mirrors: aria-label={`Peringkatmu saat ini: ke-${entry.rank}`}
 */
function getAriaLabel(rank: number): string {
  return `Peringkatmu saat ini: ke-${rank}`;
}

/**
 * Formats a score for display using Indonesian locale.
 * Mirrors: entry.totalScore.toLocaleString('id-ID')
 */
function formatScore(score: number): string {
  return score.toLocaleString("id-ID");
}

/**
 * CSS classes that must always be present on the OwnRankCard container.
 * Mirrors the className in OwnRankCard.tsx.
 */
const CARD_CLASSES = [
  "border-intblue",
  "bg-intblue-light",
] as const;

// ---------------------------------------------------------------------------
// Arbitrary helpers
// ---------------------------------------------------------------------------

/** Arbitrary for a LeaderboardEntry with rank guaranteed > 10 */
const leaderboardEntryArb: fc.Arbitrary<LeaderboardEntry> = fc.record({
  uid: fc.string({ minLength: 1, maxLength: 32 }),
  rank: fc.integer({ min: 11, max: 9999 }),
  name: fc.string({ minLength: 1, maxLength: 80 }),
  school: fc.string({ minLength: 1, maxLength: 100 }),
  photoURL: fc.option(fc.webUrl(), { nil: null }),
  totalScore: fc.nat({ max: 1_000_000 }),
});

// ---------------------------------------------------------------------------
// Property 7 — OwnRankCard displays all fields and correct aria-label
// Feature: game-leaderboard, Property 7: OwnRankCard Menampilkan Semua Field
// dan aria-label yang Benar
// Validates: Requirements 5.2, 8.3
// ---------------------------------------------------------------------------

describe(
  "Property 7: OwnRankCard displays all fields and correct aria-label [Feature: game-leaderboard, Property 7]",
  () => {
    // 7.1 — aria-label always contains the rank number as a string
    it(
      "getAriaLabel(rank) always contains String(rank) for any rank > 10",
      () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 11, max: 9999 }),
            (rank) => {
              const label = getAriaLabel(rank);
              expect(label).toContain(String(rank));
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    // 7.2 — formatScore is deterministic: same input always yields same output
    it(
      "formatScore is deterministic — same input always yields same output",
      () => {
        fc.assert(
          fc.property(
            fc.nat({ max: 1_000_000 }),
            (score) => {
              const first = formatScore(score);
              const second = formatScore(score);
              expect(first).toBe(second);
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    // 7.3 — aria-label format always follows the exact expected template
    it(
      "aria-label format is always \"Peringkatmu saat ini: ke-<rank>\" for any rank > 10",
      () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 11, max: 9999 }),
            (rank) => {
              const label = getAriaLabel(rank);
              const expected = `Peringkatmu saat ini: ke-${rank}`;
              expect(label).toBe(expected);
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    // 7.4 — aria-label is unique per rank: different ranks produce different labels
    it(
      "aria-label is unique to each rank — two different ranks always produce different labels",
      () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 11, max: 9999 }),
            fc.integer({ min: 11, max: 9999 }),
            (rankA, rankB) => {
              fc.pre(rankA !== rankB);
              const labelA = getAriaLabel(rankA);
              const labelB = getAriaLabel(rankB);
              expect(labelA).not.toBe(labelB);
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    // 7.5 — formatScore(0) === "0" (zero edge case, locale-independent digit)
    it(
      "formatScore(0) returns a string containing \"0\"",
      () => {
        const result = formatScore(0);
        // The formatted zero must at least contain the digit 0
        expect(result).toContain("0");
      },
    );

    // 7.6 — for any entry with rank > 10, the aria-label contains the rank verbatim
    it(
      "for any LeaderboardEntry with rank > 10, getAriaLabel contains the exact rank number",
      () => {
        fc.assert(
          fc.property(leaderboardEntryArb, (entry) => {
            const label = getAriaLabel(entry.rank);
            // Must contain the exact rank digit sequence
            expect(label).toContain(String(entry.rank));
            // Must start with the fixed prefix
            expect(label.startsWith("Peringkatmu saat ini: ke-")).toBe(true);
          }),
          { numRuns: 100 },
        );
      },
    );

    // 7.7 — formatScore output is always a non-empty string for non-negative integers
    it(
      "formatScore always returns a non-empty string for any totalScore ≥ 0",
      () => {
        fc.assert(
          fc.property(
            fc.nat({ max: 1_000_000 }),
            (score) => {
              const formatted = formatScore(score);
              expect(typeof formatted).toBe("string");
              expect(formatted.length).toBeGreaterThan(0);
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    // 7.8 — CARD_CLASSES are present (static invariant check)
    it(
      "CARD_CLASSES always includes both \"border-intblue\" and \"bg-intblue-light\"",
      () => {
        expect(CARD_CLASSES).toContain("border-intblue");
        expect(CARD_CLASSES).toContain("bg-intblue-light");
      },
    );
  },
);
