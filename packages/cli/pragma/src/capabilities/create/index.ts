/**
 * The `create` capability barrel — ONE VERB PER DECLARED NOUN, whatever a
 * distribution declares. The noun set is content: a fork's barrel holds its own.
 *
 * Importing this pulls only the verb specs (static params + formatters); every
 * generator load and the summon-core runtime stay behind each verb's lazy
 * `run` dispatch, so the command tree builds without touching summon-core.
 */

import { asVerb } from "../../kernel/spec/asVerb.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import { createVerbs } from "./create.verb.js";

/** The `create` capability module. */
export const createModule: CapabilityModule = {
  name: "create",
  verbs: Object.values(createVerbs).map(asVerb),
};
