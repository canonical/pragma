import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { evaluateProjectConfig } from "../../kernel/config/evaluateProjectConfig.js";
import {
  BUDGET_COMPLETE_MS,
  BUDGET_HELP_MS,
  BUDGET_PROJECT_CONFIG_MS,
  BUDGET_WARM_STORE_MS,
} from "./budgets.js";
import { measureCommand, percentile } from "./measure.js";

/** The compiled binary the perf globalSetup guarantees exists. */
const BINARY = fileURLToPath(new URL("../../../dist/pragma2", import.meta.url));

/** Fresh XDG dirs so spawned runs never touch real state (and first-run is isolated). */
const perfEnv = {
  XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), "pragma2-perf-cfg-")),
  XDG_STATE_HOME: mkdtempSync(join(tmpdir(), "pragma2-perf-state-")),
};

/**
 * Protected budget suite. Spawns the standalone `dist/pragma2`, discards
 * warmups, and asserts median + p95 against the ceilings in budgets.ts. Given
 * spawn-time variance, each spawn case retries.
 */
describe("perf budgets (PROTECTED)", () => {
  it("percentile uses nearest-rank", () => {
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5], 0.95)).toBe(5);
    expect(percentile([], 0.5)).toBeNaN();
  });

  it("pragma2 --help stays under budget", { retry: 2 }, () => {
    const result = measureCommand(BINARY, ["--help"], {
      runs: 15,
      warmups: 3,
      env: perfEnv,
    });
    expect(result.medianMs).toBeLessThanOrEqual(BUDGET_HELP_MS);
    expect(result.p95Ms).toBeLessThanOrEqual(BUDGET_HELP_MS);
  });

  it("pragma2 __complete stays under budget", { retry: 2 }, () => {
    const result = measureCommand(BINARY, ["__complete", "config"], {
      runs: 15,
      warmups: 3,
      env: perfEnv,
    });
    expect(result.medianMs).toBeLessThanOrEqual(BUDGET_COMPLETE_MS);
    expect(result.p95Ms).toBeLessThanOrEqual(BUDGET_COMPLETE_MS);
  });

  it("warm store-backed verb stays under budget", { retry: 2 }, () => {
    // __store-probe boots the embedded pack from its n-quads cache and queries
    // it — the full store-backed verb cost in the compiled binary. The first
    // spawn materializes the pack; warmups absorb it, then it is a cache hit.
    const result = measureCommand(BINARY, ["__store-probe"], {
      runs: 12,
      warmups: 3,
      env: {
        ...perfEnv,
        XDG_CACHE_HOME: mkdtempSync(join(tmpdir(), "pragma2-perf-cache-")),
      },
    });
    expect(result.medianMs).toBeLessThanOrEqual(BUDGET_WARM_STORE_MS);
    expect(result.p95Ms).toBeLessThanOrEqual(BUDGET_WARM_STORE_MS);
  });

  it("warm project-config load stays under budget", { retry: 2 }, async () => {
    const savedState = process.env.XDG_STATE_HOME;
    process.env.XDG_STATE_HOME = mkdtempSync(join(tmpdir(), "pragma2-warm-"));
    try {
      const dir = mkdtempSync(join(tmpdir(), "pragma2-warm-proj-"));
      const path = join(dir, "pragma.config.ts");
      writeFileSync(path, 'export default { tier: "core" };');

      await evaluateProjectConfig(path); // prime the content-hash cache

      const samples: number[] = [];
      for (let i = 0; i < 20; i++) {
        const start = performance.now();
        await evaluateProjectConfig(path);
        samples.push(performance.now() - start);
      }
      samples.sort((a, b) => a - b);
      expect(percentile(samples, 0.5)).toBeLessThanOrEqual(
        BUDGET_PROJECT_CONFIG_MS,
      );
    } finally {
      process.env.XDG_STATE_HOME = savedState;
    }
  });
});
