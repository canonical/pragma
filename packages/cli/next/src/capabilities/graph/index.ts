/**
 * The `graph` capability module — `inspect` (single-entity read) plus `query`
 * (the raw SPARQL escape hatch, PR6). The covenant blesses both.
 */

import type { CapabilityModule } from "../../kernel/spec/types.js";
import { resourceProvider } from "../resources/index.js";
import { graphInspectVerb } from "./inspect.verb.js";
import { graphQueryVerb } from "./query.verb.js";

/**
 * The `graph` capability module. Carries the MCP resource browser: `graph
 * inspect` (CLI) and the resource read (MCP) share one entity reader, so the
 * two projections stay in lockstep. Resources are NOT tools — the emitted tool
 * surface (and the golden) is unaffected.
 */
export const graphModule: CapabilityModule = {
  name: "graph",
  verbs: [graphInspectVerb, graphQueryVerb],
  mcpResources: resourceProvider,
};
