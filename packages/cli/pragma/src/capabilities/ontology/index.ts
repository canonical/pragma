/**
 * The `ontology` capability module — schema (TBox) inspection.
 */

import type { CapabilityModule } from "../../kernel/spec/types.js";
import { ontologyListVerb, ontologyLookupVerb } from "./verbs.js";

/** The `ontology` capability module (`list` and the `lookup` by-name read). */
export const ontologyModule: CapabilityModule = {
  name: "ontology",
  verbs: [ontologyListVerb, ontologyLookupVerb],
};
