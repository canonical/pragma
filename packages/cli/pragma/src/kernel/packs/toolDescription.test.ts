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
import { standardModule } from "../../capabilities/standard/index.js";
import { tokenModule } from "../../capabilities/token/index.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { formatVerbHelp } from "../project/cli/verbHelp.js";
import type { VerbSpec } from "../spec/types.js";

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
      "Get type and theme values for one or more design tokens by name.",
    );
    // The authored MCP tool-call example survives on the MCP surface.
    expect(desc).toContain(
      'Example: token_lookup { names: ["color.primary"] }',
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
    expect(desc).toContain("List all design tokens with their type.");
    expect(desc).toContain("Example: token_list {}");
  });

  it("routes an extra-verb toolDescription to its MCP tool", async () => {
    const mcp = await projectMcp([standardModule]);
    const desc = (await mcp.listTools()).find(
      (t) => t.name === "standard_categories",
    )?.description;
    await mcp.cleanup();
    expect(desc).toBe("List all code standard categories.");
  });

  it("CLI --help shows the rich prose but NEVER the MCP tool-call syntax", () => {
    const lookupHelp = formatVerbHelp("pragma", verb(tokenModule, "lookup"));
    expect(lookupHelp).toContain(
      "Get type and theme values for one or more design tokens by name.",
    );
    // No-leaks: the `token_lookup {…}` MCP call shape must not reach CLI help.
    expect(lookupHelp).not.toContain("token_lookup {");
    expect(lookupHelp).not.toContain("Example:");

    const listHelp = formatVerbHelp("pragma", verb(tokenModule, "list"));
    expect(listHelp).toContain("List all design tokens with their type.");
    expect(listHelp).not.toContain("token_list {");
  });
});
