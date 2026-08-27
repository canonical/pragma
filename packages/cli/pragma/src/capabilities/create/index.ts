/**
 * The `create` capability barrel — component / package / application scaffolds.
 *
 * Importing this pulls only the verb specs (params derived from the committed
 * projection), the mount, and the formatters; every generator load and the
 * summon-core runtime stay behind the lazy `run` dispatch, so the command
 * tree builds without touching summon-core.
 */

import { asVerb } from "../../kernel/spec/asVerb.js";
import type { CapabilityModule } from "../../kernel/spec/index.js";
import { createCliProjection } from "./cliProjection.js";
import { createVerbs } from "./create.verb.js";

/** The `create` capability module. */
export const createModule: CapabilityModule = {
  name: "create",
  verbs: Object.values(createVerbs).map(asVerb),
  cliProjection: createCliProjection(),
};
