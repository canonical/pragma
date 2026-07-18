/**
 * The `ontology` capability module — schema (TBox) inspection.
 */

import type { CapabilityModule } from "../../kernel/spec/types.js";
import { ontologyListVerb, ontologyShowVerb } from "./verbs.js";

/** The `ontology` capability module (`list`, `show`). */
export const ontologyModule: CapabilityModule = {
  name: "ontology",
  verbs: [ontologyListVerb, ontologyShowVerb],
};
