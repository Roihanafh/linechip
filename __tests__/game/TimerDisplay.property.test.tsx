/**
 * Property-based tests for TimerDisplay (components/game/TimerDisplay.tsx)
 *
 * Feature: game-timed-scoring
 * Task 4.2
 *
 * Properties covered:
 *   Property 6: MM:SS format correct           — Validates: Requirements 5.1
 *   Property 7: Speed label matches range       — Validates: Requirements 5.2, 5.3, 5.4, 5.5
 *   Property 8: aria-label on timer element     — Validates: Requirements 7.1, 7.2
 *
 * @jest-environment jsdom
 */

import * as fc from "fast-check";
import React from "react";
import { render, screen } from "@testing-library/react";
import { TimerDisplay } from "@/components/game/TimerDisplay";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the expected MM:SS string for a given elapsed time in seconds.
 * Mirrors the logic inside TimerDisplay.
 */
function toMMSS(t: number): string {
  const floored = Math.floor(t);
  const minutes = Math.floor(floored / 60);
  const seconds = floored % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Returns the expected speed tier label for a given elapsed time.
 * Mirrors getSpeedTier() inside TimerDisplay.
 */
function getExpectedLabel(t: number): { label: string; colorClass: string } {
  const floored = Math.floor(t);
  if (floored < 30) return { label: "Sangat Cepat 🔥", colorClass: "text-success" };
  if (floored < 60) return { label: "Cepat ⚡",        colorClass: "text-intblue" };
  if (floored < 90) return { label: "Masih Oke 👍",    colorClass: "text-amber-500" };
  return              { label: "Waktu Habis ⏰",         colorClass: "text-error" };
}

// ─── Property 6: MM:SS format correct ────────────────────────────────────────
// Feature: game-timed-scoring, Property 6: TimerDisplay renders elapsedTime in correct MM:SS format
// Validates: Requirements 5.1

describe("Property 6: TimerDisplay renders MM:SS format correctly", () => {
  it("rendered time text matches /^\\d{2,}:\\d{2}$/ and equals toMMSS(t) for t in [0, 7200]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 7200 }), (t) => {
        const { unmount } = render(<TimerDisplay elapsedTime={t} />);

        const expected = toMMSS(t);
        // The time span has aria-label "Waktu berlalu: X menit Y detik"
        // We find it by its visible text content which is the MM:SS string
        const timeSpan = screen.getByText(expected);

        expect(timeSpan).toBeTruthy();
        // Minutes padded to at least 2 digits; seconds always exactly 2 digits
        expect(timeSpan.textContent).toMatch(/^\d{2,}:\d{2}$/);
        expect(timeSpan.textContent).toBe(expected);

        unmount();
      }),
      { numRuns: 200 }
    );
  });

  it("minutes and seconds are individually correct for t=3725 (62m 5s)", () => {
    const { unmount } = render(<TimerDisplay elapsedTime={3725} />);
    const timeSpan = screen.getByText("62:05");
    expect(timeSpan.textContent).toBe("62:05");
    unmount();
  });
});

// ─── Property 7: Speed label matches range ───────────────────────────────────
// Feature: game-timed-scoring, Property 7: Speed label matches the correct range and color for any elapsedTime
// Validates: Requirements 5.2, 5.3, 5.4, 5.5

describe("Property 7: Speed label matches the correct range for any elapsedTime", () => {
  it("label 'Sangat Cepat 🔥' is shown for t in [0, 29]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 29 }), (t) => {
        const { unmount } = render(<TimerDisplay elapsedTime={t} />);
        const labelSpan = screen.getByText("Sangat Cepat 🔥");
        expect(labelSpan).toBeTruthy();
        expect(labelSpan.className).toContain("text-success");
        unmount();
      }),
      { numRuns: 200 }
    );
  });

  it("label 'Cepat ⚡' is shown for t in [30, 59]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 30, max: 59 }), (t) => {
        const { unmount } = render(<TimerDisplay elapsedTime={t} />);
        const labelSpan = screen.getByText("Cepat ⚡");
        expect(labelSpan).toBeTruthy();
        expect(labelSpan.className).toContain("text-intblue");
        unmount();
      }),
      { numRuns: 200 }
    );
  });

  it("label 'Masih Oke 👍' is shown for t in [60, 89]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 60, max: 89 }), (t) => {
        const { unmount } = render(<TimerDisplay elapsedTime={t} />);
        const labelSpan = screen.getByText("Masih Oke 👍");
        expect(labelSpan).toBeTruthy();
        expect(labelSpan.className).toContain("text-amber-500");
        unmount();
      }),
      { numRuns: 200 }
    );
  });

  it("label 'Waktu Habis ⏰' is shown for t >= 90", () => {
    fc.assert(
      fc.property(fc.integer({ min: 90, max: 7200 }), (t) => {
        const { unmount } = render(<TimerDisplay elapsedTime={t} />);
        const labelSpan = screen.getByText("Waktu Habis ⏰");
        expect(labelSpan).toBeTruthy();
        expect(labelSpan.className).toContain("text-error");
        unmount();
      }),
      { numRuns: 200 }
    );
  });

  it("each t in [0, 7200] renders exactly the label corresponding to its range", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 7200 }), (t) => {
        const { unmount } = render(<TimerDisplay elapsedTime={t} />);
        const { label } = getExpectedLabel(t);
        const labelSpan = screen.getByText(label);
        expect(labelSpan).toBeTruthy();
        unmount();
      }),
      { numRuns: 200 }
    );
  });
});

// ─── Property 8: aria-label on timer element is correct ──────────────────────
// Feature: game-timed-scoring, Property 8: aria-label on timer element matches "Waktu berlalu: X menit Y detik"
// Validates: Requirements 7.1, 7.2

describe("Property 8: aria-label on timer element matches 'Waktu berlalu: X menit Y detik'", () => {
  it("aria-label contains correct minutes and seconds for t in [0, 7200]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 7200 }), (t) => {
        const { unmount } = render(<TimerDisplay elapsedTime={t} />);

        const floored = Math.floor(t);
        const expectedMinutes = Math.floor(floored / 60);
        const expectedSeconds = floored % 60;
        const expectedAriaLabel = `Waktu berlalu: ${expectedMinutes} menit ${expectedSeconds} detik`;

        const timeSpan = screen.getByLabelText(expectedAriaLabel);
        expect(timeSpan).toBeTruthy();
        // Must have aria-live="polite" per Requirement 7.1
        expect(timeSpan.getAttribute("aria-live")).toBe("polite");

        unmount();
      }),
      { numRuns: 200 }
    );
  });

  it("aria-label format is 'Waktu berlalu: 0 menit 0 detik' for t=0", () => {
    render(<TimerDisplay elapsedTime={0} />);
    const timeSpan = screen.getByLabelText("Waktu berlalu: 0 menit 0 detik");
    expect(timeSpan).toBeTruthy();
    expect(timeSpan.getAttribute("aria-live")).toBe("polite");
  });

  it("aria-label is 'Waktu berlalu: 1 menit 5 detik' for t=65", () => {
    render(<TimerDisplay elapsedTime={65} />);
    const timeSpan = screen.getByLabelText("Waktu berlalu: 1 menit 5 detik");
    expect(timeSpan).toBeTruthy();
    expect(timeSpan.textContent).toBe("01:05");
  });
});

// ─── Example tests ────────────────────────────────────────────────────────────

describe("TimerDisplay — example: className forwarded to root element", () => {
  it("applies custom className to the root div", () => {
    const { container } = render(
      <TimerDisplay elapsedTime={10} className="mt-2 custom-class" />
    );
    const root = container.firstChild as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.className).toContain("mt-2");
    expect(root.className).toContain("custom-class");
  });

  it("works without className (optional prop)", () => {
    expect(() => {
      const { unmount } = render(<TimerDisplay elapsedTime={5} />);
      unmount();
    }).not.toThrow();
  });
});

describe("TimerDisplay — example: edge cases", () => {
  it("negative elapsedTime shows '00:00' and 'Sangat Cepat 🔥'", () => {
    render(<TimerDisplay elapsedTime={-1} />);
    // Invalid → '00:00' displayed
    const timeSpan = screen.getByText("00:00");
    expect(timeSpan).toBeTruthy();
    expect(screen.getByText("Sangat Cepat 🔥")).toBeTruthy();
  });

  it("NaN elapsedTime shows '00:00' and fallback aria-label", () => {
    render(<TimerDisplay elapsedTime={NaN} />);
    const timeSpan = screen.getByLabelText("Waktu tidak tersedia");
    expect(timeSpan).toBeTruthy();
    expect(timeSpan.textContent).toBe("00:00");
  });

  it("speed tier label aria-label reflects the active tier label", () => {
    render(<TimerDisplay elapsedTime={10} />);
    // Speed label span should have aria-label mirroring the tier text
    const labelSpan = screen.getByLabelText("Sangat Cepat 🔥");
    expect(labelSpan).toBeTruthy();
    expect(labelSpan.textContent).toBe("Sangat Cepat 🔥");
  });
});
