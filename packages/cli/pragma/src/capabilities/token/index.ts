/**
 * The `token` capability module — a COMPOSITE: the declared story's read verbs
 * plus the hand-written `add-config` MUTATION (the pack compiler emits reads
 * only), in that order so `pragma token --help` leads with the reads.
 */

import type { CapabilityModule } from "../../kernel/spec/types.js";
import { storyModules } from "../distribution.js";
import { tokenAddConfigVerb } from "./addConfig.verb.js";

const story = storyModules.get("token");

/** The `token` capability module (declared reads + the `add-config` mutation). */
export const tokenModule: CapabilityModule = {
  name: "token",
  story: true,
  verbs: [...(story?.verbs ?? []), tokenAddConfigVerb],
};
