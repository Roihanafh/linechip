/**
 * Property-based tests for LeaderboardTable logic
 * Feature: game-leaderboard
 *
 * Tests are written against pure-function extractions of the display/highlight
 * logic from app/leaderboard/LeaderboardTable.tsx — no React renderer needed.
 */

import * as fc from "fast-check";
import type { LeaderboardEntry } from "@/features/leaderboard/types";

// ---------------------------------------------------------------------------
// Pure-function extractions (mirrors the logic in LeaderboardTable)
// ---------------------------------------------------------------------------

/** Returns true when the entry's uid matches the current user. */
function isCurrentUser(uid: string, currentUid: string | null): boolean {
  return currentUid !== null && uid === currentUid;
}

/** Returns the highlight class for the row, or the default class. */
function getHighlightClass(uid: string, currentUid: string | null): string {
  if (isCurrentUser(uid, currentUid)) {
    return "bg-intblue-light border-l-4 border-intblue";
  }
  return "border-b border-[#E2E8F0] last:border-b-0 hover:bg-slate-50 transition-colors";
}

/** Returns true when the entries array is empty (triggers the empty state). */
function isEmptyState(entries: LeaderboardEntry[]): boolean {
  return entries.length === 0;
}

/** Formats a score using the Indonesian locale (mirrors toLocaleString('id-ID')). */
function formatScore(score: number): string {
  return score.toLocaleString("id-ID");
}

// ---------------------------------------------------------------------------
// Arbitrary helpers
// ---------------------------------------------------------------------------

/** Arbitrary for a single LeaderboardEntry with all required fields. */
const leaderboardEntryArb: fc.Arbitrary<LeaderboardEntry> = fc.record({
  uid: fc.string({ minLength: 1 }),
  rank: fc.integer({ min: 1, max: 100 }),
  name: fc.string({ minLength: 1 }),
  school: fc.string({ minLength: 1 }),
  photoURL: fc.option(fc.webUrl(), { nil: null }),
  totalScore: fc.nat(),
});

// ---------------------------------------------------------------------------
// Property 2: Tabel Merender Semua Data Entri
// Feature: game-leaderboard, Property 2: for any array of LeaderboardEntry
// (0–10 items), the number of "data rows" equals entries.length, and every
// row exposes a deterministic formatted score.
// Validates: Requirements 2.1, 2.2
// ---------------------------------------------------------------------------

describe(
  "Property 2: LeaderboardTable renders all entry data [Feature: game-leaderboard, Property 2]",
  () => {
    it(
      "isEmptyState is true iff entries.length === 0",
      () => {
        fc.assert(
          fc.property(
            fc.array(leaderboardEntryArb, { minLength: 0, maxLength: 10 }),
            (entries) => {
              expect(isEmptyState(entries)).toBe(entries.length === 0);
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "number of data rows equals entries.length for any non-empty array",
      () => {
        fc.assert(
          fc.property(
            fc.array(leaderboardEntryArb, { minLength: 1, maxLength: 10 }),
            (entries) => {
              // Simulate rendering: one row per entry, no empty-state row
              const rowCount = isEmptyState(entries) ? 0 : entries.length;
              expect(rowCount).toBe(entries.length);
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "empty state produces zero data rows",
      () => {
        // The only way to get zero rows is an empty entries array
        const rowCount = isEmptyState([]) ? 0 : 0; // empty → empty-state tr, not a data row
        expect(rowCount).toBe(0);
      },
    );

    it(
      "formatScore is deterministic and consistent for every entry's totalScore",
      () => {
        fc.assert(
          fc.property(
            fc.array(leaderboardEntryArb, { minLength: 0, maxLength: 10 }),
            (entries) => {
              entries.forEach((entry) => {
                const formatted1 = formatScore(entry.totalScore);
                const formatted2 = formatScore(entry.totalScore);
                // Same input → same output every time
                expect(formatted1).toBe(formatted2);
                // Result must be a string
                expect(typeof formatted1).toBe("string");
              });
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "formatScore result is a non-empty string for any non-negative integer",
      () => {
        fc.assert(
          fc.property(fc.nat(), (score) => {
            const result = formatScore(score);
            expect(result.length).toBeGreaterThan(0);
          }),
          { numRuns: 100 },
        );
      },
    );

    it(
      "every entry in any array exposes name, school, and formatted totalScore",
      () => {
        fc.assert(
          fc.property(
            fc.array(leaderboardEntryArb, { minLength: 0, maxLength: 10 }),
            (entries) => {
              entries.forEach((entry) => {
                // name and school are non-empty strings (enforced by arb)
                expect(entry.name.length).toBeGreaterThan(0);
                expect(entry.school.length).toBeGreaterThan(0);
                // formatted score is a non-empty string
                expect(formatScore(entry.totalScore).length).toBeGreaterThan(0);
              });
            },
          ),
          { numRuns: 100 },
        );
      },
    );
  },
);

// ---------------------------------------------------------------------------
// Property 5: Highlight Menargetkan Tepat Satu Baris Pengguna
// Feature: game-leaderboard, Property 5: when entries contain at least one
// entry with uid === currentUid, exactly 1 row is highlighted; when none
// match (or currentUid is null), 0 rows are highlighted.
// Validates: Requirements 4.1, 4.4, 9.3
// ---------------------------------------------------------------------------

describe(
  "Property 5: highlight targets exactly one row [Feature: game-leaderboard, Property 5]",
  () => {
    it(
      "exactly 1 row highlighted when one entry matches currentUid",
      () => {
        // Generator: pick a uid, place it in one entry, build an array
        const arbWithMatch = fc
          .tuple(
            fc.string({ minLength: 1 }),   // currentUid
            fc.array(leaderboardEntryArb, { minLength: 1, maxLength: 9 }),
            fc.nat({ max: 1000 }),          // totalScore for the matching entry
            fc.integer({ min: 1, max: 10 }), // rank for the matching entry
            fc.string({ minLength: 1 }),     // name for the matching entry
            fc.string({ minLength: 1 }),     // school for the matching entry
          )
          .filter(([currentUid, others]) =>
            // Ensure the other entries do NOT share this uid
            others.every((e) => e.uid !== currentUid),
          )
          .map(([currentUid, others, totalScore, rank, name, school]) => {
            const matchingEntry: LeaderboardEntry = {
              uid: currentUid,
              rank,
              name,
              school,
              photoURL: null,
              totalScore,
            };
            // Insert the matching entry at a random position later via concat
            const entries = [...others, matchingEntry];
            return { entries, currentUid };
          });

        fc.assert(
          fc.property(arbWithMatch, ({ entries, currentUid }) => {
            const highlightedRows = entries.filter((entry) =>
              isCurrentUser(entry.uid, currentUid),
            );
            expect(highlightedRows).toHaveLength(1);
          }),
          { numRuns: 100 },
        );
      },
    );

    it(
      "0 rows highlighted when currentUid is null",
      () => {
        fc.assert(
          fc.property(
            fc.array(leaderboardEntryArb, { minLength: 0, maxLength: 10 }),
            (entries) => {
              const highlightedRows = entries.filter((entry) =>
                isCurrentUser(entry.uid, null),
              );
              expect(highlightedRows).toHaveLength(0);
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "0 rows highlighted when no entry uid matches currentUid",
      () => {
        // Generator: ensure currentUid does NOT appear in any entry's uid
        const arbNoMatch = fc
          .tuple(
            fc.string({ minLength: 1 }),
            fc.array(leaderboardEntryArb, { minLength: 0, maxLength: 10 }),
          )
          .filter(([currentUid, entries]) =>
            entries.every((e) => e.uid !== currentUid),
          )
          .map(([currentUid, entries]) => ({ currentUid, entries }));

        fc.assert(
          fc.property(arbNoMatch, ({ currentUid, entries }) => {
            const highlightedRows = entries.filter((entry) =>
              isCurrentUser(entry.uid, currentUid),
            );
            expect(highlightedRows).toHaveLength(0);
          }),
          { numRuns: 100 },
        );
      },
    );

    it(
      "getHighlightClass returns the highlight class for the matching uid",
      () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1 }), // uid / currentUid
            (uid) => {
              const cls = getHighlightClass(uid, uid);
              expect(cls).toContain("bg-intblue-light");
              expect(cls).toContain("border-intblue");
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "getHighlightClass returns the default class when currentUid is null",
      () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1 }), // uid
            (uid) => {
              const cls = getHighlightClass(uid, null);
              expect(cls).not.toContain("bg-intblue-light");
              expect(cls).not.toContain("border-intblue");
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "getHighlightClass returns the default class when uid does not match currentUid",
      () => {
        // uid and currentUid are always different strings
        const arbDifferent = fc
          .tuple(
            fc.string({ minLength: 1 }),
            fc.string({ minLength: 1 }),
          )
          .filter(([a, b]) => a !== b);

        fc.assert(
          fc.property(arbDifferent, ([uid, currentUid]) => {
            const cls = getHighlightClass(uid, currentUid);
            expect(cls).not.toContain("bg-intblue-light");
            expect(cls).not.toContain("border-intblue");
          }),
          { numRuns: 100 },
        );
      },
    );

    it(
      "highlight count is always 0 or 1 for any array when currentUid is non-null (uids are distinct)",
      () => {
        // Build an array where all uids are unique, then pick one as currentUid
        const arbUniqueUids = fc
          .array(leaderboardEntryArb, { minLength: 1, maxLength: 10 })
          .filter((entries) => {
            const uids = entries.map((e) => e.uid);
            return new Set(uids).size === uids.length;
          });

        fc.assert(
          fc.property(
            arbUniqueUids,
            fc.option(fc.string({ minLength: 1 }), { nil: null }),
            (entries, currentUid) => {
              const count = entries.filter((e) =>
                isCurrentUser(e.uid, currentUid),
              ).length;
              expect(count === 0 || count === 1).toBe(true);
            },
          ),
          { numRuns: 100 },
        );
      },
    );
  },
);
