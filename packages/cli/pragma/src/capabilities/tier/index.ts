/**
 * The `tier` capability module — a COMPOSITE: the declared story's flat `list`
 * plus the bespoke single-name `lookup`.
 *
 * `tier lookup` stays hand-written because the covenant freezes it with a single
 * `<name>` positional, where a pack lookup emits the variadic `<name...>`;
 * retiring it is a covenant change, not a migration.
 */

import type { CapabilityModule } from "../../kernel/spec/types.js";
import { storyModules } from "../distribution.js";
import { tierLookupVerb } from "./lookup.verb.js";

const story = storyModules.get("tier");

/** The `tier` capability module (the declared list + the bespoke lookup). */
export const tierModule: CapabilityModule = {
  name: "tier",
  story: true,
  verbs: [...(story?.verbs ?? []), tierLookupVerb],
};
