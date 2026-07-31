/**
 * The `block` capability module — a COMPOSITE: the hand-written `block list`
 * (tier chain + channel + --all-tiers) plus the declared story's GraphQL
 * `lookup`.
 *
 * `block list` cannot be a story: it filters by the TIER CHAIN (a config value
 * expanded to a parent chain) and by CHANNEL (release-level visibility), a
 * config-sourced hierarchical filter the pack grammar has no term for. The
 * story ships lookup-only, so there is no `(noun, verb)` collision.
 */

import type { CapabilityModule } from "../../kernel/spec/types.js";
import { storyModules } from "../distribution.js";
import { blockListVerb } from "./blockList.verb.js";

const story = storyModules.get("block");

/** The `block` capability module (`list` hand-written, `lookup` from the story). */
export const blockModule: CapabilityModule = {
  name: "block",
  story: true,
  verbs: [blockListVerb, ...(story?.verbs ?? [])],
  // The design-system domain colophon (declared on the flagship UI-block noun),
  // surfaced by `pragma colophon` after pragma's own.
  colophon: story?.colophon,
};
