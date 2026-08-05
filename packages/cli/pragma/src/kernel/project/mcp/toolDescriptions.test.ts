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

/** One tool as the guards below read it: its name, its prose, its arg schema. */
interface DescribedTool {
  readonly name: string;
  readonly description: string;
  readonly properties: readonly string[];
}

/**
 * Read the top-level argument names a description's `Example:` clause writes.
 *
 * Every declared story's description ends with a callable example
 * (`Example: tier_lookup { name: ["apps/lxd"] }.`). Only the KEYS are read —
 * the question is whether an agent that copies the example gets past the
 * schema, not whether the values are sensible. A description with no example,
 * or an empty one (`{}`), yields nothing and is not an offender.
 *
 * @param description - The tool description as MCP sends it.
 * @returns The example's top-level object keys, in source order.
 */
function readExampleArgNames(description: string): string[] {
  const example = /Example:\s*[\w-]+\s*\{([^}]*)\}/.exec(description);
  const body = example?.at(1);
  if (body === undefined) return [];
  return [...body.matchAll(/(?:^|,)\s*"?([A-Za-z_][\w-]*)"?\s*:/g)].flatMap(
    (match) => {
      const name = match.at(1);
      return name === undefined ? [] : [name];
    },
  );
}

let cwd: string;
let mcp: McpHarness;
let descriptions: { name: string; description: string }[];
let described: DescribedTool[];

beforeAll(async () => {
  cwd = mkdtempSync(join(tmpdir(), "pragma-tooldesc-"));
  mcp = await projectMcp(capabilities, cwd);
  const tools = await mcp.listTools();
  descriptions = tools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? "",
  }));
  described = tools.map((tool) => {
    // External boundary: the SDK types `inputSchema` as an open JSON Schema, so
    // a tool taking no arguments genuinely has no `properties`.
    const schema = tool.inputSchema as {
      properties?: Record<string, unknown>;
    };
    return {
      name: tool.name,
      description: tool.description ?? "",
      properties: Object.keys(schema.properties ?? {}),
    };
  });
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

  it("every description's example names only arguments its schema accepts", () => {
    // The four declared lookups all shipped `Example: <noun>_lookup { names:
    // [...] }` against a schema whose property is `name` and whose
    // `additionalProperties` is false, so an agent copying the example was
    // rejected at the schema layer on its FIRST call. The description is the
    // one part of a tool an agent reads before calling it; an example it
    // cannot execute is worse than no example.
    const offenders = described.flatMap((tool) =>
      readExampleArgNames(tool.description)
        .filter((arg) => !tool.properties.includes(arg))
        .map(
          (arg) =>
            `${tool.name}: example writes \`${arg}\`, schema accepts [${tool.properties.join(", ")}]`,
        ),
    );
    expect(offenders).toEqual([]);
    // Non-vacuity: an extraction that stopped matching would agree with every
    // description ever written, so the count of tools whose example carries
    // arguments at all is pinned to be substantial.
    const withArgs = described.filter(
      (tool) => readExampleArgNames(tool.description).length > 0,
    );
    expect(withArgs.length).toBeGreaterThan(3);
  });

  it("the named leak sites are scrubbed but still substantive", () => {
    const byName = new Map(
      descriptions.map((tool) => [tool.name, tool.description]),
    );
    // `standard_list` replaces `block_list` here: `block list` has no flags at
    // all now, so an assertion about its description naming one could never
    // fail again. `standard_list` is the one live read verb that still HAS
    // narrowing flags, and its description names them in prose (`filter by
    // category or search term`) — so it is where the CLI spelling would leak.
    expect(byName.get("standard_list")).not.toMatch(/--category|--search/);
    expect(byName.get("graph_query")).not.toContain("pragma ontology list");
    expect(byName.get("setup")).not.toMatch(/--dry-run|--yes/);
    expect(byName.get("upgrade")).not.toContain("--dry-run");
    // The scrub rephrases; it must not gut the description.
    for (const tool of ["standard_list", "graph_query", "setup", "upgrade"]) {
      expect((byName.get(tool) ?? "").length, tool).toBeGreaterThan(20);
    }
  });
});
