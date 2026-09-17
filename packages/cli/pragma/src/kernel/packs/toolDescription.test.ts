/**
 * PROTECTED — the pack guidance → MCP tool description wiring.
 *
 * A story half authors three things for a caller choosing a tool:
 * `toolDescription` (what the tool returns), `useWhen` (the question it
 * answers) and `example` (one call's params). The compiler routes them onto
 * the verb, and ONE generator (`kernel/spec/guidance.ts`) builds the MCP
 * description from them; verb help renders the same example as a COMMAND.
 *
 * This pins representative text on BOTH surfaces so the routing can't silently
 * regress: the question, the prose and the generated example must reach MCP,
 * and MCP tool-call syntax must never leak into CLI `--help`.
 *
 * These cases used to regex-match a hand-typed `Example: tool {…}` suffix in
 * the authored prose. The suffix is gone — the example is declared as data and
 * rendered — so they assert the GENERATED description instead, and whether an
 * example's params are ones the tool accepts is no longer sampled by regex
 * here: `capabilities/callRule.test.ts` validates every example against its
 * verb's whole input schema.
 */

import { describe, expect, it } from "vitest";
import { storyModules } from "../../capabilities/distribution.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { formatVerbHelp } from "../project/cli/verbHelp.js";
import { renderCall } from "../spec/call.js";
import { describeTool, exampleCall } from "../spec/guidance.js";
import { toolName } from "../spec/index.js";
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

// The fragments below track the stories' CURRENT prose. They are quoted by
// FRAGMENT and not by exact string on purpose — tool descriptions are
// explicitly not frozen, and what this file pins is the WIRING: that a
// definition-level description reaches the list tool, a lookup-level one
// reaches the lookup tool, an extra verb's reaches its own, and that the MCP
// call example never leaks into CLI help. When a story's prose is rewritten
// these move with it; when a description stops REACHING its tool, they fail.
describe("pack toolDescription wiring (PROTECTED)", () => {
  it("routes the lookup-level toolDescription to MCP, whole (with the call example)", async () => {
    const mcp = await projectMcp([tokenModule]);
    const desc = (await mcp.listTools()).find(
      (t) => t.name === "token_lookup",
    )?.description;
    await mcp.cleanup();
    expect(desc).toContain("Get one design-token symbol in full");
    // The declared example reaches MCP, rendered as a tool call.
    expect(desc).toContain(
      'Example: token_lookup { name: ["color.text","color.border"] }.',
    );
  });

  it("routes the definition-level toolDescription to the MCP list tool", async () => {
    const mcp = await projectMcp([tokenModule]);
    const desc = (await mcp.listTools()).find(
      (t) => t.name === "token_list",
    )?.description;
    await mcp.cleanup();
    // The rich description reaches MCP (was previously dropped — only `summary`
    // reached the tool), behind the question it answers and before its example.
    expect(desc).toMatch(/^Use when asked which design tokens exist/);
    expect(desc).toContain("List the design-token SYMBOLS");
    expect(desc).toContain(
      'Example: token_list { type: ["color","dimension"] }.',
    );
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
    // Callable with no arguments, so there is no example to show.
    expect(desc).not.toContain("Example:");
  });

  it("CLI --help shows the prose and the example as a COMMAND, never as a tool call", () => {
    const lookupHelp = formatVerbHelp("pragma", verb(tokenModule, "lookup"));
    expect(lookupHelp).toContain("Get one design-token symbol in full");
    expect(lookupHelp).toContain("Use when asked everything about one token");
    // The same declared example, spelled for this surface.
    expect(lookupHelp).toContain("pragma token lookup color.text");
    // No-leaks: the `token_lookup {…}` MCP call shape must not reach CLI help.
    expect(lookupHelp).not.toContain("token_lookup {");
    expect(lookupHelp).not.toContain("Example:");

    const listHelp = formatVerbHelp("pragma", verb(tokenModule, "list"));
    expect(listHelp).toContain("List the design-token SYMBOLS");
    expect(listHelp).not.toContain("token_list {");
  });
});

describe("every story tool's description is GENERATED from its verb (PROTECTED)", () => {
  // Four `*_lookup` descriptions once taught agents `{ names: [...] }` while
  // every schema required `name`, and `standard` once shipped no example at
  // all. Both were failures of hand-typed prose. The description is now built
  // from what the verb declares, so this asserts the build — for EVERY story
  // tool, against the one generator — rather than pattern-matching the prose.
  it("is the question, then the prose, then the verb's own example as a tool call", async () => {
    const modules = [...storyModules.values()];
    const mcp = await projectMcp(modules);
    try {
      const tools = await mcp.listTools();
      const verbs = modules.flatMap((module) => module.verbs);
      expect(tools.length).toBe(verbs.length);
      for (const storyVerb of verbs) {
        const name = toolName(storyVerb.path);
        const desc = tools.find((tool) => tool.name === name)?.description;
        expect(desc, name).toBe(describeTool(storyVerb));
        expect(desc, name).toMatch(/^Use /);
        expect(desc, name).toContain(storyVerb.useWhen);
        // Spelled with its OWN name and its declared params, so an example
        // cannot be copied from a sibling tool and left stale. A verb callable
        // with no arguments declares none, and shows none.
        const example = exampleCall(storyVerb);
        if (example) {
          expect(desc, name).toContain(
            `Example: ${renderCall(example, "mcp")}.`,
          );
        } else {
          expect(desc, name).not.toContain("Example:");
        }
      }
    } finally {
      await mcp.cleanup();
    }
  });
});
