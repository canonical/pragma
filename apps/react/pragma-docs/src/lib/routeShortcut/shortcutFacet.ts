/**
 * A route's single-key shortcut, allocated by the route that OWNS the
 * destination rather than by a table sitting beside it.
 *
 * This directory is deliberately neutral ground rather than part of
 * `#lib/Rail`. Precedent is split — `SHELL_STRIP_META_KEY` lives with its
 * reader in `#lib/Shell`, `ROUTE_QUERY_META_KEY` with its in `#relay` — but
 * the rail is only the first DISPLAY of this allocation, not its owner, and
 * a home here costs one directory now instead of a file move later.
 *
 * THE VALUE IS A BARE `KeyboardEvent.key` STRING, deliberately the smallest
 * honest thing. The command grammar — modes, registers, chords, sequences,
 * labels — is PARKED, not forgotten; widening this to an object when it
 * lands is mechanical, and every call site is a type error until it is done.
 *
 * NO VERBS. A shortcut names a PLACE YOU GO, never an operation: the whole
 * effect is `router.navigate(name)`. Do not grow an action field, a
 * confirmation, or a destructive branch here.
 */

import { defineFacet } from "#lib/routeFacet/index.js";

/** The `meta` key under which a route allocates its keyboard shortcut. */
export const ROUTE_SHORTCUT_META_KEY = "shortcut";

export const routeShortcutFacet = defineFacet<
  string,
  typeof ROUTE_SHORTCUT_META_KEY
>(ROUTE_SHORTCUT_META_KEY, (value, key) => {
  // Code points, not UTF-16 units: `KeyboardEvent.key` for a printable key
  // is one grapheme, which `.length` would miscount above the BMP.
  if (typeof value !== "string" || [...value].length !== 1) {
    throw new Error(
      `route meta ${key} is not a single-character key (got ${JSON.stringify(value)})`,
    );
  }
  return value;
});
