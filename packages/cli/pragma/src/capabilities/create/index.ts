/**
 * The `create` capability barrel — component / package / application scaffolds.
 *
 * Importing this pulls only the verb specs (static params + formatters); every
 * generator load and the summon-core runtime stay behind each verb's lazy
 * `run` dispatch, so the command tree builds without touching summon-core.
 */

import { asVerb } from "../../kernel/spec/asVerb.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import {
  createApplicationVerb,
  createComponentVerb,
  createPackageVerb,
} from "./create.verb.js";

/** The `create` capability module. */
export const createModule: CapabilityModule = {
  name: "create",
  verbs: [
    asVerb(createComponentVerb),
    asVerb(createPackageVerb),
    asVerb(createApplicationVerb),
  ],
};
