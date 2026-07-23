/**
 * The `concept` capability module — the bundled pack (SPARQL list, SPARQL
 * lookup with a Markdown content section) compiled to verbs.
 */

import { compilePack } from "../../kernel/packs/compile.js";
import { DEFAULT_PREFIX_MAP } from "../../kernel/render/prefixes.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import { conceptPack } from "./pack.js";

/** The `concept` capability module (`list`, `lookup`, `sample`). */
export const conceptModule: CapabilityModule = {
  name: "concept",
  verbs: compilePack(conceptPack, "bundled:concept", DEFAULT_PREFIX_MAP),
};
