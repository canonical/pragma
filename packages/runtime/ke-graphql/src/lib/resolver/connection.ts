// =============================================================================
// Relay connection helpers.
//
// Cursor = base64(prefixed URI), opaque to clients. Items are sorted by URI
// before slicing so cursors remain stable regardless of triple order or
// Set-union order (root listings arrive name-sorted from the list loader and
// keep that order). Per the Cursor Connections spec: negative first/last
// throw, last: 0 yields zero edges.
// =============================================================================

import { GraphQLError } from "graphql";
import { clampConnectionArgs } from "#hardening";
import type { EntityValue } from "#shared";
import type { Connection, ConnectionArgs, Sortable, UriPage } from "./types.js";

/**
 * Encode a string as base64. Platform-neutral (Workers/browsers have
 * btoa/atob but no Buffer; Node has both) and Unicode-safe via TextEncoder.
 */
export const toBase64 = (value: string): string => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf-8").toString("base64");
  }
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

/**
 * Decode a base64 string (Unicode-safe, platform-neutral). Invalid input
 * decodes to "" rather than throwing — cursors are client-supplied.
 */
export const fromBase64 = (value: string): string => {
  try {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(value, "base64").toString("utf-8");
    }
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
};

/** Build the canonical empty connection (no edges, no cursors). */
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
 * (missing or typeless entities are filtered).
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

/**
 * Run the full pagination algorithm on the URI LIST, before any hydration:
 * cursors are base64(uri), hasNextPage is array math — entities are only
 * needed for the page itself. Input must already be in display order
 * (root listings arrive name-sorted from the list loader). Throws a
 * GraphQLError on negative first/last.
 */
export const paginateUriWindow = (
  uris: ReadonlyArray<string>,
  args: ConnectionArgs,
): UriPage => {
  // Hardening: impose a default page size and cap an over-large one before
  // any windowing (negatives pass through and are rejected below).
  const page = clampConnectionArgs(args);
  if (page.first != null && page.first < 0) {
    throw new GraphQLError('Argument "first" must be a non-negative integer');
  }
  if (page.last != null && page.last < 0) {
    throw new GraphQLError('Argument "last" must be a non-negative integer');
  }
  let start = 0;
  let end = uris.length;
  if (page.after) {
    const idx = uris.indexOf(fromBase64(page.after));
    if (idx !== -1) {
      start = idx + 1;
    }
  }
  if (page.before) {
    const idx = uris.indexOf(fromBase64(page.before));
    if (idx !== -1) {
      end = Math.min(end, idx);
    }
  }
  let hasNextPage = false;
  let hasPreviousPage = false;
  if (page.first != null && end - start > page.first) {
    end = start + page.first;
    hasNextPage = true;
  }
  if (page.last != null && end - start > page.last) {
    start = end - page.last;
    hasPreviousPage = true;
  }
  return { window: uris.slice(start, end), hasNextPage, hasPreviousPage };
};

/** Build a connection from an already-paginated, hydrated page. */
export const connectionFromPage = <T extends Sortable>(
  entities: T[],
  page: UriPage,
): Connection<T> => {
  const edges = entities.map((node) => ({
    node,
    cursor: toBase64(node.uri ?? ""),
  }));
  return {
    edges,
    pageInfo: {
      hasNextPage: page.hasNextPage,
      hasPreviousPage: page.hasPreviousPage,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
  };
};

/**
 * Build a Relay connection from a full in-memory list. O(n) — fine for the
 * data scale (≤ ~1000 items per list). Throws a GraphQLError on negative
 * first/last.
 *
 * @param presorted Skip the URI sort (root listings are name-sorted upstream).
 */
export const toConnection = <T extends Sortable>(
  allItems: T[],
  args: ConnectionArgs,
  presorted = false,
): Connection<T> => {
  // Hardening: impose a default page size and cap an over-large one before
  // slicing (negatives pass through and are rejected below).
  const page = clampConnectionArgs(args);
  if (page.first != null && page.first < 0) {
    throw new GraphQLError('Argument "first" must be a non-negative integer');
  }
  if (page.last != null && page.last < 0) {
    throw new GraphQLError('Argument "last" must be a non-negative integer');
  }

  let items = presorted
    ? [...allItems]
    : [...allItems].sort((a, b) => (a.uri ?? "").localeCompare(b.uri ?? ""));

  if (page.after) {
    const afterUri = fromBase64(page.after);
    const idx = items.findIndex((i) => i.uri === afterUri);
    if (idx !== -1) {
      items = items.slice(idx + 1);
    }
  }
  if (page.before) {
    const beforeUri = fromBase64(page.before);
    const idx = items.findIndex((i) => i.uri === beforeUri);
    if (idx !== -1) {
      items = items.slice(0, idx);
    }
  }

  const hasNextPage = page.first != null && items.length > page.first;
  const hasPreviousPage = page.last != null && items.length > page.last;

  if (page.first != null) {
    items = items.slice(0, page.first);
  }
  if (page.last != null) {
    items = items.slice(Math.max(items.length - page.last, 0));
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
