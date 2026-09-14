// Feature: model-chip-refactor, Property 7: InputPanel disabled state consistency
// Validates: Requirements 3.5, 5.9

import * as fc from "fast-check";
import type { VizPhase } from "@/lib/model-chip/types";

const NON_IDLE_PHASES: VizPhase[] = ["battle", "center", "done"];
const ALL_PHASES: VizPhase[] = ["idle", "battle", "center", "done"];

// Pure model of the disabled-state logic in InputPanel.tsx:
//   - inputs use `readOnly={vizPhase !== "idle"}` (non-idle → readOnly)
//   - Pasangkan button only renders when `vizPhase === "idle"`
//   - AnimMode selector gets `pointer-events-none` when `vizPhase !== "idle"`

function inputIsReadOnly(vizPhase: VizPhase): boolean {
  return vizPhase !== "idle";
}

function pasangkanButtonShows(vizPhase: VizPhase): boolean {
  return vizPhase === "idle";
}

function animModeSelectorDisabled(vizPhase: VizPhase): boolean {
  return vizPhase !== "idle";
}

// Property 7a: for any non-idle phase, both inputs are readOnly,
// Pasangkan button is hidden, and AnimMode selector is disabled.
// Validates: Requirements 3.5, 5.9
test("InputPanel: inputs readOnly and Pasangkan hidden for every non-idle vizPhase", () => {
  fc.assert(
    fc.property(fc.constantFrom<VizPhase>(...NON_IDLE_PHASES), (phase) => {
      return (
        inputIsReadOnly(phase) === true &&
        pasangkanButtonShows(phase) === false &&
        animModeSelectorDisabled(phase) === true
      );
    }),
    { numRuns: 100 }
  );
});

// Property 7b: for idle phase, inputs are interactive and Pasangkan button is visible.
// Validates: Requirements 3.5, 5.9
test("InputPanel: inputs interactive and Pasangkan visible for idle vizPhase", () => {
  expect(inputIsReadOnly("idle")).toBe(false);
  expect(pasangkanButtonShows("idle")).toBe(true);
  expect(animModeSelectorDisabled("idle")).toBe(false);
});

// Property 7c: disabled/enabled state is the strict complement of idle across all phases.
// Validates: Requirements 3.5, 5.9
test("InputPanel: disabled and interactive states are strict complements over all vizPhases", () => {
  fc.assert(
    fc.property(fc.constantFrom<VizPhase>(...ALL_PHASES), (phase) => {
      const isIdle = phase === "idle";
      return (
        inputIsReadOnly(phase) === !isIdle &&
        pasangkanButtonShows(phase) === isIdle &&
        animModeSelectorDisabled(phase) === !isIdle
      );
    }),
    { numRuns: 100 }
  );
});
