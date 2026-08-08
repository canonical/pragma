/**
 * The `[layer]` suffix a resolved config value carries when a file supplied it.
 *
 * ONE HOME, because there are two renderers of the same fact: `config show` and
 * `info` both print the resolved config with its winning layer, and a user who
 * sees `[project]` from one and nothing from the other has been told two things
 * about one value. They carried byte-identical copies of this three-line rule
 * (cs:code.function.location), and each copy was the only reason its file
 * imported `ConfigOrigin` at all.
 *
 * IN `capabilities/shared/` RATHER THAN `kernel/render/`, WHICH WAS TRIED
 * FIRST. Both consumers are capabilities, so this is already the broadest point
 * of use — but the deciding reason is a guard's blind spot, measured while
 * moving it. `capabilities/lazy.test.ts` finds every fast-path module with an
 * edge into the config layer by matching the SPECIFIER TEXT for
 * `kernel/config/`. A module under `src/kernel/` spells the same edge
 * `../config/types.js`, which does not contain that substring, so the guard
 * would not have seen this edge at all: the run that proved it dropped
 * `config/show.render.ts` and `info/info.render.ts` from the pinned set and
 * added nothing in their place. Moving the edge to where the guard is blind is
 * a weakening even when the suite goes green, so the edge stays where it is
 * seen. The blind spot itself is recorded in `lazy.test.ts`.
 *
 * The `ConfigOrigin` edge is TYPE-ONLY and must stay so — that is what the same
 * guard asserts about every module it enumerates.
 */

import type { ConfigOrigin } from "../../kernel/config/types.js";

/**
 * Render a config value's origin as a display suffix.
 *
 * @param origin - The layer the resolved value came from.
 * @returns ` [global]`/` [project]`, or "" for a built-in default.
 */
export function renderOriginMarker(origin: ConfigOrigin): string {
  return origin === "default" ? "" : ` [${origin}]`;
}
