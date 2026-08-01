/**
 * MCP tool descriptions carry NO CLI-syntax leaks (a PR8 doc→MCP residue).
 *
 * A verb's `doc` doubles as its MCP tool description (`registerVerb`), so a doc
 * authored in CLI terms leaks flags an agent can't use — `--category`,
 * `--dry-run`/`--yes`, or a `pragma …` shell command — into the agent-facing
 * catalog. Tool descriptions are NOT frozen in the covenant, so this is the guard
 * against the leak (and its recurrence). Storeless: listing tools never boots the
 * store, so no fixture graph is needed.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { capabilities } from "../../../capabilities/index.js";
import {
  type McpHarness,
  projectMcp,
} from "../../../testing/helpers/projectMcp.js";

let cwd: string;
let mcp: McpHarness;
let descriptions: { name: string; description: string }[];

beforeAll(async () => {
  cwd = mkdtempSync(join(tmpdir(), "pragma-tooldesc-"));
  mcp = await projectMcp(capabilities, cwd);
  const tools = await mcp.listTools();
  descriptions = tools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? "",
  }));
});

afterAll(async () => {
  await mcp.cleanup();
  rmSync(cwd, { recursive: true, force: true });
});

describe("MCP tool descriptions — no CLI-syntax leaks (doc→MCP residue)", () => {
  it("has a description for every registered tool", () => {
    expect(descriptions.length).toBeGreaterThan(0);
    for (const { name, description } of descriptions) {
      expect(description.length, name).toBeGreaterThan(0);
    }
  });

  it("no tool description embeds a CLI flag (`--flag`)", () => {
    const leaks = descriptions.filter((tool) =>
      /--[a-z]/.test(tool.description),
    );
    expect(leaks.map((tool) => `${tool.name}: ${tool.description}`)).toEqual(
      [],
    );
  });

  it("no tool description embeds a backtick-quoted `pragma …` command", () => {
    const leaks = descriptions.filter((tool) =>
      /`pragma /.test(tool.description),
    );
    expect(leaks.map((tool) => `${tool.name}: ${tool.description}`)).toEqual(
      [],
    );
  });

  it("the named leak sites are scrubbed but still substantive", () => {
    const byName = new Map(
      descriptions.map((tool) => [tool.name, tool.description]),
    );
    // `block_list` was the original leak site (`--all-tiers`); L-OPEN-9 removed
    // the flag AND made the description declared content (`toolDescription` in
    // pragma.conf.ts), so the guard widens to "no CLI flag of any name" — the
    // failure mode a re-authored story description could reintroduce.
    expect(byName.get("block_list")).not.toMatch(/--[a-z]/);
    expect(byName.get("graph_query")).not.toContain("pragma ontology list");
    expect(byName.get("setup")).not.toMatch(/--dry-run|--yes/);
    expect(byName.get("upgrade")).not.toContain("--dry-run");
    // The scrub rephrases; it must not gut the description.
    for (const tool of ["block_list", "graph_query", "setup", "upgrade"]) {
      expect((byName.get(tool) ?? "").length, tool).toBeGreaterThan(20);
    }
  });
});
