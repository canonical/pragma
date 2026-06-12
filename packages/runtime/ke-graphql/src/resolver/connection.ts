// =============================================================================
// Relay connection helper (KG.18).
//
// Cursor = base64(prefixed URI), opaque to clients. Items are sorted by URI
// before slicing so cursors remain stable regardless of triple order or
// Set-union order (root listings arrive name-sorted from the list loader and
// keep that order). Per the Cursor Connections spec: negative first/last
// throw, last: 0 yields zero edges.
// =============================================================================

import { GraphQLError } from "graphql";
import type { EntityValue } from "../compiler/types.js";

export interface ConnectionArgs {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
}

export interface Connection<T> {
  edges: Array<{ node: T; cursor: string }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
}

export const toBase64 = (value: string): string =>
  Buffer.from(value, "utf-8").toString("base64");

export const fromBase64 = (value: string): string => {
  try {
    return Buffer.from(value, "base64").toString("utf-8");
  } catch {
    return "";
  }
};

export const emptyConnection = <T>(): Connection<T> => ({
  edges: [],
  pageInfo: {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  },
});

/** DataLoader.loadMany returns (V | Error)[]; keep only real entities. */
export const isEntity = (
  value: EntityValue | Error | null,
): value is EntityValue =>
  value !== null && !(value instanceof Error) && typeof value === "object";

/**
 * Unwrap a loadMany result: rethrow the first Error (a failed batch must
 * surface as a GraphQL field error, not as an empty connection), drop nulls
 * (missing or typeless entities are filtered, KG.07).
 */
export const unwrapEntities = (
  results: ReadonlyArray<EntityValue | Error | null>,
): EntityValue[] => {
  const firstError = results.find((r): r is Error => r instanceof Error);
  if (firstError) {
    throw firstError;
  }
  return results.filter(isEntity);
};

export interface Sortable {
  uri: string | null;
}

/**
 * Build a Relay connection from a full in-memory list. O(n) — fine for the
 * data scale (≤ ~1000 items per list).
 *
 * @param presorted Skip the URI sort (root listings are name-sorted upstream).
 */
export const toConnection = <T extends Sortable>(
  allItems: T[],
  args: ConnectionArgs,
  presorted = false,
): Connection<T> => {
  if (args.first != null && args.first < 0) {
    throw new GraphQLError('Argument "first" must be a non-negative integer');
  }
  if (args.last != null && args.last < 0) {
    throw new GraphQLError('Argument "last" must be a non-negative integer');
  }

  let items = presorted
    ? [...allItems]
    : [...allItems].sort((a, b) => (a.uri ?? "").localeCompare(b.uri ?? ""));

  if (args.after) {
    const afterUri = fromBase64(args.after);
    const idx = items.findIndex((i) => i.uri === afterUri);
    if (idx !== -1) {
      items = items.slice(idx + 1);
    }
  }
  if (args.before) {
    const beforeUri = fromBase64(args.before);
    const idx = items.findIndex((i) => i.uri === beforeUri);
    if (idx !== -1) {
      items = items.slice(0, idx);
    }
  }

  const hasNextPage = args.first != null && items.length > args.first;
  const hasPreviousPage = args.last != null && items.length > args.last;

  if (args.first != null) {
    items = items.slice(0, args.first);
  }
  if (args.last != null) {
    items = items.slice(Math.max(items.length - args.last, 0));
  }

  const edges = items.map((item) => ({
    node: item,
    cursor: toBase64(item.uri ?? ""),
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
  };
};
