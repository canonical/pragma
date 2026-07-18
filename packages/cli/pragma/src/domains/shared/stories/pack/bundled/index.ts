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
 *
 * The `token` pack (its `token list`/`token lookup` read verbs, compiled to
 * `token_list`/`token_lookup`) is the design-system's token **read** surface,
 * gated behind {@link TOKEN_READ_SURFACE_ENABLED}: while the flag is off (the
 * ontology ships no token instances) the pack is not bundled at all, so those
 * commands and MCP tools are not registered — mirroring how the hand-written
 * token domain was gated before P2 cut it over to a pack. `pragma tokens
 * add-config` (built-in scaffolding) and the pack cutover are unaffected;
 * only the read surface is flag-gated.
 */

import { TOKEN_READ_SURFACE_ENABLED } from "../../../../token/featureFlag.js";
import type { StoryPackDefinition } from "../types.js";
import { blockPack } from "./blockPack.js";
import { modifierPack } from "./modifierPack.js";
import { standardPack } from "./standardPack.js";
import { tierPack } from "./tierPack.js";
import { tokenPack } from "./tokenPack.js";

/** Every pack pragma ships by default, lowest precedence. */
export const BUNDLED_PACKS: readonly StoryPackDefinition[] = [
  tierPack,
  standardPack,
  modifierPack,
  // Token read surface is feature-flagged off until token data ships.
  ...(TOKEN_READ_SURFACE_ENABLED ? [tokenPack] : []),
  blockPack,
];
