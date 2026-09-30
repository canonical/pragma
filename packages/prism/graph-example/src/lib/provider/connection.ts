/**
 * Relay cursor pagination over a plain array.
 *
 * Cursor = base64 of the item's absolute IRI, the same convention ke-graphql
 * uses. Opaque to clients, stable across requests, and impossible to drift
 * from the identity it pages over because it IS that identity.
 *
 * This file is NOT evidence about the converged base: `first`/`after`/`last`/
 * `before` on `OntologyClass.instances` is Relay's cost, and it would be
 * present in any connection-shaped spec.
 */

import { DEFAULT_PAGE_SIZE } from "./constants.js";

/** Arguments of a Relay connection field. */
export interface ConnectionArgs {
  readonly first?: number | null;
  readonly after?: string | null;
  readonly last?: number | null;
  readonly before?: string | null;
}

/** One page: the surviving items plus the flags Relay needs to page on. */
export interface ConnectionPage<T> {
  readonly items: readonly T[];
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

/** Encode an IRI as an opaque cursor. */
export const toCursor = (uri: string): string =>
  Buffer.from(uri, "utf-8").toString("base64");

/** Decode a cursor back to the IRI it was made from. */
export const fromCursor = (cursor: string): string =>
  Buffer.from(cursor, "base64").toString("utf-8");

/**
 * Locate a cursor in `items`, or -1. An absent cursor and an unknown cursor
 * are the same answer on purpose: cursors are client-supplied, so a stale one
 * should degrade to a full page rather than a 500.
 */
const indexOfCursor = <T>(
  items: readonly T[],
  identify: (item: T) => string,
  cursor: string | null | undefined,
): number =>
  cursor === null || cursor === undefined
    ? -1
    : items.findIndex((item) => identify(item) === fromCursor(cursor));

/**
 * Slice `items` per the Cursor Connections spec: cut to `after`/`before`
 * first, then take `first` from the head and `last` from the tail.
 *
 * The page flags say whether anything was cut off that end — by a cursor OR
 * by a count. That distinction matters: `last: 2` with no `before` reaches the
 * end of the list, so `hasNextPage` is false even though 14 items were
 * dropped from the head.
 *
 * `first` falls back to a default page size only when neither count is given,
 * so an unbounded query cannot walk the whole ABox by accident.
 *
 * THREE POINTS WHERE THE SPEC IS EXACT AND AN OBVIOUS IMPLEMENTATION IS NOT:
 *
 * 1. A NEGATIVE count is an error, not a value to clamp. The spec says so, and
 *    clamping is the worse answer either way: `first: -1` silently returning a
 *    default page is a client bug that never surfaces.
 * 2. BOTH flags are computed from the CURSOR-cut window, before either count
 *    trims it. `HasPreviousPage` is defined as "does ApplyCursorsToEdges hold
 *    more than `last`" — not "did the tail cut fire". Asking after `first` had
 *    already shortened the window made `first: 2, last: 4` over five items
 *    report no previous page, because by then the window held two.
 * 3. An explicit `null` count is NOT a supplied count. GraphQL delivers an
 *    omitted argument and an explicit `null` differently, and the spec treats
 *    them alike; testing `!== undefined` made `first: null` look like a client
 *    request for a page size and answered from the DEFAULT rather than from
 *    the cursor.
 */
export const sliceConnection = <T>(
  items: readonly T[],
  identify: (item: T) => string,
  args: ConnectionArgs,
): ConnectionPage<T> => {
  // Omitted and explicitly null are the same absence — see point 3 above.
  const requestedFirst = args.first ?? null;
  const requestedLast = args.last ?? null;
  if (requestedFirst !== null && requestedFirst < 0) {
    throw new Error(`first must not be negative (received ${requestedFirst})`);
  }
  if (requestedLast !== null && requestedLast < 0) {
    throw new Error(`last must not be negative (received ${requestedLast})`);
  }

  const start = indexOfCursor(items, identify, args.after) + 1;
  const beforeIndex = indexOfCursor(items, identify, args.before);
  const end = beforeIndex === -1 ? items.length : beforeIndex;

  // ApplyCursorsToEdges: the window the spec computes both flags against.
  const cursorWindow = items.slice(start, Math.max(start, end));

  const first =
    requestedFirst ?? (requestedLast === null ? DEFAULT_PAGE_SIZE : null);

  let window = cursorWindow;
  if (first !== null && window.length > first) {
    window = window.slice(0, first);
  }
  if (requestedLast !== null && window.length > requestedLast) {
    window = window.slice(window.length - requestedLast);
  }

  // The spec's precedence keys on the count the CLIENT asked for, not on the
  // default this function supplies when it asked for neither. A defaulted
  // `first` that did not trim says nothing about what lies beyond `before`,
  // so in that case the cursor answer still stands — and a defaulted `first`
  // that DID trim is itself proof of a next page.
  const hasNextPage =
    requestedFirst !== null
      ? cursorWindow.length > requestedFirst
      : (first !== null && cursorWindow.length > first) || end < items.length;
  const hasPreviousPage =
    requestedLast !== null ? cursorWindow.length > requestedLast : start > 0;

  return { items: window, hasNextPage, hasPreviousPage };
};
