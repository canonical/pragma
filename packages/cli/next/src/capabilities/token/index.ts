/**
 * The `token` capability module — the bundled SPARQL pack compiled to verbs.
 */

import { compilePack } from "../../kernel/packs/compile.js";
import { DEFAULT_PREFIX_MAP } from "../../kernel/render/prefixes.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import { tokenPack } from "./pack.js";

/** The `token` capability module (`list`, `lookup`). */
export const tokenModule: CapabilityModule = {
  name: "token",
  verbs: compilePack(tokenPack, "bundled:token", DEFAULT_PREFIX_MAP),
};
