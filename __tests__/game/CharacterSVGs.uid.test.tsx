/**
 * Property test: UID suffix mencegah konflik id SVG
 *
 * Feature: svg-animation-integration
 * Property 1: Untuk setiap pasangan uid berbeda, tidak ada elemen <defs> id
 * yang sama di antara dua instance karakter berbeda.
 *
 * Validates: Requirements 0.4
 */

import * as fc from "fast-check";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import {
  AntibodySatuan,
  AntibodyPuluhan,
  AntibodyRatusan,
  AntibodyRibuan,
  VirusSatuan,
  VirusPuluhan,
  VirusRatusan,
  VirusRibuan,
} from "../../components/game/CharacterSVGs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract all id="..." attribute values from an HTML/SVG string. */
function extractIds(markup: string): Set<string> {
  const ids = new Set<string>();
  // Matches id="some-value" (double or single quotes)
  const pattern = /\bid=["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markup)) !== null) {
    ids.add(match[1]);
  }
  return ids;
}

/** Return true if two Sets share at least one element. */
function setsIntersect<T>(a: Set<T>, b: Set<T>): boolean {
  for (const v of a) {
    if (b.has(v)) return true;
  }
  return false;
}

// ─── Character component catalogue ───────────────────────────────────────────

const CHARACTERS: Array<{
  name: string;
  Component: React.ComponentType<{ uid?: string }>;
}> = [
  { name: "AntibodySatuan",  Component: AntibodySatuan  },
  { name: "AntibodyPuluhan", Component: AntibodyPuluhan },
  { name: "AntibodyRatusan", Component: AntibodyRatusan },
  { name: "AntibodyRibuan",  Component: AntibodyRibuan  },
  { name: "VirusSatuan",     Component: VirusSatuan     },
  { name: "VirusPuluhan",    Component: VirusPuluhan    },
  { name: "VirusRatusan",    Component: VirusRatusan    },
  { name: "VirusRibuan",     Component: VirusRibuan     },
];

// ─── Property 1 ───────────────────────────────────────────────────────────────
// Feature: svg-animation-integration
// Property 1: UID suffix mencegah konflik id SVG

describe("CharacterSVGs — Property 1: uid suffix mencegah konflik id SVG", () => {
  for (const { name, Component } of CHARACTERS) {
    it(`${name}: tidak ada id yang sama antara dua instance dengan uid berbeda`, () => {
      // Arbitrary: pairs of distinct, non-empty strings
      const distinctPairArb = fc
        .tuple(fc.string({ minLength: 1, maxLength: 20 }), fc.string({ minLength: 1, maxLength: 20 }))
        .filter(([a, b]) => a !== b);

      fc.assert(
        fc.property(distinctPairArb, ([uid1, uid2]) => {
          const markup1 = renderToStaticMarkup(React.createElement(Component, { uid: uid1 }));
          const markup2 = renderToStaticMarkup(React.createElement(Component, { uid: uid2 }));

          const ids1 = extractIds(markup1);
          const ids2 = extractIds(markup2);

          // Each instance must produce at least one id (the gradient/filter def)
          // so a trivially-empty-ids result doesn't silently pass
          const hasIds = ids1.size > 0 && ids2.size > 0;

          // The two id sets must not overlap
          const noConflict = !setsIntersect(ids1, ids2);

          return hasIds && noConflict;
        }),
        { numRuns: 100 }
      );
    });
  }

  it("setiap karakter menghasilkan id yang mengandung uid yang diberikan", () => {
    // Ensures the uid is actually embedded in the generated id, not just a side-effect.
    // Constrain to safe alphanumeric uid strings (matching real usage patterns) so the
    // generated SVG id attributes remain valid and parseable by the id extraction regex.
    const safeUidArb = fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/);

    fc.assert(
      fc.property(safeUidArb, (uid) => {
        for (const { Component } of CHARACTERS) {
          const markup = renderToStaticMarkup(React.createElement(Component, { uid }));
          const ids = extractIds(markup);
          // At least one id must contain the uid string
          const anyContainsUid = [...ids].some((id) => id.includes(uid));
          if (!anyContainsUid) return false;
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
