/**
 * The `ontology` capability module — schema (TBox) inspection.
 */

import type { CapabilityModule } from "../../kernel/spec/types.js";
import { ontologyListVerb, ontologyLookupVerb } from "./verbs.js";

/** The `ontology` capability module (`list` and the `lookup` by-name read). */
export const ontologyModule: CapabilityModule = {
  name: "ontology",
<<<<<<< HEAD
  verbs: [ontologyListVerb, ontologyLookupVerb],
=======
  verbs: [ontologyListVerb, ontologyLookupVerb, ontologyShowVerb],
  /**
   * The ONE hand-declared listing in the distribution. Every other module is
   * story-compiled and has its slice DERIVED from the types its lookup already
   * names; this noun addresses the schema itself, which no `type` filter
   * expresses — the whole TBox is the answer, so it is stated once, here.
   *
   * `0.5` puts the schema below the story collections (weight 1) it explains
   * and above nothing else: an agent orienting itself wants the collections
   * first, then the vocabulary they are described in.
   */
  mcpListable: { sources: [{ box: "tbox", as: "entities", weight: 0.5 }] },
>>>>>>> eeb011a19 (feat(pragma-cli): curate the MCP resource listing from declared slices)
};
