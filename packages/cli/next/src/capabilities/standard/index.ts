/**
 * The `standard` capability module — the bundled pack compiled to verbs.
 *
 * Compiled at import (fast-path safe: compilePack is pure/zod-free) so the module
 * is surface-deterministic. A config/package story for `standard` overrides it at
 * dispatch (see kernel/packs/collect).
 */

import { compilePack } from "../../kernel/packs/compile.js";
import { DEFAULT_PREFIX_MAP } from "../../kernel/render/prefixes.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import { standardPack } from "./pack.js";

/** The `standard` capability module (list, categories, lookup, sample). */
export const standardModule: CapabilityModule = {
  name: "standard",
  verbs: compilePack(standardPack, "bundled:standard", DEFAULT_PREFIX_MAP),
};
