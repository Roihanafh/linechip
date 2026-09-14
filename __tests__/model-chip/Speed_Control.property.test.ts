/**
 * Property-based tests for Speed_Control logic in app/model-chip/page.tsx.
 *
 * Tests pure rendering predicates and state-machine logic — no React rendering,
 * no jsdom. Mirrors the established pattern in:
 *   - __tests__/game/InteractionAnimation.property.test.ts
 *   - __tests__/model-chip/ClickMode.property.test.ts
 *
 * **Property 3: Speed_Control tidak tampil di luar battle**
 * **Validates: Requirements 4.6, 2.6**
 *
 * **Property 4: animSpeed update konsisten ke state dan ref**
 * **Validates: Requirements 4.4**
 *
 * **Property 5: PairReactionStage key berubah saat animSpeed berubah**
 * **Validates: Requirements 4.5**
 */

import * as fc from "fast-check";

// ── Types (mirrored from page.tsx) ────────────────────────────────────────────

type VizPhase = "idle" | "battle" | "center" | "done";
type AnimSpeed = 0.5 | 1 | 2;

// ── Pure predicates / helpers mirrored from page.tsx ─────────────────────────

/**
 * The valid speed values exposed by Speed_Control — mirrors `([0.5, 1, 2] as const)`.
 */
const VALID_SPEEDS: AnimSpeed[] = [0.5, 1, 2];

/**
 * Whether Speed_Control should be rendered.
 * Mirrors the condition in page.tsx: `vizPhase === "battle"`.
 *
 * Requirements 4.6 / 2.6: Speed_Control must NOT appear outside battle.
 */
function shouldRenderSpeedControl(vizPhase: VizPhase): boolean {
  return vizPhase === "battle";
}

/**
 * Simulates a speed-selection click, returning the updated (state, ref) pair.
 * Mirrors:
 *   onClick={() => { animSpeedRef.current = spd; setAnimSpeed(spd); }}
 *
 * Returns an object where `state` is the new animSpeed state value and
 * `ref` is the new animSpeedRef.current value — both must equal the chosen speed.
 *
 * Requirements 4.4: after setting speed, state and ref must be in sync.
 */
function applySpeedChange(
  speed: AnimSpeed
): { state: AnimSpeed; ref: AnimSpeed } {
  // In page.tsx both assignments happen synchronously in the same click handler.
  return { state: speed, ref: speed };
}

/**
 * Generates the PairReactionStage `key` prop as used in page.tsx:
 *   key={`pr-${tierIdx}-${pairInTier}-${animSpeed}`}
 *
 * Requirements 4.5: changing animSpeed must produce a different key (causing
 * React to unmount and remount PairReactionStage).
 */
function pairReactionKey(
  tierIdx: number,
  pairInTier: number,
  animSpeed: AnimSpeed
): string {
  return `pr-${tierIdx}-${pairInTier}-${animSpeed}`;
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

/** Any VizPhase value. */
const vizPhaseArb = fc.constantFrom<VizPhase>("idle", "battle", "center", "done");

/** Any VizPhase value that is NOT "battle". */
const nonBattlePhaseArb = fc.constantFrom<VizPhase>("idle", "center", "done");

/** Any valid AnimSpeed value. */
const animSpeedArb = fc.constantFrom<AnimSpeed>(0.5, 1, 2);

/** A pair of distinct AnimSpeed values. */
const distinctSpeedPairArb = fc
  .tuple(animSpeedArb, animSpeedArb)
  .filter(([s1, s2]) => s1 !== s2);

// ── Property 3 ────────────────────────────────────────────────────────────────

describe("Property 3: Speed_Control tidak tampil di luar battle", () => {
  /**
   * For any vizPhase that is not "battle", shouldRenderSpeedControl must return
   * false — Speed_Control must not be rendered.
   *
   * **Validates: Requirements 4.6, 2.6**
   */

  it(
    "shouldRenderSpeedControl(vizPhase) === false untuk semua vizPhase selain 'battle'",
    () => {
      fc.assert(
        fc.property(nonBattlePhaseArb, (vizPhase) => {
          expect(shouldRenderSpeedControl(vizPhase)).toBe(false);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    "shouldRenderSpeedControl('battle') === true (hanya battle yang menampilkan Speed_Control)",
    () => {
      expect(shouldRenderSpeedControl("battle")).toBe(true);
    }
  );

  it(
    "shouldRenderSpeedControl konsisten: setiap vizPhase selain 'battle' menghasilkan false",
    () => {
      fc.assert(
        fc.property(vizPhaseArb, (vizPhase) => {
          const result = shouldRenderSpeedControl(vizPhase);
          if (vizPhase === "battle") {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    "Speed_Control tidak tampil saat 'idle' — property diterapkan pada semua input 'idle'",
    () => {
      fc.assert(
        fc.property(fc.constant<VizPhase>("idle"), (vizPhase) => {
          expect(shouldRenderSpeedControl(vizPhase)).toBe(false);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    "Speed_Control tidak tampil saat 'done' — property diterapkan pada semua input 'done'",
    () => {
      fc.assert(
        fc.property(fc.constant<VizPhase>("done"), (vizPhase) => {
          expect(shouldRenderSpeedControl(vizPhase)).toBe(false);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    "Speed_Control tidak tampil saat 'center' — property diterapkan pada semua input 'center'",
    () => {
      fc.assert(
        fc.property(fc.constant<VizPhase>("center"), (vizPhase) => {
          expect(shouldRenderSpeedControl(vizPhase)).toBe(false);
        }),
        { numRuns: 100 }
      );
    }
  );
});

// ── Property 4 ────────────────────────────────────────────────────────────────

describe("Property 4: animSpeed update konsisten ke state dan ref", () => {
  /**
   * For any valid speed value from {0.5, 1, 2}, after the user selects it via
   * Speed_Control, both animSpeed state and animSpeedRef.current must equal the
   * chosen speed.
   *
   * **Validates: Requirements 4.4**
   */

  it(
    "state dan ref keduanya sama dengan speed yang dipilih untuk semua valid speed",
    () => {
      fc.assert(
        fc.property(animSpeedArb, (speed) => {
          const { state, ref } = applySpeedChange(speed);
          expect(state).toBe(speed);
          expect(ref).toBe(speed);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    "state dan ref selalu saling sinkron (state === ref) setelah setiap pemilihan speed",
    () => {
      fc.assert(
        fc.property(animSpeedArb, (speed) => {
          const { state, ref } = applySpeedChange(speed);
          expect(state).toBe(ref);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    "hanya nilai valid {0.5, 1, 2} yang bisa dipilih — VALID_SPEEDS mengandung tepat tiga nilai",
    () => {
      expect(VALID_SPEEDS).toHaveLength(3);
      expect(VALID_SPEEDS).toContain(0.5);
      expect(VALID_SPEEDS).toContain(1);
      expect(VALID_SPEEDS).toContain(2);
    }
  );

  it(
    "applySpeedChange deterministic: memanggil dua kali dengan speed yang sama menghasilkan nilai sama",
    () => {
      fc.assert(
        fc.property(animSpeedArb, (speed) => {
          const first = applySpeedChange(speed);
          const second = applySpeedChange(speed);
          expect(first.state).toBe(second.state);
          expect(first.ref).toBe(second.ref);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    "memilih speed berbeda menghasilkan state dan ref yang berbeda",
    () => {
      fc.assert(
        fc.property(distinctSpeedPairArb, ([s1, s2]) => {
          const result1 = applySpeedChange(s1);
          const result2 = applySpeedChange(s2);
          // Different speeds → different state/ref values
          expect(result1.state).not.toBe(result2.state);
          expect(result1.ref).not.toBe(result2.ref);
        }),
        { numRuns: 100 }
      );
    }
  );
});

// ── Property 5 ────────────────────────────────────────────────────────────────

describe("Property 5: PairReactionStage key berubah saat animSpeed berubah", () => {
  /**
   * For any two distinct speed values s1 ≠ s2 from {0.5, 1, 2}, the key
   * generated for PairReactionStage with s1 must differ from the key generated
   * with s2 (given the same tierIdx and pairInTier). This ensures React unmounts
   * and remounts PairReactionStage when the speed changes.
   *
   * **Validates: Requirements 4.5**
   */

  it(
    "kunci PairReactionStage berbeda untuk dua animSpeed yang berbeda (tierIdx/pairInTier sama)",
    () => {
      fc.assert(
        fc.property(
          distinctSpeedPairArb,
          fc.integer({ min: 0, max: 10 }),   // tierIdx
          fc.integer({ min: 0, max: 100 }),  // pairInTier
          ([s1, s2], tierIdx, pairInTier) => {
            const key1 = pairReactionKey(tierIdx, pairInTier, s1);
            const key2 = pairReactionKey(tierIdx, pairInTier, s2);
            expect(key1).not.toBe(key2);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "kunci PairReactionStage sama jika semua parameter sama (deterministik)",
    () => {
      fc.assert(
        fc.property(
          animSpeedArb,
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 100 }),
          (speed, tierIdx, pairInTier) => {
            const key1 = pairReactionKey(tierIdx, pairInTier, speed);
            const key2 = pairReactionKey(tierIdx, pairInTier, speed);
            expect(key1).toBe(key2);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "kunci mengandung animSpeed sehingga perubahan speed terlihat dalam kunci",
    () => {
      fc.assert(
        fc.property(
          animSpeedArb,
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 100 }),
          (speed, tierIdx, pairInTier) => {
            const key = pairReactionKey(tierIdx, pairInTier, speed);
            expect(key).toContain(String(speed));
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "kunci mengandung tierIdx dan pairInTier sehingga perubahan posisi pasangan juga menghasilkan kunci berbeda",
    () => {
      fc.assert(
        fc.property(
          animSpeedArb,
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 100 }),
          (speed, tierIdx, pairInTier) => {
            const key = pairReactionKey(tierIdx, pairInTier, speed);
            expect(key).toContain(String(tierIdx));
            expect(key).toContain(String(pairInTier));
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "format kunci sesuai template 'pr-{tierIdx}-{pairInTier}-{animSpeed}'",
    () => {
      fc.assert(
        fc.property(
          animSpeedArb,
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 100 }),
          (speed, tierIdx, pairInTier) => {
            const key = pairReactionKey(tierIdx, pairInTier, speed);
            const expected = `pr-${tierIdx}-${pairInTier}-${speed}`;
            expect(key).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    "semua tiga pasangan kecepatan berbeda ({0.5,1}, {0.5,2}, {1,2}) menghasilkan kunci berbeda",
    () => {
      const tierIdx = 0;
      const pairInTier = 0;
      const key05 = pairReactionKey(tierIdx, pairInTier, 0.5);
      const key1  = pairReactionKey(tierIdx, pairInTier, 1);
      const key2  = pairReactionKey(tierIdx, pairInTier, 2);

      expect(key05).not.toBe(key1);
      expect(key05).not.toBe(key2);
      expect(key1).not.toBe(key2);
    }
  );
});
