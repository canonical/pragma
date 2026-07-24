/**
 * B3 — the error/recovery MATRIX, fixture-backed half: per-read-noun lookup
 * misses, an empty-filtered list, and `ontology_show`'s bad-prefix error.
 * Parameterized over `liveReadSurface.ts` — never a hard-coded noun.
 *
 * TWO ADAPTATIONS from the plan's wording, both verified empirically against
 * the live kernel (not assumed):
 *
 * 1. `<noun>_lookup` on a SINGLE or ALL-unknown batch FAILS the call
 *    (`ok:false, error.code==="ENTITY_NOT_FOUND"`) — `makeLookupRun` throws on
 *    a total miss; only a PARTIAL batch reports the miss while staying
 *    `ok:true` (that shape is B1's job, `agentSession.mcp.test.ts`). See
 *    PARITY_GAPS `single-lookup-miss-fails-batch-partial-reports`.
 * 2. A filtered list narrowed to zero rows is `{ok:true, data:[], meta:{}}` —
 *    there is no `meta.count` field on any read envelope (`dispatch.ts`
 *    always renders reads with `meta:{}`). See PARITY_GAPS
 *    `read-meta-always-empty`.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { capabilities } from "../../capabilities/index.js";
import {
  ALL_VISIBLE_CONFIG,
  CANONICAL_TTL,
} from "../fixtures/graph/canonical.js";
import {
  bootFixtureRuntime,
  type FixtureGraph,
} from "../helpers/fixtureGraph.js";
import { projectMcp } from "../helpers/projectMcp.js";
import { listVerbs, lookupVerbs } from "./liveReadSurface.js";

/**
 * List verbs with a STRING or ENUM (narrowable, non-boolean) flag — e.g.
 * `standard_list --category`. Excludes boolean escape hatches like `block
 * list --all-tiers`, which reject a string value at the schema layer rather
 * than narrowing to an empty result.
 */
const filteredListVerbs = listVerbs
  .map((v) => {
    const flag = v.spec.params.find(
      (p) => !p.positional && (p.kind === "string" || p.kind === "enum"),
    );
    return flag
      ? { noun: v.noun, tool: v.tool as string, param: flag.name }
      : undefined;
  })
  .filter(
    (v): v is { noun: string; tool: string; param: string } => v !== undefined,
  );

let fixture: FixtureGraph;
let mcp: Awaited<ReturnType<typeof projectMcp>>;

beforeAll(async () => {
  fixture = await bootFixtureRuntime({
    ttl: CANONICAL_TTL,
    config: ALL_VISIBLE_CONFIG,
  });
  mcp = await projectMcp(capabilities, fixture.cwd);
});

afterAll(async () => {
  await mcp.cleanup();
  await fixture.dispose();
});

describe("lookup miss — total miss fails the call (B3, adapted)", () => {
  it.each(
    lookupVerbs.map((v) => v.noun),
  )("%s_lookup: a single unknown name fails with ENTITY_NOT_FOUND", async (noun) => {
    const result = await mcp.callTool(`${noun}_lookup`, {
      name: ["zzz-definitely-not-a-real-entity"],
    });
    expect(result.ok).toBe(false);
    expect((result.error as { code: string }).code).toBe("ENTITY_NOT_FOUND");
  });

  it.each(
    lookupVerbs.map((v) => v.noun),
  )("%s_lookup: an all-unknown batch ALSO fails (not a partial report)", async (noun) => {
    const result = await mcp.callTool(`${noun}_lookup`, {
      name: ["zzz-nope-one", "zzz-nope-two"],
    });
    expect(result.ok).toBe(false);
    expect((result.error as { code: string }).code).toBe("ENTITY_NOT_FOUND");
  });
});

describe("list — a narrowing filter to zero rows is a plain empty list (B3, adapted)", () => {
  it("has at least one filtered list verb to sweep", () => {
    // A guard, not a no-op: if this ever goes empty the sweep below silently
    // covers nothing, which would be a silent coverage loss worth noticing.
    expect(filteredListVerbs.length).toBeGreaterThan(0);
  });

  it.each(
    filteredListVerbs,
  )("$tool: an unmatched filter value narrows to [] (no EMPTY_RESULTS)", async ({
    tool,
    param,
  }) => {
    const result = await mcp.callTool(tool, {
      [param]: "zzz-definitely-not-a-real-value",
    });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual([]);
    expect(result.meta).toEqual({});
  });
});

describe("ontology_show — an unknown prefix is INVALID_INPUT (B3)", () => {
  it("fails with the enumerated valid prefixes", async () => {
    const result = await mcp.callTool("ontology_show", { prefix: "nope" });
    expect(result.ok).toBe(false);
    const error = result.error as { code: string; validOptions: string[] };
    expect(error.code).toBe("INVALID_INPUT");
    expect(error.validOptions).toContain("ds");
  });
});
