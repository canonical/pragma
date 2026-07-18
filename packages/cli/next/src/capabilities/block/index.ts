/**
 * The `block` capability module — a COMPOSITE: the hand-written `block list`
 * (tier chain + channel + --all-tiers) plus the bundled pack's GraphQL `lookup`.
 *
 * This is the one noun where a declarative pack and a hand-written verb share a
 * module; the pack ships lookup-only, so there is no `(noun, verb)` collision.
 */

import { compilePack } from "../../kernel/packs/compile.js";
import { DEFAULT_PREFIX_MAP } from "../../kernel/render/prefixes.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import { blockListVerb } from "./blockList.verb.js";
import { blockPack } from "./pack.js";

/** The `block` capability module (`list` hand-written, `lookup` from the pack). */
export const blockModule: CapabilityModule = {
  name: "block",
  verbs: [
    blockListVerb,
    ...compilePack(blockPack, "bundled:block", DEFAULT_PREFIX_MAP),
  ],
  // The bundled design-system domain colophon (authored on the flagship UI-block
  // noun), surfaced by `pragma colophon` after pragma's own.
  colophon: blockPack.colophon,
};
