/**
 * The `tier` capability module — the bundled flat-list pack compiled to `list`.
 */

import { compilePack } from "../../kernel/packs/compile.js";
import { DEFAULT_PREFIX_MAP } from "../../kernel/render/prefixes.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import { tierPack } from "./pack.js";

/** The `tier` capability module (`list` only). */
export const tierModule: CapabilityModule = {
  name: "tier",
  verbs: compilePack(tierPack, "bundled:tier", DEFAULT_PREFIX_MAP),
};
