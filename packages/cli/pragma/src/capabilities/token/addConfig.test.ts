import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CANONICAL_TTL } from "../../testing/fixtures/graph/canonical.js";
import {
  bootFixtureRuntime,
  type FixtureGraph,
} from "../../testing/helpers/fixtureGraph.js";
import type { McpHarness } from "../../testing/helpers/projectMcp.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { capabilities } from "../index.js";

let fixture: FixtureGraph;
let mcp: McpHarness;
let configPath: string;

beforeAll(async () => {
  fixture = await bootFixtureRuntime({ ttl: CANONICAL_TTL });
  mcp = await projectMcp(capabilities, fixture.cwd);
  configPath = join(fixture.cwd, "tokens.config.mjs");
});

afterAll(async () => {
  await mcp.cleanup();
  await fixture.dispose();
});

beforeEach(() => {
  rmSync(configPath, { force: true });
});

describe("token_add-config — plan-first mutation (PROTECTED)", () => {
  it("without confirm, returns a plan and writes NOTHING", async () => {
    const result = await mcp.callTool("token_add-config");
    expect(result.ok).toBe(true);
    const meta = result.meta as {
      planOnly?: boolean;
      confirmRequired?: boolean;
    };
    expect(meta.planOnly).toBe(true);
    expect(meta.confirmRequired).toBe(true);
    const data = result.data as { plan: string[] };
    expect(data.plan.join("\n")).toMatch(/tokens\.config\.mjs/);
    expect(existsSync(configPath)).toBe(false);
  });

  it("with confirm, writes a terrazzo config reflecting the store token count", async () => {
    const result = await mcp.callTool("token_add-config", { confirm: true });
    expect(result.ok).toBe(true);
    const data = result.data as {
      path: string;
      tokenCount: number;
      sources: string[];
    };
    expect(existsSync(configPath)).toBe(true);
    // The canonical fixture holds 2 ds:Token entities.
    expect(data.tokenCount).toBe(2);
    const written = readFileSync(configPath, "utf-8");
    expect(written).toContain("defineConfig");
    expect(written).toContain("@canonical/terrazzo");
  });
});
