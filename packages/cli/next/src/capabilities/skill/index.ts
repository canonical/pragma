/**
 * The `skill` capability module — storeless filesystem discovery.
 */

import type { CapabilityModule } from "../../kernel/spec/types.js";
import { skillListVerb, skillLookupVerb } from "./verbs.js";

/** The `skill` capability module (`list`, `lookup`). */
export const skillModule: CapabilityModule = {
  name: "skill",
  verbs: [skillListVerb, skillLookupVerb],
};
