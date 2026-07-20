/**
 * E2 (AV-231, Backlog E) — the MCP lifecycle journey over a LONG-LIVED,
 * in-process server.
 *
 * Fresh-runtime unit tests structurally cannot catch the MCP memoization bugs:
 * they build a new runtime per assertion, so a store/config memo that outlives a
 * mutation is never exercised. The real MCP server boots ONE runtime for its
 * whole lifetime and shares it across every tool call — the exact condition
 * under which a cold-store rejection could be memoized forever, or a stale config
 * layer could survive a `config_set`. This file drives that server the way an
 * agent does, over a single connection:
 *
 *  - COLD read → STORE_UNAVAILABLE → `sources_update` (confirm) → the SAME
 *    server's retry read SUCCEEDS. Guards C1: a rejected boot must NOT be
 *    memoized, and a real mutation must invalidate the shared store so the next
 *    read re-boots against the freshly built pack.
 *  - `config_set` → a subsequent `config_show` on the same server sees the new
 *    value. Guards C2: the mutation must drop the config memo the store boot
 *    depends on.
 *  - The discovery sequence resolves from a COLD store (the storeless
 *    `capabilities` catalog boots with no pack), then browse → inspect works once
 *    the store is warm.
 *
 * Uses the in-process `projectMcp` harness (SDK in-memory transport) — no stdio,
 * no network — over the vendored default pack.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { capabilities } from "../../capabilities/index.js";
import { readLock } from "../../kernel/runtime/lock.js";
import { DEFAULT_PACK_TTL } from "../fixtures/graph/defaultPack.js";
import { type McpHarness, projectMcp } from "../helpers/projectMcp.js";

/** The transient roots one test creates; removed in `afterEach`. */
let roots: string[] = [];
const tempDir = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  roots.push(dir);
  return dir;
};

/**
 * A COLD project directory: a `pragma.config.ts` pointing at a real file
 * package, but NO lock yet — so the store boots cold until `sources_update`.
 */
function coldProject(ttl: string): string {
  const pkg = tempDir("e2-pkg-");
  mkdirSync(join(pkg, "definitions"), { recursive: true });
  writeFileSync(join(pkg, "definitions", "pack.ttl"), ttl);
  const cwd = tempDir("e2-proj-");
  writeFileSync(
    join(cwd, "pragma.config.ts"),
    `export default { packages: [{ name: "default", source: "file://${pkg}" }] };\n`,
  );
  return cwd;
}

let mcp: McpHarness | undefined;
beforeEach(() => {
  roots = [];
});
afterEach(async () => {
  await mcp?.cleanup();
  mcp = undefined;
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

describe("MCP lifecycle — cold store recovers after sources_update (E2, C1)", () => {
  it("a cold read fails STORE_UNAVAILABLE with the sources_update recovery, then the retry succeeds", async () => {
    const cwd = coldProject(DEFAULT_PACK_TTL);
    mcp = await projectMcp(capabilities, cwd);

    // 1) COLD: the store has no pack — a store-backed read must fail cleanly,
    //    pointing the agent at the recovery TOOL (not just a CLI string).
    const cold = await mcp.callTool("block_list");
    expect(cold.ok).toBe(false);
    const error = cold.error as {
      code: string;
      recovery?: { mcp?: { tool?: string } };
    };
    expect(error.code).toBe("STORE_UNAVAILABLE");
    expect(error.recovery?.mcp?.tool).toBe("sources_update");
    expect(readLock(cwd)).toBeUndefined();

    // 2) The agent runs the recovery tool for real (confirm) — it builds the pack.
    const update = await mcp.callTool("sources_update", { confirm: true });
    expect(update.ok).toBe(true);
    // A real execution, not a plan-only preview.
    expect(update.meta).not.toMatchObject({ planOnly: true });
    expect((update.data as { contentHash: string }).contentHash).toMatch(
      /^[0-9a-f]{64}$/,
    );
    expect(readLock(cwd)?.contentHash).toMatch(/^[0-9a-f]{64}$/);

    // 3) RETRY on the SAME server: the shared store was invalidated by the
    //    mutation, so the memoized cold rejection is gone and the read re-boots
    //    against the new pack. This is the guarantee a fresh-runtime test cannot
    //    make.
    const warm = await mcp.callTool("block_list");
    expect(warm.ok).toBe(true);
    const names = (warm.data as { name: string }[])
      .map((row) => row.name)
      .sort();
    expect(names).toEqual(["Button", "Card"]);
  });
});

describe("MCP lifecycle — config_set is visible to the next read (E2, C2)", () => {
  it("config_set updates the layer a subsequent config_show reads on the same server", async () => {
    const cwd = tempDir("e2-cfg-");
    mcp = await projectMcp(capabilities, cwd);

    // Before: the default channel, from the default (unset) origin.
    const before = await mcp.callTool("config_show");
    const beforeData = before.data as {
      config: { channel: string };
      origins: { channel: string };
    };
    expect(beforeData.config.channel).toBe("normal");
    expect(beforeData.origins.channel).toBe("default");

    // Mutate: set the channel for real (confirm).
    const set = await mcp.callTool("config_set", {
      key: "channel",
      value: "experimental",
      confirm: true,
    });
    expect(set.ok).toBe(true);

    // After: the SAME long-lived server's read reflects the write — proving the
    // mutation dropped the config memo the boot depends on (not a stale layer).
    const after = await mcp.callTool("config_show");
    const afterData = after.data as {
      config: { channel: string };
      origins: { channel: string };
    };
    expect(afterData.config.channel).toBe("experimental");
    // The write landed in the global layer, so the origin flips accordingly.
    expect(afterData.origins.channel).toBe("global");
  });
});

describe("MCP lifecycle — discovery from a cold store (E2)", () => {
  it("the capabilities catalog resolves cold, then browse -> inspect works once warm", async () => {
    const cwd = coldProject(DEFAULT_PACK_TTL);
    mcp = await projectMcp(capabilities, cwd);

    // Discovery is storeless: the capabilities catalog answers even with a cold
    // store, so an agent can orient before the pack exists.
    const catalog = await mcp.callTool("capabilities");
    expect(catalog.ok).toBe(true);
    const catalogData = catalog.data as {
      discovery_sequence: unknown;
      tools: unknown;
    };
    expect(catalogData.discovery_sequence).toBeDefined();
    expect(catalogData.tools).toBeDefined();

    // Warm the store, then follow a browse -> inspect discovery step end to end.
    await mcp.callTool("sources_update", { confirm: true });
    const list = await mcp.callTool("block_list");
    expect(list.ok).toBe(true);
    const first = (list.data as { name: string }[]).at(0);
    expect(first?.name).toBeDefined();

    const lookup = await mcp.callTool("block_lookup", {
      name: [first?.name ?? ""],
    });
    expect(lookup.ok).toBe(true);
    const results = (lookup.data as { results: { name: string }[] }).results;
    expect(results.at(0)?.name).toBe(first?.name);
  });
});
