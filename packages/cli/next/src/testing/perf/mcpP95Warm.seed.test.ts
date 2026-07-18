/**
 * `mcpP95Warm` budget — SEEDED (measured + reported), NOT enforced.
 *
 * The covenant reserves `mcpP95Warm<100ms` (`surface/surface.v2.json#budgets`)
 * alongside `condensedSDL<=8000` (seeded in the eval harness,
 * `cases/stable.ts#content-condensed-sdl-token-budget`). Per the plan, PR4
 * SEEDS both — measures and reports — rather than gating CI on them; PR7
 * ("all budgets active") is where `mcpP95Warm` graduates into the PROTECTED
 * suite (`budgets.test.ts`), alongside `help`/`complete`/`warmStoreVerb`.
 *
 * Kept OUT of `budgets.test.ts` deliberately — that file is the enforced,
 * "(PROTECTED)" suite; asserting a soft/reporting-only ceiling there would
 * blur which budgets are load-bearing today. `retry: 2` mirrors the existing
 * spawn-adjacent perf suite's tolerance for scheduler noise.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { capabilities } from "../../capabilities/index.js";
import { projectMcp } from "../helpers/projectMcp.js";
import { percentile } from "./measure.js";

/** The covenant's reserved (not yet enforced) ceiling, for the report line. */
const DESIGNED_MCP_P95_WARM_MS = 100;
/** A generous sanity ceiling — catches a gross regression without gating on
 * the tight, still-aspirational covenant number. */
const SANITY_CEILING_MS = 500;

describe("mcpP95Warm — seeded measurement (NOT enforced)", () => {
  let mcp: Awaited<ReturnType<typeof projectMcp>>;

  beforeAll(async () => {
    mcp = await projectMcp(capabilities);
    await mcp.callTool("info"); // one warm-up call, excluded from the sample
  });

  afterAll(async () => {
    await mcp.cleanup();
  });

  it("measures p95 of a warm, storeless MCP tool call and reports it", {
    retry: 2,
  }, async () => {
    const samples: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      await mcp.callTool("info");
      samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    const p95 = percentile(samples, 0.95);

    console.log(
      `[mcpP95Warm seed] p95=${p95.toFixed(2)}ms over ${samples.length} warm in-process calls ` +
        `(designed covenant: <${DESIGNED_MCP_P95_WARM_MS}ms; not yet enforced — PR7 activates it)`,
    );

    expect(p95).toBeLessThan(SANITY_CEILING_MS);
  });
});
