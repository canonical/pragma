/**
 * B1 — a multi-step agent MCP session over the shared canonical fixture graph;
 * B2 — the SPARQL escape hatch (deterministic bindings over a known graph).
 *
 * Every noun/verb driven here comes from `liveReadSurface.ts` (parameterized
 * over `emitSurface(capabilities)`) — nothing is a noun name copied from the
 * plan, except the "categories" journey, which is itself found by searching
 * the live surface for a `categories`-shaped verb (today only `standard`
 * declares one; the test degrades to a no-op if none exists).
 *
 * B2 (R2 — the live surface): `graph query` (tool `graph_query`) is now live as
 * of PR6, with its own SELECT/ASK/CONSTRUCT + parity coverage in
 * `capabilities/graph/query.test.ts`. B2 keeps exercising the escape hatch
 * through `PragmaRuntime.query.sparql` directly — the exact seam the live verb
 * delegates to (see PARITY_GAPS `graph-query-deferred`).
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
import { listVerbs, liveVerbs, lookupVerbs } from "./liveReadSurface.js";

/** Nouns exposing BOTH a `list` and a `lookup` — the "browse then inspect" pair. */
const browsableNouns = listVerbs
  .map((v) => v.noun)
  .filter((noun) => lookupVerbs.some((v) => v.noun === noun));

/** The one live verb literally named `categories`, if any noun declares one. */
const categoriesVerb = liveVerbs.find(
  (v) => v.verb === "categories" && v.tool !== false,
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

describe("agent session — list, pick, lookup (B1)", () => {
  it.each(
    browsableNouns,
  )("%s: list -> pick first -> lookup resolves it", async (noun) => {
    const list = await mcp.callTool(`${noun}_list`);
    expect(list.ok).toBe(true);
    const rows = list.data as { name: string }[];
    expect(rows.length).toBeGreaterThan(0);
    const first = rows[0] as { name: string };

    const lookup = await mcp.callTool(`${noun}_lookup`, { name: [first.name] });
    expect(lookup.ok).toBe(true);
    const data = lookup.data as {
      results: { name: string }[];
      errors: unknown[];
    };
    expect(data.errors).toEqual([]);
    expect(data.results[0]?.name).toBe(first.name);
  });

  it.each(
    browsableNouns,
  )("%s: a BATCH lookup with one hit reports the miss without failing the call", async (noun) => {
    // `makeLookupRun` (kernel/packs/runBodies.ts) throws on a TOTAL miss (see
    // the errorMatrix.mcp.test.ts B3 suite) — a partial batch is the "miss
    // reported, call not failed" shape (an ADAPTATION of the plan's B1/B3
    // wording, which described a single-name miss; verified against the
    // live behavior).
    const list = await mcp.callTool(`${noun}_list`);
    const rows = list.data as { name: string }[];
    const known = (rows[0] as { name: string }).name;

    const result = await mcp.callTool(`${noun}_lookup`, {
      name: [known, "zzz-definitely-not-a-real-entity"],
    });
    expect(result.ok).toBe(true);
    const data = result.data as {
      results: { name: string }[];
      errors: { code: string }[];
    };
    expect(data.results[0]?.name).toBe(known);
    expect(data.errors[0]?.code).toBe("ENTITY_NOT_FOUND");
  });
});

describe("agent session — the categories journey, if the live surface declares one (B1)", () => {
  it("categories -> list{category} -> lookup has dos", async () => {
    if (!categoriesVerb) return; // No noun currently declares `categories` — skip gracefully.
    const noun = categoriesVerb.noun;

    const categories = await mcp.callTool(`${noun}_categories`);
    expect(categories.ok).toBe(true);
    const categoryRows = categories.data as { name: string }[];
    expect(categoryRows.length).toBeGreaterThan(0);

    // Walk categories -> entries until the sweep finds one with declared
    // `dos` (a category whose standards happen to have none is not a
    // failure — the journey just needs ONE positive case to prove the shape).
    let foundDos: readonly unknown[] | undefined;
    for (const category of categoryRows) {
      const filtered = await mcp.callTool(`${noun}_list`, {
        category: category.name,
      });
      const rows = filtered.data as { name: string }[];
      for (const row of rows) {
        const lookup = await mcp.callTool(`${noun}_lookup`, {
          name: [row.name],
          detail: "standard",
        });
        const data = lookup.data as { results: { dos?: unknown[] }[] };
        const dos = data.results[0]?.dos;
        if (dos && dos.length > 0) {
          foundDos = dos;
          break;
        }
      }
      if (foundDos) break;
    }
    expect(foundDos?.length).toBeGreaterThan(0);
  });
});

describe("the SPARQL escape hatch — deterministic bindings (B2, adapted)", () => {
  it("resolves the 4 canonical components, ordered by name", async () => {
    const result = await fixture.runtime.query.sparql(
      "SELECT ?name WHERE { ?c a ds:Component ; ds:name ?name } ORDER BY ?name",
    );
    expect(result.type).toBe("select");
    const names =
      result.type === "select" ? result.bindings.map((b) => b.name) : [];
    expect(names).toEqual(["Beta Widget", "Button", "LXD Panel", "Modal"]);
  });

  it("a COUNT aggregate over ds:Component matches the list length", async () => {
    const countResult = await fixture.runtime.query.sparql(
      "SELECT (COUNT(*) AS ?c) WHERE { ?comp a ds:Component }",
    );
    const count =
      countResult.type === "select"
        ? Number(countResult.bindings[0]?.c ?? 0)
        : 0;
    expect(count).toBe(4);
  });
});
