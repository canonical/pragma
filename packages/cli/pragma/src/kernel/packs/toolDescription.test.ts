/**
 * PROTECTED — the pack `toolDescription` → MCP tool description wiring.
 *
 * A pack authors `toolDescription` FOR the agent-facing MCP tool description
 * (see kernel/packs/types.ts, "MCP tool description"). The compiler routes it
 * into `VerbSpec.doc`, the MCP projector emits `doc ?? summary` as the tool
 * description, and the CLI projector renders `doc` in verb help WITHOUT the
 * MCP tool-call example (`noun_verb {…}` is MCP-transport syntax).
 *
 * This pins representative text on BOTH surfaces so the routing can't silently
 * regress: the rich description must reach MCP, and the MCP tool-call example
 * must never leak into CLI `--help`.
 */

import { describe, expect, it } from "vitest";
import { storyModules } from "../../capabilities/distribution.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { formatVerbHelp } from "../project/cli/verbHelp.js";
import type { VerbSpec } from "../spec/types.js";

const standardModule = storyModules.get("standard");
if (!standardModule) {
  throw new Error('pragma.conf.ts declares no story for "standard"');
}
const tokenModule = storyModules.get("token");
if (!tokenModule) {
  throw new Error('pragma.conf.ts declares no story for "token"');
}

const verb = (
  module: { verbs: readonly VerbSpec[] },
  label: string,
): VerbSpec => {
  const found = module.verbs.find((v) => v.path[1] === label);
  if (!found) throw new Error(`no verb "${label}"`);
  return found;
};

describe("pack toolDescription wiring (PROTECTED)", () => {
  it("routes the lookup-level toolDescription to MCP, whole (with the call example)", async () => {
    const mcp = await projectMcp([tokenModule]);
    const desc = (await mcp.listTools()).find(
      (t) => t.name === "token_lookup",
    )?.description;
    await mcp.cleanup();
    expect(desc).toContain(
      "Get the resolved values of one or more design tokens by name.",
    );
    // The authored MCP tool-call example survives on the MCP surface.
    expect(desc).toContain(
      'Example: token_lookup { name: ["color/background"] }',
    );
  });

  it("routes the definition-level toolDescription to the MCP list tool", async () => {
    const mcp = await projectMcp([tokenModule]);
    const desc = (await mcp.listTools()).find(
      (t) => t.name === "token_list",
    )?.description;
    await mcp.cleanup();
    // The rich description reaches MCP (was previously dropped — only `summary`
    // reached the tool), including the authored call example.
    expect(desc).toContain(
      "List all design tokens with their default resolved value.",
    );
    expect(desc).toContain("Example: token_list {}");
  });

  it("routes an extra-verb toolDescription to its MCP tool", async () => {
    const mcp = await projectMcp([standardModule]);
    const desc = (await mcp.listTools()).find(
      (t) => t.name === "standard_categories",
    )?.description;
    await mcp.cleanup();
    // The authored prose reaches the extra verb's tool, whole. Asserted by
    // fragment rather than by exact string: the wiring is what this pins, and
    // tool descriptions are explicitly not frozen (`registerVerb.ts:324-326`).
    expect(desc).toContain("List all code standard categories");
    expect(desc).toContain("Example: standard_categories {}");
  });

  it("CLI --help shows the rich prose but NEVER the MCP tool-call syntax", () => {
    const lookupHelp = formatVerbHelp("pragma", verb(tokenModule, "lookup"));
    expect(lookupHelp).toContain(
      "Get the resolved values of one or more design tokens by name.",
    );
    // No-leaks: the `token_lookup {…}` MCP call shape must not reach CLI help.
    expect(lookupHelp).not.toContain("token_lookup {");
    expect(lookupHelp).not.toContain("Example:");

    const listHelp = formatVerbHelp("pragma", verb(tokenModule, "list"));
    expect(listHelp).toContain(
      "List all design tokens with their default resolved value.",
    );
    expect(listHelp).not.toContain("token_list {");
  });
});

describe("a tool-call example names a parameter the tool ACCEPTS (PROTECTED)", () => {
  // Four `*_lookup` descriptions taught agents `{ names: [...] }` while every
  // schema required `name`. An agent copying the example — which is what an
  // example is for — got `-32602 Invalid arguments`, and the description is
  // the only instruction it has. Prose that contradicts the schema beside it
  // is worse than no prose: it is a documented wrong answer.
  it("every `Example: tool { key: … }` uses a declared property", async () => {
    const mcp = await projectMcp([...storyModules.values()]);
    try {
      const tools = await mcp.listTools();
      const offenders: string[] = [];

      for (const tool of tools) {
        const example = /Example:\s*\w+\s*\{\s*([A-Za-z_$][\w$]*)\s*:/.exec(
          tool.description ?? "",
        );
        const key = example?.[1];
        if (key === undefined) continue; // No call example to check.
        const properties = Object.keys(
          (tool.inputSchema as { properties?: Record<string, unknown> })
            ?.properties ?? {},
        );
        if (!properties.includes(key)) {
          offenders.push(
            `${tool.name}: example says \`${key}\`, schema declares ${properties.join(", ")}`,
          );
        }
      }

      expect(offenders).toEqual([]);
      // Guard against a vacuous pass: some tool must actually carry an example.
      expect(
        tools.filter((t) => /Example:\s*\w+\s*\{/.test(t.description ?? ""))
          .length,
      ).toBeGreaterThan(0);
    } finally {
      await mcp.cleanup();
    }
  });
});

describe("every story tool CARRIES a call example (PROTECTED)", () => {
  // The check above only polices examples that exist. `standard` authored NONE,
  // and the auto-generated one fires only for a filter declaring `values` —
  // which the category filter deliberately does not, because the graph is the
  // vocabulary. So the four `standard_*` tools shipped with no worked call at
  // all, and the model that could not form one had nothing to copy.
  //
  // This asserts the gap cannot reappear on a future story: a compiled story
  // tool must show an agent one call it can make, spelled with its OWN name so
  // the example cannot be copied from a sibling tool and left stale.
  it("names its own tool in an `Example: <tool_name> {…}` fragment", async () => {
    const mcp = await projectMcp([...storyModules.values()]);
    try {
      const tools = await mcp.listTools();
      expect(tools.length).toBeGreaterThan(0);
      const missing = tools
        .filter(
          (tool) =>
            !new RegExp(`Example:\\s*${tool.name}\\s*\\{`).test(
              tool.description ?? "",
            ),
        )
        .map((tool) => tool.name);
      expect(missing).toEqual([]);
    } finally {
      await mcp.cleanup();
    }
  });
});
