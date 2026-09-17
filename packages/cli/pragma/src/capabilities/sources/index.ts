/**
 * The `sources` capability barrel — `status` (storeless read), `update` (the
 * resolve/build/point Task), and `reset` (drop the pointer update wrote).
 */

import { asVerb } from "../../kernel/spec/asVerb.js";
import type { CapabilityModule } from "../../kernel/spec/index.js";
import { resetVerb } from "./reset.verb.js";
import { statusVerb } from "./status.verb.js";
import { updateVerb } from "./update.verb.js";

/** The `sources` capability module. */
export const sourcesModule: CapabilityModule = {
  name: "sources",
  verbs: [asVerb(statusVerb), asVerb(updateVerb), asVerb(resetVerb)],
};
