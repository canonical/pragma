/**
 * The strip-socket facet: how the shell learns what the active route's
 * composed layout wants in the mode strip (the P-5 handshake).
 *
 * This replaces the hand-written `readStripSlots` reader. The behaviour is
 * unchanged — same key, same four diagnostics, same identity-preserving
 * return — but the AUTHORING side is now typed too: routes spread
 * `shellStripFacet.of({ … })` into `meta` instead of writing a bare computed
 * key with a `satisfies` beside it. The `satisfies` was doing the value
 * check by hand at every claim site; `of()` does it once, in the signature.
 *
 * Absence is fine (empty sockets), presence-and-malformed throws, because a
 * route that half-declares its strip is a bug, not an absence. The four
 * messages below are pinned by `stripFacet.tests.ts` — they are what makes
 * this the tenant whose migration proves the helper.
 */

import { defineFacet } from "#lib/routeFacet/index.js";
import { SHELL_STRIP_META_KEY } from "./constants.js";
import type { StripSlotsEntry } from "./types.js";

export const shellStripFacet = defineFacet<
  StripSlotsEntry,
  typeof SHELL_STRIP_META_KEY
>(SHELL_STRIP_META_KEY, (entry, key) => {
  if (typeof entry !== "object" || entry === null) {
    throw new Error(`route meta ${key} is not an object`);
  }
  const { Context, Controls, Status } = entry as Record<string, unknown>;
  if (Context !== undefined && typeof Context !== "function") {
    throw new Error(`route meta ${key}.Context is not a component`);
  }
  if (Controls !== undefined && typeof Controls !== "function") {
    throw new Error(`route meta ${key}.Controls is not a component`);
  }
  if (Status !== undefined && typeof Status !== "function") {
    throw new Error(`route meta ${key}.Status is not a component`);
  }
  return entry as StripSlotsEntry;
});
