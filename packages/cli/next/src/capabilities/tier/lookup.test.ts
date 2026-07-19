import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import { CANONICAL_TTL } from "../../testing/fixtures/graph/canonical.js";
import {
  bootFixtureRuntime,
  type FixtureGraph,
} from "../../testing/helpers/fixtureGraph.js";
import type { McpHarness } from "../../testing/helpers/projectMcp.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { capabilities } from "../index.js";
import { runTierLookup } from "./runLookup.js";

let fixture: FixtureGraph;
let mcp: McpHarness;

beforeAll(async () => {
  fixture = await bootFixtureRuntime({ ttl: CANONICAL_TTL });
  mcp = await projectMcp(capabilities, fixture.cwd);
});

afterAll(async () => {
  await mcp.cleanup();
  await fixture.dispose();
});

describe("tier_lookup — bespoke single-name lookup (PROTECTED)", () => {
  it("resolves a tier and the blocks scoped directly to it", async () => {
    const result = await mcp.callTool("tier_lookup", { name: "apps/lxd" });
    expect(result.ok).toBe(true);
    const data = result.data as { name: string; blocks: string[] };
    expect(data.name).toBe("apps/lxd");
    // The canonical fixture scopes "LXD Panel" to apps/lxd.
    expect(data.blocks).toContain("LXD Panel");
  });

  it("errors on an unknown tier name with a tier_list recovery", async () => {
    const result = await mcp.callTool("tier_lookup", { name: "not-a-tier" });
    expect(result.ok).toBe(false);
    const error = result.error as { code: string };
    expect(error.code).toBe("ENTITY_NOT_FOUND");
  });
});

describe("tier_lookup — cold/unseeded store (ROOT A)", () => {
  it("remaps a 'Prefix not found' to STORE_UNAVAILABLE, not INTERNAL_ERROR", async () => {
    // The bespoke lookup used to call `rt.query.sparql` directly, bypassing the
    // `runSelect` remap — so a cold store's raw "Prefix not found" collapsed to
    // INTERNAL_ERROR. It now routes through `runSelect`, inheriting the remap.
    const coldRuntime = {
      query: {
        sparql: async () => {
          throw new Error("Prefix not found: ds");
        },
      },
    } as unknown as PragmaRuntime;

    let caught: unknown;
    try {
      await runTierLookup(coldRuntime, "apps/lxd");
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ code: "STORE_UNAVAILABLE" });
    expect(
      (caught as { recovery?: { mcp?: { tool: string } } }).recovery?.mcp,
    ).toMatchObject({ tool: "sources_update" });
  });
});
