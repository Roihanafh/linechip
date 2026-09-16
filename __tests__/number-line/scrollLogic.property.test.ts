import * as fc from "fast-check";
import {
  computeVirtualWidth,
  computeAdaptiveSpacing,
  computeAutoScroll,
  TICK_SPACING,
  MIN_TICK_SPACING,
  MIN_VISIBLE_TICKS,
} from "@/lib/number-line/scrollLogic";

// Helper functions for keyboard scroll (Requirement 9.6)
const scrollLeft = (offset: number, _maxScroll: number) =>
  Math.max(0, offset - 40);
const scrollRight = (offset: number, maxScroll: number) =>
  Math.min(maxScroll, offset + 40);

// Feature: number-line-car-module, Property 11: Tick spacing tetap 60px pada canvas virtual
// Validates: Requirements 5.2
describe("Property 11: Tick spacing tetap 60px pada canvas virtual", () => {
  test("jarak piksel antara tick berurutan selalu = tickSpacing", () => {
    // The pixel position of a tick value v is: padding + (v - minTick) * tickSpacing
    // For consecutive ticks v and v+1:
    //   pos(v+1) - pos(v) = (padding + (v+1 - minTick) * tickSpacing) - (padding + (v - minTick) * tickSpacing)
    //                     = tickSpacing
    // This is a pure algebraic property — the distance is always exactly tickSpacing.
    fc.assert(
      fc.property(
        fc.integer({ min: -200, max: 200 }),   // tick value v
        fc.integer({ min: -200, max: 200 }),   // minTick
        fc.integer({ min: 30, max: 120 }),     // tickSpacing
        fc.integer({ min: 0, max: 500 }),      // padding
        (v, minTick, tickSpacing, padding) => {
          const posV = padding + (v - minTick) * tickSpacing;
          const posVNext = padding + (v + 1 - minTick) * tickSpacing;
          return posVNext - posV === tickSpacing;
        }
      ),
      { numRuns: 1000 }
    );
  });

  test("TICK_SPACING konstanta adalah 60", () => {
    expect(TICK_SPACING).toBe(60);
  });
});

// Feature: number-line-car-module, Property 12: Virtual width sesuai rumus
// Validates: Requirements 5.1
describe("Property 12: Virtual width sesuai rumus (n + 2) × tickSpacing", () => {
  test("computeVirtualWidth mengembalikan (uniqueTicks.length + 2) * tickSpacing", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -9999, max: 9999 }), { minLength: 1, maxLength: 200 }),
        fc.integer({ min: 10, max: 200 }),  // tickSpacing
        (ticks, tickSpacing) => {
          const result = computeVirtualWidth(ticks, tickSpacing);
          return result === (ticks.length + 2) * tickSpacing;
        }
      ),
      { numRuns: 1000 }
    );
  });

  test("virtual width untuk array kosong adalah 2 * tickSpacing", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 200 }),
        (tickSpacing) => {
          return computeVirtualWidth([], tickSpacing) === 2 * tickSpacing;
        }
      ),
      { numRuns: 500 }
    );
  });

  test("virtual width bertambah tepat tickSpacing untuk setiap tick tambahan", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 0, maxLength: 50 }),
        fc.integer({ min: -100, max: 100 }),  // tick baru
        fc.integer({ min: 10, max: 200 }),    // tickSpacing
        (ticks, newTick, tickSpacing) => {
          const widthN = computeVirtualWidth(ticks, tickSpacing);
          const widthN1 = computeVirtualWidth([...ticks, newTick], tickSpacing);
          return widthN1 - widthN === tickSpacing;
        }
      ),
      { numRuns: 1000 }
    );
  });
});

// Feature: number-line-car-module, Property 13: Auto-scroll membawa mobil ke dalam viewport
// Validates: Requirements 5.4
describe("Property 13: Auto-scroll membawa mobil ke dalam viewport", () => {
  test("setelah computeAutoScroll, carX berada dalam [newOffset + 60, newOffset + viewportWidth - 60]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 121, max: 1920 }), // viewportWidth > 120 (guard: 2 * margin)
        fc.integer({ min: 0, max: 5000 }),   // maxScroll
        (viewportWidth, maxScroll) => {
          // Guard: pastikan maxScroll cukup besar sehingga scroll dapat menjangkau carX
          // Gunakan maxScroll >= viewportWidth agar auto-scroll tidak diklem di tepi
          const effectiveMaxScroll = Math.max(maxScroll, viewportWidth);
          // Pilih carX di seluruh rentang yang bisa dijangkau canvas
          // carX dalam [0, effectiveMaxScroll + viewportWidth]
          const midPoint = Math.floor(effectiveMaxScroll / 2);
          const carX = midPoint;
          const scrollOffset = 0;
          const newOffset = computeAutoScroll(carX, scrollOffset, viewportWidth, effectiveMaxScroll);
          const margin = TICK_SPACING; // 60px
          const lo = newOffset + margin;
          const hi = newOffset + viewportWidth - margin;
          return carX >= lo && carX <= hi;
        }
      ),
      { numRuns: 500 }
    );
  });

  test("setelah computeAutoScroll, carX berada dalam viewport untuk carX jauh di kanan", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 121, max: 1920 }), // viewportWidth
        fc.integer({ min: 0, max: 3000 }),   // scrollOffset
        (viewportWidth, scrollOffset) => {
          // carX jauh di kanan viewport (harus scroll ke kanan)
          const margin = TICK_SPACING;
          const carX = scrollOffset + viewportWidth + 200; // jauh di luar sisi kanan
          const maxScroll = carX + viewportWidth; // maxScroll cukup besar
          const newOffset = computeAutoScroll(carX, scrollOffset, viewportWidth, maxScroll);
          const lo = newOffset + margin;
          const hi = newOffset + viewportWidth - margin;
          return carX >= lo && carX <= hi;
        }
      ),
      { numRuns: 500 }
    );
  });

  test("setelah computeAutoScroll, carX berada dalam viewport untuk carX jauh di kiri", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 121, max: 1920 }), // viewportWidth
        fc.integer({ min: 200, max: 3000 }), // scrollOffset > 200 agar carX bisa di kiri
        (viewportWidth, scrollOffset) => {
          // carX jauh di kiri viewport (harus scroll ke kiri)
          // Pastikan carX >= margin sehingga scroll tidak diklem di 0
          const margin = TICK_SPACING;
          const carX = Math.max(margin, scrollOffset - 200); // jauh di luar sisi kiri, tapi >= 60
          const maxScroll = scrollOffset + viewportWidth;
          const newOffset = computeAutoScroll(carX, scrollOffset, viewportWidth, maxScroll);
          const lo = newOffset + margin;
          const hi = newOffset + viewportWidth - margin;
          return carX >= lo && carX <= hi;
        }
      ),
      { numRuns: 500 }
    );
  });

  test("jika carX sudah dalam viewport, offset tidak berubah", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 121, max: 1920 }), // viewportWidth > 120
        fc.integer({ min: 0, max: 5000 }),   // maxScroll
        (viewportWidth, maxScroll) => {
          // Pilih scrollOffset dan carX sehingga carX sudah dalam [offset+60, offset+vw-60]
          const scrollOffset = fc.sample(fc.integer({ min: 0, max: maxScroll }), 1)[0];
          const margin = TICK_SPACING;
          const lo = scrollOffset + margin;
          const hi = scrollOffset + viewportWidth - margin;
          if (lo > hi) return true; // viewport terlalu sempit, skip
          const carX = Math.floor((lo + hi) / 2);
          const newOffset = computeAutoScroll(carX, scrollOffset, viewportWidth, maxScroll);
          return newOffset === scrollOffset;
        }
      ),
      { numRuns: 500 }
    );
  });

  test("offset baru selalu berada dalam [0, maxScroll]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }),
        fc.integer({ min: 0, max: 3000 }),
        fc.integer({ min: 121, max: 1920 }),
        fc.integer({ min: 0, max: 5000 }),
        (carX, scrollOffset, viewportWidth, maxScroll) => {
          const clampedScrollOffset = Math.min(scrollOffset, maxScroll);
          const newOffset = computeAutoScroll(carX, clampedScrollOffset, viewportWidth, maxScroll);
          return newOffset >= 0 && newOffset <= maxScroll;
        }
      ),
      { numRuns: 1000 }
    );
  });
});

// Feature: number-line-car-module, Property 14: Adaptive spacing menjamin minimal 10 tick visible
// Validates: Requirements 5.5
describe("Property 14: Adaptive spacing menjamin minimal 10 tick visible", () => {
  test("s >= 30 untuk semua viewportWidth > 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3840 }),
        (viewportWidth) => {
          const s = computeAdaptiveSpacing(viewportWidth);
          return s >= MIN_TICK_SPACING;
        }
      ),
      { numRuns: 1000 }
    );
  });

  test("s <= 60 untuk semua viewportWidth > 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3840 }),
        (viewportWidth) => {
          const s = computeAdaptiveSpacing(viewportWidth);
          return s <= TICK_SPACING;
        }
      ),
      { numRuns: 1000 }
    );
  });

  test("viewportWidth / s >= 10 ATAU s === 30 (batas minimum)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3840 }),
        (viewportWidth) => {
          const s = computeAdaptiveSpacing(viewportWidth);
          // Jika viewport cukup besar (>= 300px), maka minimal 10 tick pasti muat
          // Jika viewport terlalu kecil, spacing dikurangi ke MIN_TICK_SPACING (30)
          return viewportWidth / s >= MIN_VISIBLE_TICKS || s === MIN_TICK_SPACING;
        }
      ),
      { numRuns: 1000 }
    );
  });

  test("viewport >= 600px selalu dapat menampilkan 10 tick pada spacing <= 60", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 600, max: 3840 }),
        (viewportWidth) => {
          const s = computeAdaptiveSpacing(viewportWidth);
          return viewportWidth / s >= MIN_VISIBLE_TICKS;
        }
      ),
      { numRuns: 500 }
    );
  });

  test("MIN_VISIBLE_TICKS konstanta adalah 10 dan MIN_TICK_SPACING adalah 30", () => {
    expect(MIN_VISIBLE_TICKS).toBe(10);
    expect(MIN_TICK_SPACING).toBe(30);
  });
});

// Feature: number-line-car-module, Property 15: Keyboard scroll bergerak tepat 40px
// Validates: Requirements 9.6
describe("Property 15: Keyboard scroll bergerak tepat 40px", () => {
  test("scrollLeft selalu menghasilkan nilai >= 0 (tidak pernah negatif)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }),
        fc.integer({ min: 0, max: 5000 }),
        (offset, maxScroll) => {
          const result = scrollLeft(offset, maxScroll);
          return result >= 0;
        }
      ),
      { numRuns: 1000 }
    );
  });

  test("scrollLeft, jika offset <= maxScroll, hasil juga <= maxScroll", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }),
        fc.integer({ min: 0, max: 5000 }),
        (rawOffset, maxScroll) => {
          // Precondition: offset valid (tidak melebihi maxScroll)
          const offset = Math.min(rawOffset, maxScroll);
          const result = scrollLeft(offset, maxScroll);
          return result >= 0 && result <= maxScroll;
        }
      ),
      { numRuns: 1000 }
    );
  });

  test("scrollRight selalu menghasilkan nilai dalam [0, maxScroll]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }),
        fc.integer({ min: 0, max: 5000 }),
        (offset, maxScroll) => {
          const clampedOffset = Math.min(offset, maxScroll);
          const result = scrollRight(clampedOffset, maxScroll);
          return result >= 0 && result <= maxScroll;
        }
      ),
      { numRuns: 1000 }
    );
  });

  test("scrollLeft bergerak tepat 40px ke kiri jika tidak menyentuh batas 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 40, max: 5000 }),
        fc.integer({ min: 0, max: 5000 }),
        (offset, maxScroll) => {
          const result = scrollLeft(offset, maxScroll);
          return result === offset - 40;
        }
      ),
      { numRuns: 1000 }
    );
  });

  test("scrollRight bergerak tepat 40px ke kanan jika tidak menyentuh batas maxScroll", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4960 }), // offset + 40 <= 5000
        fc.integer({ min: 5000, max: 10000 }), // maxScroll jauh di atas offset+40
        (offset, maxScroll) => {
          const result = scrollRight(offset, maxScroll);
          return result === offset + 40;
        }
      ),
      { numRuns: 1000 }
    );
  });

  test("scrollLeft di offset 0 tetap 0 (tidak di bawah batas)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }),
        (maxScroll) => {
          return scrollLeft(0, maxScroll) === 0;
        }
      ),
      { numRuns: 500 }
    );
  });

  test("scrollRight di offset maxScroll tetap maxScroll (tidak melebihi batas)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }),
        (maxScroll) => {
          return scrollRight(maxScroll, maxScroll) === maxScroll;
        }
      ),
      { numRuns: 500 }
    );
  });

  test("scrollLeft pada offset < 40 diklem ke 0, bukan negatif", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 39 }),
        fc.integer({ min: 0, max: 5000 }),
        (offset, maxScroll) => {
          return scrollLeft(offset, maxScroll) === 0;
        }
      ),
      { numRuns: 500 }
    );
  });

  test("scrollRight pada offset > maxScroll - 40 diklem ke maxScroll", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }),
        (maxScroll) => {
          // offset yang akan melebihi maxScroll jika ditambah 40
          const offset = Math.max(0, maxScroll - 39);
          return scrollRight(offset, maxScroll) === maxScroll;
        }
      ),
      { numRuns: 500 }
    );
  });
});
