/**
 * Bundled transitional story packs.
 *
 * These are declarative replacements for design-system domains that used to be
 * hand-written TypeScript in the CLI core. They ship inside pragma during the
 * strangler migration (ADR C.07) and are the **lowest-precedence** pack
 * source: a `pragma.config.json` `stories` entry or a semantic package's
 * `stories/*.json` for the same noun overrides the bundled one, so a package
 * can take ownership of its noun (the P4 end state) without a code change here.
 *
 * As each leaf domain is cut over, its built-in command is deleted (freeing the
 * noun from the reserved set) and its pack is added to this list.
 */

import type { StoryPackDefinition } from "../types.js";
import { modifierPack } from "./modifierPack.js";
import { standardPack } from "./standardPack.js";
import { tierPack } from "./tierPack.js";

/** Every pack pragma ships by default, lowest precedence. */
export const BUNDLED_PACKS: readonly StoryPackDefinition[] = [
  tierPack,
  standardPack,
  modifierPack,
];
