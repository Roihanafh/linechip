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
import { render, screen } from "@testing-library/react";

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
