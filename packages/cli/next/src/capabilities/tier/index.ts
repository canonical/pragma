/**
 * The `tier` capability module — the bundled flat-list pack compiled to `list`.
 */

import { compilePack } from "../../kernel/packs/compile.js";
import { DEFAULT_PREFIX_MAP } from "../../kernel/render/prefixes.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import { tierLookupVerb } from "./lookup.verb.js";
import { tierPack } from "./pack.js";

/** The `tier` capability module — the bundled flat-list pack plus the bespoke
 * single-name `lookup` (a pack lookup would emit the variadic `<name...>`). */
export const tierModule: CapabilityModule = {
  name: "tier",
  verbs: [
    ...compilePack(tierPack, "bundled:tier", DEFAULT_PREFIX_MAP),
    tierLookupVerb,
  ],
};
