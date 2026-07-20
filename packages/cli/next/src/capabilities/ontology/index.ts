/**
 * The `ontology` capability module — schema (TBox) inspection.
 */

import type { CapabilityModule } from "../../kernel/spec/types.js";
import {
  ontologyListVerb,
  ontologyLookupVerb,
  ontologyShowVerb,
} from "./verbs.js";

/**
 * The `ontology` capability module (`list`, `lookup`, and the deprecated `show`
 * alias — AV-228 B1).
 */
export const ontologyModule: CapabilityModule = {
  name: "ontology",
  verbs: [ontologyListVerb, ontologyLookupVerb, ontologyShowVerb],
};
