// =============================================================================
// Relay cursor pagination over a plain array.
//
// Cursor = base64 of the item's absolute IRI, the same convention ke-graphql
// uses. Opaque to clients, stable across requests, and impossible to drift
// from the identity it pages over because it IS that identity.
//
// This file is NOT evidence about the converged base: `first`/`after`/`last`/
// `before` on `OntologyClass.instances` is Relay's cost, and it would be
// present in any connection-shaped spec.
// =============================================================================

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
 */
export const sliceConnection = <T>(
  items: readonly T[],
  identify: (item: T) => string,
  args: ConnectionArgs,
): ConnectionPage<T> => {
  const start = indexOfCursor(items, identify, args.after) + 1;
  const beforeIndex = indexOfCursor(items, identify, args.before);
  const end = beforeIndex === -1 ? items.length : beforeIndex;

  let window = items.slice(start, Math.max(start, end));
  let hasNextPage = end < items.length;
  let hasPreviousPage = start > 0;

  const last = args.last ?? null;
  const first = args.first ?? (last === null ? DEFAULT_PAGE_SIZE : null);

  if (first !== null && window.length > first) {
    window = window.slice(0, Math.max(0, first));
    hasNextPage = true;
  }
  if (last !== null && window.length > last) {
    window = window.slice(window.length - Math.max(0, last));
    hasPreviousPage = true;
  }

  return { items: window, hasNextPage, hasPreviousPage };
};
