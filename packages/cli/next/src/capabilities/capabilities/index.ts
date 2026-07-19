/**
 * The `capabilities` capability module — the grammar-derived orientation tool
 * that replaces the retired `llm` tool.
 */

import type { CapabilityModule } from "../../kernel/spec/types.js";
import { capabilitiesSelfVerb } from "./capabilities.verb.js";

/** The `capabilities` capability module (a single storeless self-verb). */
export const capabilitiesModule: CapabilityModule = {
  name: "capabilities",
  verbs: [capabilitiesSelfVerb],
};
