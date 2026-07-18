/**
 * The `modifier` capability module — the bundled pack (SPARQL list, GraphQL
 * lookup) compiled to verbs.
 */

import { compilePack } from "../../kernel/packs/compile.js";
import { DEFAULT_PREFIX_MAP } from "../../kernel/render/prefixes.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import { modifierPack } from "./pack.js";

/** The `modifier` capability module (`list`, `lookup`). */
export const modifierModule: CapabilityModule = {
  name: "modifier",
  verbs: compilePack(modifierPack, "bundled:modifier", DEFAULT_PREFIX_MAP),
};
