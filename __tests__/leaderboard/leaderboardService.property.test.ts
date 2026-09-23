/**
 * Property-based tests for leaderboardService pure functions.
 * Feature: game-leaderboard
 *
 * Tests are written against the exported pure functions:
 *   - mapDocsToEntries (internal mapping helper)
 *   - calculateRank    (rank calculation helper)
 *
 * No Firestore, React, or Firebase imports needed — these are pure functions.
 */

import * as fc from "fast-check";
import {
  mapDocsToEntries,
  calculateRank,
} from "@/features/leaderboard/leaderboardService";

// ---------------------------------------------------------------------------
// Property 1 — mapDocsToEntries correctness
// Feature: game-leaderboard, Property 1: kebenaran pemetaan dokumen Firestore ke LeaderboardEntry
// Validates: Requirements 1.2, 1.3
// ---------------------------------------------------------------------------

/**
 * Build a mock Firestore-like doc from a plain record.
 * Mirrors the { id, data() } shape expected by mapDocsToEntries.
 */
function makeDoc(
  id: string,
  fields: Record<string, unknown>,
): { id: string; data: () => Record<string, unknown> } {
  return { id, data: () => fields };
}

describe(
  "Property 1: mapDocsToEntries correctness [Feature: game-leaderboard, Property 1]",
  () => {
    // Arbitrary for a single Firestore doc record:
    //   - uid: string (used as id)
    //   - name: string
    //   - school: string
    //   - totalScore: number | undefined  (fc.option with nil: undefined)
    const arbDocRecord = fc.record({
      uid: fc.string(),
      name: fc.string(),
      school: fc.string(),
      totalScore: fc.option(fc.nat(), { nil: undefined }),
    });

    it(
      "output length equals input length for any 0–10 element array",
      () => {
        fc.assert(
          fc.property(
            fc.array(arbDocRecord, { maxLength: 10 }),
            (records) => {
              const docs = records.map((r) =>
                makeDoc(r.uid, {
                  name: r.name,
                  school: r.school,
                  ...(r.totalScore !== undefined
                    ? { totalScore: r.totalScore }
                    : {}),
                }),
              );
              const entries = mapDocsToEntries(docs);
              expect(entries).toHaveLength(records.length);
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "rank of each entry equals its 1-indexed position in the array",
      () => {
        fc.assert(
          fc.property(
            fc.array(arbDocRecord, { maxLength: 10 }),
            (records) => {
              const docs = records.map((r) =>
                makeDoc(r.uid, {
                  name: r.name,
                  school: r.school,
                  totalScore: r.totalScore,
                }),
              );
              const entries = mapDocsToEntries(docs);
              entries.forEach((entry, idx) => {
                expect(entry.rank).toBe(idx + 1);
              });
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "totalScore defaults to 0 when doc has no totalScore field (undefined)",
      () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.record({ uid: fc.string(), name: fc.string(), school: fc.string() }),
              { minLength: 1, maxLength: 10 },
            ),
            (records) => {
              // Explicitly omit totalScore from every doc
              const docs = records.map((r) =>
                makeDoc(r.uid, { name: r.name, school: r.school }),
              );
              const entries = mapDocsToEntries(docs);
              entries.forEach((entry) => {
                expect(entry.totalScore).toBe(0);
              });
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "uid, name, and school are mapped correctly from doc fields",
      () => {
        fc.assert(
          fc.property(
            fc.array(arbDocRecord, { minLength: 1, maxLength: 10 }),
            (records) => {
              const docs = records.map((r) =>
                makeDoc(r.uid, {
                  name: r.name,
                  school: r.school,
                  totalScore: r.totalScore,
                }),
              );
              const entries = mapDocsToEntries(docs);
              entries.forEach((entry, idx) => {
                // uid comes from doc.id
                expect(entry.uid).toBe(records[idx].uid);
                // name and school from data fields
                expect(entry.name).toBe(records[idx].name);
                expect(entry.school).toBe(records[idx].school);
              });
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "numeric totalScore is preserved as-is (not normalized away)",
      () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.record({
                uid: fc.string(),
                name: fc.string(),
                school: fc.string(),
                totalScore: fc.nat(), // always a defined number ≥ 0
              }),
              { minLength: 1, maxLength: 10 },
            ),
            (records) => {
              const docs = records.map((r) =>
                makeDoc(r.uid, {
                  name: r.name,
                  school: r.school,
                  totalScore: r.totalScore,
                }),
              );
              const entries = mapDocsToEntries(docs);
              entries.forEach((entry, idx) => {
                expect(entry.totalScore).toBe(records[idx].totalScore);
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
// Property 6 — calculateRank correctness
// Feature: game-leaderboard, Property 6: kebenaran kalkulasi peringkat
// Validates: Requirements 5.1, 6.1, 6.2
// ---------------------------------------------------------------------------

describe(
  "Property 6: calculateRank correctness [Feature: game-leaderboard, Property 6]",
  () => {
    it(
      "rank equals the count of scores strictly greater than userScore plus 1",
      () => {
        fc.assert(
          fc.property(
            fc.nat(),                      // userScore ≥ 0
            fc.array(fc.nat()),            // arbitrary other scores
            (userScore, scores) => {
              const rank = calculateRank(userScore, scores);
              const expected = scores.filter((s) => s > userScore).length + 1;
              expect(rank).toBe(expected);
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "rank is at least 1 for any userScore and any scores array",
      () => {
        fc.assert(
          fc.property(
            fc.nat(),
            fc.array(fc.nat()),
            (userScore, scores) => {
              const rank = calculateRank(userScore, scores);
              expect(rank).toBeGreaterThanOrEqual(1);
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "tie-handling: scores equal to userScore do not increase rank",
      () => {
        fc.assert(
          fc.property(
            fc.nat(), // userScore
            fc.nat({ max: 10 }), // number of tied peers
            (userScore, tiedCount) => {
              // All tied scores are equal to userScore → none are strictly greater
              const tiedScores = Array(tiedCount).fill(userScore);
              const rank = calculateRank(userScore, tiedScores);
              // No score is strictly greater, so rank must be 1
              expect(rank).toBe(1);
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "tie-handling: multiple users with same score get same rank",
      () => {
        fc.assert(
          fc.property(
            fc.nat(), // shared score
            fc.nat({ max: 5 }), // how many users share this score
            fc.array(fc.nat(), { maxLength: 5 }), // other scores (may be higher or lower)
            (sharedScore, tiedCount, otherScores) => {
              // Expected rank for each tied user = number of strictly higher scores + 1
              const higherCount = otherScores.filter((s) => s > sharedScore).length;
              const expectedRank = higherCount + 1;

              // All tied users must get the same rank regardless of how many others tie
              for (let i = 0; i < tiedCount; i++) {
                // From the perspective of one tied user, the other tied users
                // are part of `scores` but they are NOT strictly greater, so rank is the same
                const scoresForThisUser = [
                  ...otherScores,
                  // add the other tied peers (tiedCount - 1 equals-scoring peers)
                  ...Array(Math.max(0, tiedCount - 1)).fill(sharedScore),
                ];
                const rank = calculateRank(sharedScore, scoresForThisUser);
                expect(rank).toBe(expectedRank);
              }
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "rank with empty scores array is always 1",
      () => {
        fc.assert(
          fc.property(
            fc.nat(),
            (userScore) => {
              const rank = calculateRank(userScore, []);
              expect(rank).toBe(1);
            },
          ),
          { numRuns: 100 },
        );
      },
    );

    it(
      "rank increases by 1 for each score strictly higher than userScore",
      () => {
        fc.assert(
          fc.property(
            fc.nat({ max: 1000 }), // userScore
            fc.nat({ max: 10 }),   // number of strictly higher scores
            fc.nat({ max: 1000 }), // delta above userScore (≥ 1)
            (userScore, higherCount, delta) => {
              const strictlyHigher = Array(higherCount).fill(userScore + delta + 1);
              const rank = calculateRank(userScore, strictlyHigher);
              expect(rank).toBe(higherCount + 1);
            },
          ),
          { numRuns: 100 },
        );
      },
    );
  },
);
