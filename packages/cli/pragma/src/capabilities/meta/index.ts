/**
 * The `meta` capability barrel — the hidden internal verbs (`__complete`,
 * `mcp`). Both are withheld from the surface and MCP; the bin fast-paths them.
 */

import { asVerb } from "../../kernel/spec/asVerb.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import { completeVerb } from "./complete.verb.js";
import { mcpVerb } from "./mcp.verb.js";

/** The `meta` capability module. */
export const metaModule: CapabilityModule = {
  name: "meta",
  verbs: [asVerb(completeVerb), asVerb(mcpVerb)],
};
