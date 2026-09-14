import * as fc from "fast-check";
import { inputPanelProps } from "@/lib/model-chip/inputPanelProps";
import type { InputPanelDerived } from "@/lib/model-chip/inputPanelProps";

// Feature: model-chip-refactor, Property 4: inputPanelProps has complete shape
// Validates: Requirements 2.2
test("inputPanelProps: returns object with all required keys for any val", () => {
  const requiredKeys: (keyof InputPanelDerived)[] = [
    "isPos",
    "isNeg",
    "absVal",
    "type",
    "cardBorder",
    "iconBg",
    "iconLabel",
    "titleColor",
    "troopName",
    "subtitle",
    "inputColor",
    "inputBorder",
    "svgBg",
  ];
  fc.assert(
    fc.property(fc.integer({ min: -9999, max: 9999 }), (val) => {
      const result = inputPanelProps(val);
      return requiredKeys.every((k) => k in result);
    }),
    { numRuns: 200 }
  );
});

// Feature: model-chip-refactor, Property 5: inputPanelProps sign consistency
// Validates: Requirements 2.2, 5.1
test("inputPanelProps: sign flags and absVal are consistent", () => {
  fc.assert(
    fc.property(fc.integer({ min: -9999, max: 9999 }), (val) => {
      const result = inputPanelProps(val);
      if (val > 0 && !(result.isPos === true && result.isNeg === false && result.type === "ab"))
        return false;
      if (val < 0 && !(result.isPos === false && result.isNeg === true && result.type === "ku"))
        return false;
      if (val === 0 && !(result.isPos === false && result.isNeg === false)) return false;
      if (result.absVal !== Math.abs(val)) return false;
      return true;
    }),
    { numRuns: 200 }
  );
});
