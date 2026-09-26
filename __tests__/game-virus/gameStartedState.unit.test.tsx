/**
 * Unit tests for `gameStarted` state in GameVirusPage
 * (app/game-virus/page.tsx)
 *
 * Feature: game-intro-popup
 * Task 4.3
 *
 * Tests:
 *   1. Before clicking "Mulai" — modal with role="dialog" is visible in DOM
 *   2. After clicking the "Mulai" button — modal NOT visible, startTimer called once
 *
 * Requirements: 1.2, 4.2
 *
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

// ─── Mock heavy dependencies before importing the page ────────────────────────

// Req 1.2 / 4.2: We capture the startTimer mock to assert call count
const mockStartTimer = jest.fn();
const mockStopTimer = jest.fn();
const mockGetScore = jest.fn(() => 10);

jest.mock("@/hooks/useTimedScoring", () => ({
  useTimedScoring: () => ({
    elapsedTime: 0,
    startTimer: mockStartTimer,
    stopTimer: mockStopTimer,
    getScore: mockGetScore,
  }),
}));

// Mock useAuth — no authenticated user needed for these tests
jest.mock("@/features/auth", () => ({
  useAuth: () => ({ user: null, profile: null }),
}));

// Mock scoreService — not relevant for these tests
jest.mock("@/features/game/scoreService", () => ({
  awardPoints: jest.fn(() => 10),
  POINTS_PER_CORRECT: 10,
}));

// Mock useSound — no audio in test environment
jest.mock("@/hooks/useSound", () => ({
  useSound: () => jest.fn(),
}));

// Mock generateChipQuestion — return a deterministic question so UI renders correctly
jest.mock("@/lib/game/chipQuestion", () => ({
  generateChipQuestion: () => ({ a: 5, op: "+", b: 3, answer: 8 }),
}));

// GameIntroModal uses ReactDOM.createPortal → document.body; works fine with jsdom.
// No additional mock needed.

// ─── Import page AFTER mocks are registered ───────────────────────────────────
import GameVirusPage from "@/app/game-virus/page";

// ─── Helpers ──────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GameVirusPage — gameStarted state (game-intro-popup, Task 4.3)", () => {
  /**
   * Test 1: Before clicking "Mulai"
   * Requirements 1.2 — timer has NOT started
   * The modal (role="dialog") must be visible in the DOM.
   */
  it("sebelum klik Mulai: modal role=dialog tampil di DOM dan startTimer belum dipanggil", () => {
    act(() => {
      render(<GameVirusPage />);
    });

    // Modal must be visible
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();

    // Timer must NOT have been started yet
    expect(mockStartTimer).not.toHaveBeenCalled();
  });

  /**
   * Test 2: After clicking "Mulai"
   * Requirements 4.2 — modal is dismissed, startTimer called exactly once.
   * The element with role="dialog" should no longer be in the DOM.
   */
  it("setelah klik Mulai: modal tidak ada di DOM dan startTimer dipanggil tepat sekali", () => {
    act(() => {
      render(<GameVirusPage />);
    });

    // The "Mulai" button is inside the modal — query by role to avoid collision
    // with the "Mulai" text that also appears as a label in the game canvas area.
    const mulaiButton = screen.getByRole("button", { name: "Mulai" });
    expect(mulaiButton).toBeTruthy();

    // Click "Mulai"
    act(() => {
      fireEvent.click(mulaiButton);
    });

    // Modal must be gone — no dialog in DOM
    const dialogAfter = screen.queryByRole("dialog");
    expect(dialogAfter).toBeNull();

    // startTimer must have been called exactly once
    expect(mockStartTimer).toHaveBeenCalledTimes(1);
  });
});
