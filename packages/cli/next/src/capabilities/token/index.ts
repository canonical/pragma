/**
 * The `token` capability module — the bundled SPARQL pack compiled to verbs.
 */

import { compilePack } from "../../kernel/packs/compile.js";
import { DEFAULT_PREFIX_MAP } from "../../kernel/render/prefixes.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import { tokenAddConfigVerb } from "./addConfig.verb.js";
import { tokenPack } from "./pack.js";

/** The `token` capability module — the bundled read pack plus the `add-config`
 * mutation (hand-written; the pack compiler emits reads only). */
export const tokenModule: CapabilityModule = {
  name: "token",
  verbs: [
    ...compilePack(tokenPack, "bundled:token", DEFAULT_PREFIX_MAP),
    tokenAddConfigVerb,
  ],
};
