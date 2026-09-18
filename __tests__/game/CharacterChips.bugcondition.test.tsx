/**
 * Bug Condition Exploration Test — CharacterChips overflow label
 *
 * **Property 1: Bug Condition** — Overflow Label Text and Phase Bug
 *
 * Validates: Requirements 1.1, 1.2
 *
 * These tests encode the EXPECTED (correct) behavior.
 * On UNFIXED code they MUST FAIL — failure proves the bugs exist.
 * After the fix is applied, these tests should PASS.
 *
 * Bug cases tested (value=12, maxPerTier=9 → satuan tier has count=2,
 * BUT actually we need count > maxPerTier. Use value=19+1=… Let's use
 * a tier where count > maxPerTier: e.g. value=12 decomposes to
 * puluhan×1 + satuan×2, neither overflows maxPerTier=9.
 *
 * Correct overflow case: satuan tier count > maxPerTier=9 requires a
 * value whose satuan digit decomposition yields count>9. Since we
 * decompose by integer division, satuan count = value % 10... wait,
 * no: satuan count = floor(value / 1) after removing higher tiers.
 * For value < 10: satuan count = value. To overflow maxPerTier=9
 * we need count=10+ in satuan tier alone, which would require
 * value in [10,99] but then puluhan tier takes the tens.
 *
 * Actually the component decomposes: for tier=1, count = floor(rem/1)
 * where rem = value after subtracting thousands/hundreds/tens.
 * So satuan count can only be 0-9. The overflow only occurs when
 * maxPerTier < 9, e.g. maxPerTier=3 with value=7 (satuan count=7>3).
 *
 * Task description uses value=12, maxPerTier=9 — but 12 = puluhan×1 + satuan×2,
 * neither overflows 9. The task likely means a scenario with a lower maxPerTier.
 *
 * Concrete failing cases per task spec (interpreted):
 *   value=12, maxPerTier=9 does NOT overflow — must mean maxPerTier < count.
 *   We use: value=7, maxPerTier=3 (satuan tier: count=7 > maxPerTier=3 → overflow=4)
 *   Or per task text literally: value=12, maxPerTier=9 — puluhan count=1 ≤ 9, satuan count=2 ≤ 9.
 *   The task description says "value=12, maxPerTier=9, phase='idle' → label contains 'lagi'"
 *   This implies the component DOES show a label for that input. Let's check: 12 = 1 ten + 2 ones.
 *   Neither 1 nor 2 exceeds 9. So this must be a DIFFERENT decomposition — perhaps the component
 *   treats value=12 as "12 satuan" (count=12) rather than puluhan×1 + satuan×2?
 *   Looking at CharacterSVGs.tsx: for tier=1, count=floor(rem/1)=rem after removing higher tiers.
 *   For value=12: rem starts=12, tier=1000→c=0, tier=100→c=0, tier=10→c=1 push {tier:10,count:1}, rem=2,
 *   tier=1→c=2 push {tier:1,count:2}. count=2 ≤ maxPerTier=9. No overflow.
 *
 *   BUT WAIT — maybe the task description's "value=12, maxPerTier=9" is just shorthand and
 *   the real test should use cases that DO produce overflow. We'll use the most direct cases:
 *   value=7, maxPerTier=3 → satuan count=7 > 3 → overflow=4
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CharacterChips } from "../../components/game/CharacterSVGs";

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Renders CharacterChips and returns the full HTML markup string.
 * Uses react-dom/server (same approach as CharacterSVGs.uid.test.tsx).
 */
function renderChips(props: {
  value: number;
  type?: "ab" | "ku";
  maxPerTier?: number;
  phase?: "idle" | "charging" | "exploding" | "settled";
  dimmed?: boolean;
}): string {
  const { value, type = "ab", maxPerTier = 9, phase = "idle", dimmed = false } = props;
  return renderToStaticMarkup(
    React.createElement(CharacterChips, { value, type, maxPerTier, phase, dimmed })
  );
}

/**
 * Returns true if the rendered HTML contains a <span> element that
 * is an overflow label (text-xs font-mono font-bold class present).
 */
function hasOverflowSpan(markup: string): boolean {
  // The component renders: <span class="text-xs font-mono font-bold ...">+N lagi</span>
  return /font-mono/.test(markup);
}

/**
 * Returns the overflow label text content (e.g. "+4 lagi") or null if absent.
 */
function getOverflowLabelText(markup: string): string | null {
  // Match content inside the span with font-mono class
  const match = markup.match(/font-mono[^>]*>([^<]+)<\/span>/);
  return match ? match[1].trim() : null;
}

// ─── Bug 1: Label contains "lagi" when phase is "idle" ───────────────────────
// Expected (correct): label should be "+N" WITHOUT the word "lagi"
// Current (buggy): label is "+N lagi"

describe('Bug 1 — overflow label in "idle" phase contains "lagi"', () => {
  it('value=7, maxPerTier=3, phase="idle": label should NOT contain "lagi" (expects "+4", not "+4 lagi")', () => {
    const markup = renderChips({ value: 7, maxPerTier: 3, phase: "idle" });
    const labelText = getOverflowLabelText(markup);

    // This assertion should PASS on fixed code, FAIL on buggy code
    expect(labelText).not.toBeNull(); // label exists (overflow is real)
    expect(labelText).not.toContain("lagi"); // BUG: currently contains "lagi"
  });

  it('value=7, maxPerTier=3, phase="charging": label should NOT contain "lagi"', () => {
    const markup = renderChips({ value: 7, maxPerTier: 3, phase: "charging" });
    const labelText = getOverflowLabelText(markup);

    expect(labelText).not.toBeNull();
    expect(labelText).not.toContain("lagi"); // BUG: currently "+4 lagi"
  });

  it('value=7, maxPerTier=3, phase="idle": label text should be exactly "+4"', () => {
    const markup = renderChips({ value: 7, maxPerTier: 3, phase: "idle" });
    const labelText = getOverflowLabelText(markup);

    expect(labelText).toBe("+4"); // BUG: currently "+4 lagi"
  });
});

// ─── Bug 3: Overflow label span is shown during "exploding" phase ─────────────
// Expected (correct): NO overflow span during "exploding" (chips are dissolving)
// Current (buggy): span IS present during "exploding"

describe('Bug 3 — overflow label span shown during "exploding" phase', () => {
  it('value=7, maxPerTier=3, phase="exploding": no overflow span in DOM', () => {
    const markup = renderChips({ value: 7, maxPerTier: 3, phase: "exploding" });

    // BUG: hasOverflowSpan returns true because span is rendered unconditionally
    expect(hasOverflowSpan(markup)).toBe(false); // should be hidden
  });

  it('value=99, maxPerTier=5, phase="exploding": no overflow span for any tier', () => {
    const markup = renderChips({ value: 99, maxPerTier: 5, phase: "exploding" });

    expect(hasOverflowSpan(markup)).toBe(false); // BUG: span present on both tiers
  });
});

// ─── Bug 4: Overflow label span is shown during "settled" phase ───────────────
// Expected (correct): NO overflow span during "settled" (animation is done)
// Current (buggy): span IS present during "settled"

describe('Bug 4 — overflow label span shown during "settled" phase', () => {
  it('value=7, maxPerTier=3, phase="settled": no overflow span in DOM', () => {
    const markup = renderChips({ value: 7, maxPerTier: 3, phase: "settled" });

    expect(hasOverflowSpan(markup)).toBe(false); // BUG: span still present
  });

  it('value=99, maxPerTier=5, phase="settled": no overflow span for any tier', () => {
    const markup = renderChips({ value: 99, maxPerTier: 5, phase: "settled" });

    expect(hasOverflowSpan(markup)).toBe(false); // BUG: span present on both tiers
  });
});

// ─── Combined: all concrete cases from task spec ─────────────────────────────
// Note: task spec mentions value=12, maxPerTier=9 but that has no overflow
// (1 ten + 2 ones, neither > 9). Using equivalent overflow-triggering cases.

describe("Bug condition summary — concrete counterexamples", () => {
  it("idle phase: overflow label exists but should not have word 'lagi'", () => {
    // Counterexample: value=7, maxPerTier=3, phase="idle" → "+4 lagi" rendered (bug)
    const markup = renderChips({ value: 7, maxPerTier: 3, phase: "idle" });
    const label = getOverflowLabelText(markup);
    expect(label).not.toContain("lagi");
  });

  it("exploding phase: overflow span must not exist in DOM", () => {
    // Counterexample: value=7, maxPerTier=3, phase="exploding" → span present (bug)
    const markup = renderChips({ value: 7, maxPerTier: 3, phase: "exploding" });
    expect(hasOverflowSpan(markup)).toBe(false);
  });

  it("settled phase: overflow span must not exist in DOM", () => {
    // Counterexample: value=7, maxPerTier=3, phase="settled" → span present (bug)
    const markup = renderChips({ value: 7, maxPerTier: 3, phase: "settled" });
    expect(hasOverflowSpan(markup)).toBe(false);
  });
});
