/** @jest-environment jsdom */
/**
 * Unit tests for ArenaPanel — alliance branch (vizPhase === "alliance").
 *
 * Tests Requirements 4.1–4.6, 5.1–5.3, and 7.7 (battle regression).
 *
 * We use @testing-library/react to mount ArenaPanel with mocked child
 * components so that only ArenaPanel's own rendering logic is under test.
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";

// ─── Mock all heavy child components ─────────────────────────────────────────

// Capture props passed to AllianceStage for assertion
let lastAllianceStageProps: Record<string, unknown> = {};

jest.mock("@/components/game/AllianceStage", () => ({
  AllianceStage: (props: Record<string, unknown>) => {
    lastAllianceStageProps = props;
    return React.createElement("div", { "data-testid": "mock-alliance-stage", "data-faction": props.faction as string });
  },
}));

jest.mock("@/components/model-chip/ArenaBattle", () => ({
  ArenaBattle: () => React.createElement("div", { "data-testid": "mock-arena-battle" }),
}));

jest.mock("@/components/model-chip/ArenaCenter", () => ({
  ArenaCenter: () => React.createElement("div", { "data-testid": "mock-arena-center" }),
}));

jest.mock("@/components/model-chip/ArenaDone", () => ({
  ArenaDone: () => React.createElement("div", { "data-testid": "mock-arena-done" }),
}));

jest.mock("@/components/game/CharacterSVGs", () => ({
  dominantPlace: (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1000) return "ribuan";
    if (abs >= 100)  return "ratusan";
    if (abs >= 10)   return "puluhan";
    return "satuan";
  },
  TIER_TO_PLACE: { 1: "satuan", 10: "puluhan", 100: "ratusan", 1000: "ribuan" },
  CharacterChips: () => React.createElement("div", { "data-testid": "mock-character-chips" }),
}));

// ─── Import the component under test ─────────────────────────────────────────

import { ArenaPanel, type ArenaPanelProps } from "@/components/model-chip/ArenaPanel";

// ─── Shared defaults ──────────────────────────────────────────────────────────

function makeProps(overrides: Partial<ArenaPanelProps> = {}): ArenaPanelProps {
  return {
    snapshot: { bil1: 3, bil2: 5 },
    vizPhase: "alliance",
    centerExiting: false,
    snapTotalPos: 0,
    snapTotalNeg: 0,
    pairs: 0,
    remaining: 0,
    tierGroups: [],
    tierIdx: 0,
    pairInTier: 0,
    stepPhase: "idle",
    neutralised: new Map(),
    animSpeed: 1,
    onPairDone: jest.fn(),
    onAllianceDone: jest.fn(),
    stepIdx: 0,
    currentDecomposeStep: null,
    onDecomposeDone: jest.fn(),
    ...overrides,
  };
}

// ─── Requirement 4: ArenaPanel Alliance Branch ────────────────────────────────

describe("Req 4.1: AllianceStage rendered when vizPhase === 'alliance'", () => {
  it("renders AllianceStage inside the arena card", () => {
    render(React.createElement(ArenaPanel, makeProps()));
    expect(screen.getByTestId("mock-alliance-stage")).toBeTruthy();
  });

  it("does NOT render ArenaBattle when vizPhase === 'alliance'", () => {
    render(React.createElement(ArenaPanel, makeProps()));
    expect(screen.queryByTestId("mock-arena-battle")).toBeNull();
  });

  it("does NOT render ArenaCenter when vizPhase === 'alliance'", () => {
    render(React.createElement(ArenaPanel, makeProps()));
    expect(screen.queryByTestId("mock-arena-center")).toBeNull();
  });

  it("does NOT render ArenaDone when vizPhase === 'alliance'", () => {
    render(React.createElement(ArenaPanel, makeProps()));
    expect(screen.queryByTestId("mock-arena-done")).toBeNull();
  });
});

describe("Req 4.2: AllianceStage receives bil1Value=snapshot.bil1 and bil2Value=snapshot.bil2", () => {
  it("passes bil1Value equal to snapshot.bil1", () => {
    render(React.createElement(ArenaPanel, makeProps({ snapshot: { bil1: 7, bil2: 4 } })));
    expect(lastAllianceStageProps.bil1Value).toBe(7);
  });

  it("passes bil2Value equal to snapshot.bil2", () => {
    render(React.createElement(ArenaPanel, makeProps({ snapshot: { bil1: 7, bil2: 4 } })));
    expect(lastAllianceStageProps.bil2Value).toBe(4);
  });

  it("passes correct values for negative bil1/bil2 (ku faction)", () => {
    render(React.createElement(ArenaPanel, makeProps({ snapshot: { bil1: -3, bil2: -9 } })));
    expect(lastAllianceStageProps.bil1Value).toBe(-3);
    expect(lastAllianceStageProps.bil2Value).toBe(-9);
  });
});

describe("Req 4.3: faction derived from snapshot.bil1 sign", () => {
  it("faction === 'ab' when snapshot.bil1 > 0", () => {
    render(React.createElement(ArenaPanel, makeProps({ snapshot: { bil1: 5, bil2: 3 } })));
    expect(lastAllianceStageProps.faction).toBe("ab");
  });

  it("faction === 'ku' when snapshot.bil1 < 0", () => {
    render(React.createElement(ArenaPanel, makeProps({ snapshot: { bil1: -5, bil2: -3 } })));
    expect(lastAllianceStageProps.faction).toBe("ku");
  });
});

describe("Req 4.4: AllianceStage receives autoStart={true} and hideControls={true}", () => {
  it("passes autoStart={true}", () => {
    render(React.createElement(ArenaPanel, makeProps()));
    expect(lastAllianceStageProps.autoStart).toBe(true);
  });

  it("passes hideControls={true}", () => {
    render(React.createElement(ArenaPanel, makeProps()));
    expect(lastAllianceStageProps.hideControls).toBe(true);
  });
});

describe("Req 4.5: AllianceStage receives animSpeed as speed prop", () => {
  it("passes animSpeed=1 as speed={1}", () => {
    render(React.createElement(ArenaPanel, makeProps({ animSpeed: 1 })));
    expect(lastAllianceStageProps.speed).toBe(1);
  });

  it("passes animSpeed=2 as speed={2}", () => {
    render(React.createElement(ArenaPanel, makeProps({ animSpeed: 2 })));
    expect(lastAllianceStageProps.speed).toBe(2);
  });

  it("passes animSpeed=0.5 as speed={0.5}", () => {
    render(React.createElement(ArenaPanel, makeProps({ animSpeed: 0.5 })));
    expect(lastAllianceStageProps.speed).toBe(0.5);
  });
});

describe("Req 4.6: AllianceStage.onComplete wired to onAllianceDone", () => {
  it("calling onComplete fires onAllianceDone", () => {
    const onAllianceDone = jest.fn();
    render(React.createElement(ArenaPanel, makeProps({ onAllianceDone })));

    const onComplete = lastAllianceStageProps.onComplete as () => void;
    expect(typeof onComplete).toBe("function");
    onComplete();
    expect(onAllianceDone).toHaveBeenCalledTimes(1);
  });
});

// ─── Requirement 5: Arena Header Text for Alliance Phase ──────────────────────

describe("Req 5.1: arena-header shows '🤝 Persekutuan!' when vizPhase === 'alliance'", () => {
  it("header element contains '🤝 Persekutuan!'", () => {
    render(React.createElement(ArenaPanel, makeProps()));
    const header = screen.getByTestId("arena-header");
    expect(header.textContent).toBe("🤝 Persekutuan!");
  });
});

describe("Req 5.2: status badge shows 'Bergabung' when vizPhase === 'alliance'", () => {
  it("status text contains 'Bergabung'", () => {
    const { container } = render(React.createElement(ArenaPanel, makeProps()));
    // Status badge: second span in the header row with font-mono class
    // Looking for the small status indicator next to the header
    const allFontMono = container.querySelectorAll("span.font-mono");
    const statusEl = Array.from(allFontMono).find(
      (el) => el.classList.contains("text-\\[10px\\]") || el.textContent === "Bergabung"
    );
    expect(statusEl).toBeTruthy();
    expect(statusEl!.textContent).toBe("Bergabung");
  });
});

describe("Req 5.3: top accent bar class for alliance faction", () => {
  it("accent bar has bg-intblue (no animate-pulse) when faction === 'ab'", () => {
    const { container } = render(
      React.createElement(ArenaPanel, makeProps({ snapshot: { bil1: 4, bil2: 2 } }))
    );
    const bar = container.querySelector(".absolute.top-0");
    expect(bar).not.toBeNull();
    expect(bar!.className).toContain("bg-intblue");
    expect(bar!.className).not.toContain("animate-pulse");
  });

  it("accent bar has bg-intpink (no animate-pulse) when faction === 'ku'", () => {
    const { container } = render(
      React.createElement(ArenaPanel, makeProps({ snapshot: { bil1: -4, bil2: -2 } }))
    );
    const bar = container.querySelector(".absolute.top-0");
    expect(bar).not.toBeNull();
    expect(bar!.className).toContain("bg-intpink");
    expect(bar!.className).not.toContain("animate-pulse");
  });
});

// ─── Requirement 7.7: Battle path unaffected (regression guard) ───────────────

describe("Req 7.7: ArenaBattle rendered (not AllianceStage) when vizPhase === 'battle'", () => {
  function makeBattleProps(): ArenaPanelProps {
    return makeProps({
      vizPhase: "battle",
      snapshot: { bil1: 5, bil2: -3 },
      snapTotalPos: 5,
      snapTotalNeg: 3,
      pairs: 3,
      remaining: 2,
    });
  }

  it("renders ArenaBattle when vizPhase === 'battle'", () => {
    render(React.createElement(ArenaPanel, makeBattleProps()));
    expect(screen.getByTestId("mock-arena-battle")).toBeTruthy();
  });

  it("does NOT render AllianceStage when vizPhase === 'battle'", () => {
    render(React.createElement(ArenaPanel, makeBattleProps()));
    expect(screen.queryByTestId("mock-alliance-stage")).toBeNull();
  });

  it("arena-header shows '⚔️ Pertarungan!' when vizPhase === 'battle'", () => {
    render(React.createElement(ArenaPanel, makeBattleProps()));
    expect(screen.getByTestId("arena-header").textContent).toBe("⚔️ Pertarungan!");
  });
});

// ─── fast-check import (used by Property 7 below) ────────────────────────────
import * as fc from "fast-check";

// ─── Feature: same-type-pool-animation ───────────────────────────────────────

// Feature: same-type-pool-animation, Property 6: AlliancePoolPanel selalu hadir saat vizPhase === "alliance"
describe("Property 6 [same-type-pool-animation]: alliance-pool present when vizPhase === 'alliance'", () => {
  it("before onComplete: shows two separate bil columns, not alliance-pool", () => {
    const { container } = render(React.createElement(ArenaPanel, makeProps()));
    // alliance-pool is NOT visible yet (merged=false)
    expect(container.querySelector("[data-testid='alliance-pool']")).toBeNull();
    // Two columns exist: Bil.1 and Bil.2 headers
    const spans = container.querySelectorAll("span.font-mono");
    const bil1 = Array.from(spans).find((el) => el.textContent?.includes("Bil.1:"));
    const bil2 = Array.from(spans).find((el) => el.textContent?.includes("Bil.2:"));
    expect(bil1).toBeTruthy();
    expect(bil2).toBeTruthy();
  });

  it("after onComplete: renders [data-testid=alliance-pool] when vizPhase === 'alliance'", () => {
    const { container } = render(React.createElement(ArenaPanel, makeProps()));
    act(() => {
      (lastAllianceStageProps.onComplete as () => void)();
    });
    expect(container.querySelector("[data-testid='alliance-pool']")).not.toBeNull();
  });

  it("does NOT render alliance-pool when vizPhase === 'battle'", () => {
    const { container } = render(React.createElement(ArenaPanel, makeProps({
      vizPhase: "battle",
      snapshot: { bil1: 5, bil2: -3 },
      snapTotalPos: 5, snapTotalNeg: 3, pairs: 3, remaining: 2,
    })));
    expect(container.querySelector("[data-testid='alliance-pool']")).toBeNull();
  });

  it("does NOT render alliance-pool when vizPhase === 'done'", () => {
    const { container } = render(React.createElement(ArenaPanel, makeProps({ vizPhase: "done" })));
    expect(container.querySelector("[data-testid='alliance-pool']")).toBeNull();
  });
});

// Feature: same-type-pool-animation, Property 7: data-total selalu akurat
describe("Property 7 [same-type-pool-animation]: data-total equals |bil1| + |bil2|", () => {
  it("data-total is correct for positive bil1 and bil2", () => {
    const { container } = render(React.createElement(ArenaPanel, makeProps({ snapshot: { bil1: 3, bil2: 5 } })));
    act(() => { (lastAllianceStageProps.onComplete as () => void)(); });
    const pool = container.querySelector("[data-testid='alliance-pool']");
    expect(pool?.getAttribute("data-total")).toBe("8");
  });

  it("data-total is correct for negative bil1 and bil2", () => {
    const { container } = render(React.createElement(ArenaPanel, makeProps({ snapshot: { bil1: -4, bil2: -6 } })));
    act(() => { (lastAllianceStageProps.onComplete as () => void)(); });
    const pool = container.querySelector("[data-testid='alliance-pool']");
    expect(pool?.getAttribute("data-total")).toBe("10");
  });

  it("property: data-total === String(|bil1| + |bil2|) for any same-sign integer values", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -9999, max: 9999 }).filter(n => n !== 0),
        fc.integer({ min: -9999, max: 9999 }).filter(n => n !== 0),
        (bil1, bil2) => {
          // Normalise to same-sign (valid alliance case)
          const b1 = Math.abs(bil1);
          const b2 = Math.abs(bil2);
          const sign = bil1 > 0 ? 1 : -1;
          const snapshot = { bil1: sign * b1, bil2: sign * b2 };
          const { container, unmount } = render(
            React.createElement(ArenaPanel, makeProps({ snapshot }))
          );
          // Trigger merge
          act(() => { (lastAllianceStageProps.onComplete as () => void)(); });
          const pool = container.querySelector("[data-testid='alliance-pool']");
          expect(pool?.getAttribute("data-total")).toBe(String(b1 + b2));
          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });
});

// Feature: same-type-pool-animation, Property 8: Header faction-aware selalu benar
describe("Property 8 [same-type-pool-animation]: Header shows correct Total sign", () => {
  it("shows 'Total: +N' for ab faction (bil1 > 0)", () => {
    const { container } = render(React.createElement(ArenaPanel, makeProps({ snapshot: { bil1: 3, bil2: 5 } })));
    act(() => { (lastAllianceStageProps.onComplete as () => void)(); });
    const header = container.querySelector(".text-intblue.font-mono");
    expect(header?.textContent).toContain("Total: +8");
  });

  it("shows 'Total: \u2212N' for ku faction (bil1 < 0)", () => {
    const { container } = render(React.createElement(ArenaPanel, makeProps({ snapshot: { bil1: -4, bil2: -6 } })));
    act(() => { (lastAllianceStageProps.onComplete as () => void)(); });
    const header = container.querySelector(".text-intpink.font-mono");
    expect(header?.textContent).toContain("Total: \u221210");
  });
});

// Feature: same-type-pool-animation, Property 9: aria-hidden pada Pool_Gabungan
describe("Property 9 [same-type-pool-animation]: alliance-pool has aria-hidden='true'", () => {
  it("alliance-pool container has aria-hidden='true'", () => {
    const { container } = render(React.createElement(ArenaPanel, makeProps()));
    act(() => { (lastAllianceStageProps.onComplete as () => void)(); });
    const pool = container.querySelector("[data-testid='alliance-pool']");
    expect(pool?.getAttribute("aria-hidden")).toBe("true");
  });
});

// Feature: same-type-pool-animation, Property 10: Header dan status ArenaPanel saat alliance
describe("Property 10 [same-type-pool-animation]: ArenaPanel header shows Persekutuan and Bergabung", () => {
  it("arena-header shows '\uD83E\uDD1D Persekutuan!' during alliance", () => {
    render(React.createElement(ArenaPanel, makeProps()));
    expect(screen.getByTestId("arena-header").textContent).toBe("\uD83E\uDD1D Persekutuan!");
  });
});

// Feature: same-type-pool-animation, Property 11: Accent bar tidak animate-pulse saat alliance
describe("Property 11 [same-type-pool-animation]: Accent bar has no animate-pulse during alliance", () => {
  it("accent bar does not have animate-pulse class for ab faction", () => {
    const { container } = render(React.createElement(ArenaPanel, makeProps({ snapshot: { bil1: 5, bil2: 3 } })));
    const bar = container.querySelector(".absolute.top-0");
    expect(bar?.className).not.toContain("animate-pulse");
  });

  it("accent bar does not have animate-pulse class for ku faction", () => {
    const { container } = render(React.createElement(ArenaPanel, makeProps({ snapshot: { bil1: -5, bil2: -3 } })));
    const bar = container.querySelector(".absolute.top-0");
    expect(bar?.className).not.toContain("animate-pulse");
  });

  it("accent bar HAS animate-pulse during battle (regression check)", () => {
    const { container } = render(React.createElement(ArenaPanel, makeProps({
      vizPhase: "battle",
      snapshot: { bil1: 5, bil2: -3 },
      snapTotalPos: 5, snapTotalNeg: 3, pairs: 3, remaining: 2,
    })));
    const bar = container.querySelector(".absolute.top-0");
    expect(bar?.className).toContain("animate-pulse");
  });
});
