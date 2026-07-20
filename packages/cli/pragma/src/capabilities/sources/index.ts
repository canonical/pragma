/**
 * The `sources` capability barrel — `status` (storeless read) and `update`
 * (the resolve/build/lock Task).
 */

import { asVerb } from "../../kernel/spec/asVerb.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import { statusVerb } from "./status.verb.js";
import { updateVerb } from "./update.verb.js";

/** The `sources` capability module. */
export const sourcesModule: CapabilityModule = {
  name: "sources",
  verbs: [asVerb(statusVerb), asVerb(updateVerb)],
};
