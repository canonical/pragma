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
 * 2. A filtered list narrowed to zero rows is `{ok:true, data:[]}` — there is
 *    still no `meta.count` field on any read envelope, which is the divergence
 *    `read-meta-always-empty` now records (it no longer claims `meta` is always
 *    `{}`: a zero-record read carries the list's own `notice` as
 *    `meta.notice` on both machine surfaces, asserted below).
 * 3. A value-free filter given a value its vocabulary does not admit is
 *    INVALID_INPUT, not a successful empty list — the narrowing recorded in
 *    PARITY_GAPS `no-empty-hook-on-free-filter`. Emptiness itself is still a
 *    success: a value the GRAPH admits but no row carries (a category with zero
 *    standards) is a calm empty list, asserted below.
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
 * `standard_list --category`. Boolean flags are excluded: they reject a string
 * value at the schema layer rather than narrowing to an empty result. (`block
 * list --all-tiers` used to be the example; it retired with the hand-written
 * filtering in L-OPEN-9.)
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

/**
 * CHANGED DELIBERATELY. This used to assert that ANY filter value narrowed to a
 * plain `{"ok":true,"data":[],"meta":{}}`, which was written when no value-free
 * filter could tell a typo from an empty answer. It could: the rows it is
 * filtering carry the vocabulary. Over MCP the old shape made a mistyped
 * `--category`, an unbuilt store and a genuinely empty category byte-identical —
 * the silence a model has no way to recover from.
 *
 * A value the graph does not know is now INVALID_INPUT with the admissible
 * values as `validOptions`, exactly as a filter declaring `values` has always
 * behaved; the difference is that the vocabulary is READ FROM THE GRAPH rather
 * than copied into the story. Zero rows for a value that DOES exist stays a calm
 * empty list — that is a real answer, not a bad argument — and "exists" means
 * the graph declares it, not that some returned row happened to carry it.
 */
describe("list — a filter value the graph does not carry is INVALID_INPUT (B3, adapted)", () => {
  it("has at least one filtered list verb to sweep", () => {
    // A guard, not a no-op: if this ever goes empty the sweep below silently
    // covers nothing, which would be a silent coverage loss worth noticing.
    expect(filteredListVerbs.length).toBeGreaterThan(0);
  });

  it.each(
    filteredListVerbs,
  )("$tool: an unobserved filter value is rejected, naming the observed ones", async ({
    tool,
    param,
  }) => {
    const result = await mcp.callTool(tool, {
      [param]: "zzz-definitely-not-a-real-value",
    });
    expect(result.ok).toBe(false);
    const error = result.error as { code: string; validOptions?: string[] };
    expect(error.code).toBe("INVALID_INPUT");
    expect(error.validOptions?.length).toBeGreaterThan(0);
    expect(error.validOptions).not.toContain("zzz-definitely-not-a-real-value");
  });

  it.each(
    filteredListVerbs,
  )("$tool: every value the graph DOES carry narrows to a calm list", async ({
    tool,
    param,
  }) => {
    const rejected = await mcp.callTool(tool, { [param]: "zzz-nope" });
    const admissible = (rejected.error as { validOptions: string[] })
      .validOptions;
    expect(admissible.length).toBeGreaterThan(0);
    // EVERY admissible value is accepted, and at least one is populated. Not
    // "the first one returns rows": the vocabulary is the graph's, so it can
    // legitimately contain a value no row carries (a category with zero
    // standards) — that value is a calm empty list, not a rejection, and the
    // sweep would otherwise read a real answer as a failure.
    let populated = 0;
    for (const value of admissible) {
      const result = await mcp.callTool(tool, { [param]: value });
      expect(result.ok).toBe(true);
      if ((result.data as unknown[]).length > 0) populated += 1;
    }
    expect(populated).toBeGreaterThan(0);
  });

  it("standard_list: a declared category with NO standards is a calm empty list", async () => {
    // The case that separates "the graph is the vocabulary" from "the returned
    // rows are the vocabulary". `standard_categories` publishes every declared
    // slug with its count, zeros included, and tells the agent to pick one —
    // so rejecting a zero-count slug as INVALID_INPUT tells it the slug the
    // tool just handed it was a typo. Validity read off the rows did exactly
    // that, because a category with no standards appears in no row.
    const categories = await mcp.callTool("standard_categories");
    const zero = (categories.data as { name: string; count: string }[]).filter(
      (row) => Number(row.count) === 0,
    );
    expect(zero.length).toBeGreaterThan(0);
    for (const row of zero) {
      const result = await mcp.callTool("standard_list", {
        category: row.name,
      });
      expect(result.ok).toBe(true);
      expect(result.data).toEqual([]);
      // And it is a real empty answer, so it carries the calm notice rather
      // than passing in silence.
      expect((result.meta as { notice?: string }).notice ?? "").not.toBe("");
    }
  });

  it("standard_list: the rejection names the declared slugs, not just the used ones", async () => {
    const result = await mcp.callTool("standard_list", {
      category: "zzz-definitely-not-a-slug",
    });
    expect(result.ok).toBe(false);
    const error = result.error as { code: string; validOptions: string[] };
    expect(error.code).toBe("INVALID_INPUT");
    const categories = await mcp.callTool("standard_categories");
    const declared = (categories.data as { name: string }[]).map((r) => r.name);
    // Same vocabulary, both surfaces: whatever `standard_categories` lists is
    // what `--category` accepts. Read from `cs:Category`/`cs:slug` on both
    // sides, so the two cannot drift.
    expect([...error.validOptions].sort()).toEqual([...declared].sort());
  });
});

describe("empty ≠ silence on the machine surfaces", () => {
  it("carries the list's empty-state guidance in the envelope meta", async () => {
    // `notice` had exactly one consumer — the CLI dispatcher's stderr — so
    // an agent received `{"ok":true,"data":[],"meta":{}}` and nothing else. The
    // search path is the honest way to reach an empty list without a bad
    // argument.
    const result = await mcp.callTool("standard_list", {
      search: "zzz-nothing-matches-this",
    });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual([]);
    const notice = (result.meta as { notice?: string }).notice ?? "";
    expect(notice).toContain("No standard entries found.");
    expect(notice).toContain("pragma standard categories");
  });
});

describe("ontology_lookup — an unknown prefix is INVALID_INPUT (B3)", () => {
  it("fails with the enumerated valid prefixes", async () => {
    const result = await mcp.callTool("ontology_lookup", { prefix: "nope" });
    expect(result.ok).toBe(false);
    const error = result.error as { code: string; validOptions: string[] };
    expect(error.code).toBe("INVALID_INPUT");
    expect(error.validOptions).toContain("ds");
  });
});
