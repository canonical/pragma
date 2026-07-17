import { describe, expect, it } from "vitest";
import { percentile } from "./measure.js";

/**
 * Protected budget suite. The spawn-based cases are skipped until the perf
 * spike (commit 6) builds the binary and writes measured budgets; the pure
 * percentile helper is exercised now so the perf harness is not dead code.
 */
describe("perf budgets", () => {
  it("percentile uses nearest-rank", () => {
    const sorted = [1, 2, 3, 4, 5];
    expect(percentile(sorted, 0.5)).toBe(3);
    expect(percentile(sorted, 0.95)).toBe(5);
    expect(percentile([], 0.5)).toBeNaN();
  });

  it.skip("pragma2 --help stays under budget", () => {
    // Enabled in commit 6 once dist/pragma2 is built by the perf globalSetup.
  });

  it.skip("pragma2 __complete stays under budget", () => {
    // Enabled in commit 6.
  });
});
