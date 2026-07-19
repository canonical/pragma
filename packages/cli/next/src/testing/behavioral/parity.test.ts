/**
 * A5/A6 (stable-now) — the uniform `assertCliMcpParity` helper proven over the
 * STORELESS, PR1/PR2 nouns; B5 (commit 4, below) extends it to every read noun
 * PR3 ships, parameterized over the live surface.
 *
 * `info`/`config show` CLI-json==MCP parity is already asserted content-wise by
 * `capabilities/roundtrip.test.ts` (PR1-owned); this file's job is different —
 * it is the first REAL exercise of the new shared `helpers/parity.ts` asserter
 * (so its own correctness is proven before B5 leans on it across every read
 * noun), plus the plan-first/confirm uniform proof (A6).
 */

import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { configModule } from "../../capabilities/config/index.js";
import { capabilities } from "../../capabilities/index.js";
import { infoModule } from "../../capabilities/info/index.js";
import { sourcesModule } from "../../capabilities/sources/index.js";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import {
  fixtureEffectsModule,
  touchPath,
} from "../fixtures/fixtureCapability.js";
import {
  ALL_VISIBLE_CONFIG,
  CANONICAL_TTL,
} from "../fixtures/graph/canonical.js";
import {
  bootFixtureRuntime,
  type FixtureGraph,
} from "../helpers/fixtureGraph.js";
import {
  assertCliMcpParity,
  JSON_FLAGS,
  NO_MUTATION,
} from "../helpers/parity.js";
import { projectMcp } from "../helpers/projectMcp.js";
import { listVerbs, liveVerbs, lookupVerbs } from "./liveReadSurface.js";

const freshCwd = (): string => mkdtempSync(join(tmpdir(), "pragma-parity-"));

describe("assertCliMcpParity — the shared helper, over stable-now nouns (A5)", () => {
  it("info: CLI --format json == MCP tool data", async () => {
    const envelope = await assertCliMcpParity({
      modules: [infoModule],
      verb: infoModule.verbs[0] as VerbSpec,
      tool: "info",
      cwd: freshCwd(),
    });
    expect(envelope.ok).toBe(true);
  });

  it("config show: CLI --format json == MCP tool data", async () => {
    const envelope = await assertCliMcpParity({
      modules: [configModule],
      verb: configModule.verbs[0] as VerbSpec,
      tool: "config_show",
      cwd: freshCwd(),
    });
    expect(envelope.ok).toBe(true);
  });

  it("sources status: CLI --format json == MCP tool data (storeless)", async () => {
    const statusVerb = sourcesModule.verbs.find(
      (v) => v.path[1] === "status",
    ) as VerbSpec;
    const envelope = await assertCliMcpParity({
      modules: [sourcesModule],
      verb: statusVerb,
      tool: "sources_status",
      cwd: freshCwd(),
    });
    expect(envelope.ok).toBe(true);
  });
});

describe("plan-first is uniform across surfaces (A6)", () => {
  it("CLI --dry-run and MCP no-confirm describe the SAME effects, in different meta shapes", async () => {
    const cwd = freshCwd();
    const touchVerb = fixtureEffectsModule.verbs.find(
      (v) => v.path[1] === "touch",
    ) as VerbSpec;
    const name = `parity-plan-${Date.now()}`;

    const cli = await executeVerb(
      touchVerb,
      { name },
      { dryRun: true, undo: false, yes: false },
      bootRuntime(JSON_FLAGS, cwd),
    );
    const cliEnvelope = JSON.parse(cli.stdout as string) as {
      data: { plan: string[] };
      meta: Record<string, unknown>;
    };

    const mcp = await projectMcp([fixtureEffectsModule], cwd);
    const mcpEnvelope = (await mcp.callTool("probe_touch", { name })) as {
      data: { plan: string[] };
      meta: Record<string, unknown>;
    };
    await mcp.cleanup();

    // Same described effects...
    expect(cliEnvelope.data.plan).toEqual(mcpEnvelope.data.plan);
    // ...under intentionally DIFFERENT meta shapes (PARITY_GAPS: plan-first-meta-differs) —
    // a CLI --dry-run and an unconfirmed MCP call are different REQUESTS (one
    // explicit, one implicit), so the envelope names the mode differently.
    expect(cliEnvelope.meta).toEqual({ dryRun: true });
    expect(mcpEnvelope.meta).toEqual({ planOnly: true, confirmRequired: true });
    expect(existsSync(touchPath(name))).toBe(false);
  });

  it("both surfaces perform the SAME real effect once confirmed", async () => {
    const cwd = freshCwd();
    const touchVerb = fixtureEffectsModule.verbs.find(
      (v) => v.path[1] === "touch",
    ) as VerbSpec;

    const cliName = `parity-confirm-cli-${Date.now()}`;
    await executeVerb(
      touchVerb,
      { name: cliName },
      NO_MUTATION,
      bootRuntime(JSON_FLAGS, cwd),
    );
    expect(existsSync(touchPath(cliName))).toBe(true);

    const mcpName = `parity-confirm-mcp-${Date.now()}`;
    const mcp = await projectMcp([fixtureEffectsModule], cwd);
    const mcpEnvelope = await mcp.callTool("probe_touch", {
      name: mcpName,
      confirm: true,
    });
    await mcp.cleanup();
    expect(mcpEnvelope.ok).toBe(true);
    expect(existsSync(touchPath(mcpName))).toBe(true);
  });
});

/**
 * B5 — the uniform parity helper extended across EVERY read noun the live
 * surface exposes, over the shared canonical fixture. Parameterized via
 * `liveReadSurface.ts` (never a noun copied from the plan); also sweeps any
 * extra list-shaped verb (e.g. `categories`) and `sample`, found the same way.
 *
 * RETIRES the old byte-exact `condensed === fmt.llm(...)` parity (R4 — v2 has
 * no condensed MCP shape, PARITY_GAPS `no-condensed-mcp-envelope`): this is
 * structural `--format json` deep-equality via `assertCliMcpParity`, exactly
 * like A5/A6 above — B5 is that same proof, just swept over every read noun.
 */
describe("read-noun parity — every list/lookup/extra verb (B5)", () => {
  let fixture: FixtureGraph;
  let firstNameByNoun: Map<string, string>;

  // `sample` draws an independent RANDOM selection per call (`pickRandom`) —
  // two separate invocations (CLI, MCP) are not expected to return identical
  // entities, so it is excluded from content-equality parity (its STRUCTURE
  // is covered by B4's callable-envelope sweep instead). Only deterministic
  // extra list-shaped verbs (e.g. `categories`) belong here.
  const extraListShapedVerbs = liveVerbs.filter(
    (v) => v.verb === "categories" && v.tool !== false && v.needsStore,
  );

  beforeAll(async () => {
    fixture = await bootFixtureRuntime({
      ttl: CANONICAL_TTL,
      config: ALL_VISIBLE_CONFIG,
    });
    firstNameByNoun = new Map();
    for (const v of listVerbs) {
      const out = await executeVerb(
        v.spec,
        {},
        NO_MUTATION,
        bootRuntime(JSON_FLAGS, fixture.cwd),
      );
      const rows = JSON.parse(out.stdout as string).data as { name: string }[];
      const first = rows[0]?.name;
      if (first) firstNameByNoun.set(v.noun, first);
    }
  });

  afterAll(async () => {
    await fixture.dispose();
  });

  it.each(listVerbs)("$noun list: CLI --format json == MCP", async (v) => {
    await assertCliMcpParity({
      modules: capabilities,
      verb: v.spec,
      tool: v.tool as string,
      cwd: fixture.cwd,
    });
  });

  it.each(
    lookupVerbs,
  )("$noun lookup: CLI --format json == MCP, for a known name", async (v) => {
    const name = firstNameByNoun.get(v.noun);
    if (!name) return;
    await assertCliMcpParity({
      modules: capabilities,
      verb: v.spec,
      tool: v.tool as string,
      cwd: fixture.cwd,
      params: { name: [name] },
    });
  });

  it.each(
    extraListShapedVerbs,
  )("$noun $verb: CLI --format json == MCP", async (v) => {
    await assertCliMcpParity({
      modules: capabilities,
      verb: v.spec,
      tool: v.tool as string,
      cwd: fixture.cwd,
    });
  });
});
