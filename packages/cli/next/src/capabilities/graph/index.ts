/**
 * The `graph` capability module (PR3: `inspect` only).
 *
 * `graph query` (arbitrary SPARQL) lands in PR6; the covenant already blesses it.
 */

import type { CapabilityModule } from "../../kernel/spec/types.js";
import { graphInspectVerb } from "./inspect.verb.js";

/** The `graph` capability module. */
export const graphModule: CapabilityModule = {
  name: "graph",
  verbs: [graphInspectVerb],
};
