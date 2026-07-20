/**
 * The `prompt` capability module — the covenant content noun
 * (`prompt_list`/`prompt_lookup`) PLUS the native MCP `prompts/*` surface, both
 * projecting the ONE `ds:Prompt` source. The `mcpPrompts` hook is the same
 * `promptProvider` the kernel defines; this module is where it attaches, so the
 * default MCP server advertises prompts sourced from the active graph.
 */

import { promptProvider } from "../../kernel/project/mcp/prompts/provider.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import { promptListVerb, promptLookupVerb } from "./verbs.js";

/** The `prompt` capability module (content tools + native prompt surface). */
export const promptModule: CapabilityModule = {
  name: "prompt",
  verbs: [promptListVerb, promptLookupVerb],
  mcpPrompts: promptProvider,
};
