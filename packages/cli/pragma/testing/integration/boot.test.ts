/**
 * Layer 1: Boot tests.
 *
 * Validates runtime creation, config resolution, and store content
 * consistency from the canonical fixture.
 *
 * @see F.09 IT.03
 */

import { afterAll, describe, expect, it } from "vitest";
import { listComponents } from "../../src/domains/component/operations/index.js";
import type { PragmaRuntime } from "../../src/domains/shared/runtime.js";
import { createTestRuntime } from "../helpers/runtime.js";

describe("PragmaRuntime boot", () => {
  const runtimes: PragmaRuntime[] = [];

  afterAll(() => {
    for (const rt of runtimes) rt.dispose();
  });

  it("boots from canonical fixture", async () => {
    const rt = await createTestRuntime();
    runtimes.push(rt);

    expect(rt.store).toBeDefined();
    expect(rt.config.channel).toBe("normal");
  });

  it("boots in under 100ms (FX.01)", async () => {
    const start = performance.now();
    const rt = await createTestRuntime();
    const elapsed = performance.now() - start;
    runtimes.push(rt);

    expect(elapsed).toBeLessThan(100);
  });

  it("respects filtered config for tier", async () => {
    const rt = await createTestRuntime({ config: "filtered-config.json" });
    runtimes.push(rt);

    expect(rt.config.tier).toBe("apps/lxd");
    expect(rt.config.channel).toBe("normal");
  });

  it("filtered config includes tier-specific components", async () => {
    const rt = await createTestRuntime({ config: "filtered-config.json" });
    runtimes.push(rt);

    const components = await listComponents(rt.store, rt.config);
    const names = components.map((c) => c.name);
    // apps/lxd tier includes LXD Panel (its own) plus inherited global components
    expect(names).toContain("LXD Panel");
    expect(names).toContain("Button");
  });

  it("two runtimes produce identical store content", async () => {
    const rt1 = await createTestRuntime();
    const rt2 = await createTestRuntime();
    runtimes.push(rt1, rt2);

    const r1 = await listComponents(rt1.store, rt1.config);
    const r2 = await listComponents(rt2.store, rt2.config);

    expect(r1).toEqual(r2);
  });
});
