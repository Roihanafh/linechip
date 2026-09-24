/**
 * Property-based tests for admin dashboard utility functions.
 * Uses fast-check for property generation.
 * Feature: admin-dashboard
 */

import * as fc from 'fast-check';
import {
  selectTopN,
  paginateAll,
  filterUsers,
  applySelectedReset,
  validateUid,
} from '@/lib/admin/utils';
import type { AdminUserRow, UserScoreEntry } from '@/lib/admin/utils';

// ---------------------------------------------------------------------------
// Property 1: Top-N user selection respects score ordering and limit
// Validates: Requirements 2.5, 2.6
// ---------------------------------------------------------------------------

describe('Property 1: Top-N user selection respects score ordering and limit', () => {
  it('result.length <= n, all entries have totalScore > 0, sorted descending', () => {
    // Feature: admin-dashboard, Property 1: top-N respects score ordering and limit
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ uid: fc.string(), totalScore: fc.integer({ min: 0 }) }),
          { maxLength: 50 }
        ),
        (users: UserScoreEntry[]) => {
          const result = selectTopN(users, 10);
          const lengthOk = result.length <= 10;
          const allPositive = result.every((u) => u.totalScore > 0);
          const sortedDesc = result.every(
            (u, i) => i === 0 || result[i - 1].totalScore >= u.totalScore
          );
          return lengthOk && allPositive && sortedDesc;
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Pagination invariant — page size bound
// Validates: Requirements 3.2
// ---------------------------------------------------------------------------

describe('Property 2: Pagination invariant — page size bound', () => {
  it('every page has length <= 20, sum of all pages equals total users', () => {
    // Feature: admin-dashboard, Property 2: pagination invariant — page size bound
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            uid: fc.string(),
            name: fc.string(),
            email: fc.string(),
            school: fc.string(),
            totalScore: fc.integer({ min: 0 }),
            disabled: fc.boolean(),
            createdAt: fc.string(),
          }),
          { maxLength: 200 }
        ),
        (users: AdminUserRow[]) => {
          const pages = paginateAll(users, 20);
          const pageSizeOk = pages.every((page) => page.length <= 20);
          const totalOk = pages.flat().length === users.length;
          return pageSizeOk && totalOk;
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Search filter correctness
// Validates: Requirements 3.3, 3.4
// ---------------------------------------------------------------------------

describe('Property 3: Search filter correctness', () => {
  it('all results match query; no matching user is excluded', () => {
    // Feature: admin-dashboard, Property 3: search filter correctness
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            uid: fc.string(),
            name: fc.string(),
            email: fc.string(),
            school: fc.string(),
            totalScore: fc.integer({ min: 0 }),
            disabled: fc.boolean(),
            createdAt: fc.string(),
          }),
          { maxLength: 100 }
        ),
        fc.string({ minLength: 2, maxLength: 50 }),
        (users: AdminUserRow[], query: string) => {
          const result = filterUsers(users, query);
          const q = query.toLowerCase();

          // All returned users must match the query
          const allMatch = result.every(
            (u) =>
              u.name.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q)
          );

          // No user that should match is excluded
          const noneExcluded = users
            .filter(
              (u) =>
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q)
            )
            .every((u) => result.some((r) => r.uid === u.uid));

          return allMatch && noneExcluded;
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Selected-user reset isolation
// Validates: Requirements 5.4
// ---------------------------------------------------------------------------

describe('Property 4: Selected-user reset isolation', () => {
  it('selected users get totalScore=0; non-selected users are unchanged', () => {
    // Feature: admin-dashboard, Property 4: selected-user reset isolation
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ uid: fc.uuid(), totalScore: fc.integer({ min: 1 }) }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.array(fc.nat({ max: 49 }), { minLength: 1, maxLength: 10 }),
        (users: UserScoreEntry[], indices: number[]) => {
          const uniqueIndices = [...new Set(indices)].filter(
            (i) => i < users.length
          );
          const selectedUids = new Set(uniqueIndices.map((i) => users[i].uid));
          const result = applySelectedReset(users, selectedUids);

          return result.every((u) => {
            const original = users.find((o) => o.uid === u.uid)!;
            if (selectedUids.has(u.uid)) {
              return u.totalScore === 0;
            } else {
              return u.totalScore === original.totalScore;
            }
          });
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: UID input validation boundary
// Validates: Requirements 6.3
// ---------------------------------------------------------------------------

describe('Property 5: UID input validation boundary', () => {
  it('valid iff length is between 1 and 128 inclusive', () => {
    // Feature: admin-dashboard, Property 5: UID input validation boundary
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(''), fc.string({ maxLength: 200 })),
        (uid: string) => {
          const isValid = validateUid(uid);
          const expectedValid = uid.length >= 1 && uid.length <= 128;
          return isValid === expectedValid;
        }
      )
    );
  });
});
