// =============================================================================
// Connection page-size clamp. A connection must never return an unbounded
// list, and a client must never be able to demand an arbitrarily large page.
// This is applied at the two pagination choke points (paginateUriWindow and
// toConnection) so every connection — root, nested, and TBox — is bounded.
// =============================================================================

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./constants.js";

/**
 * Clamp a connection's page size: apply the default `first` when the client
 * gave neither `first` nor `last`, and cap a too-large `first`/`last` at the
 * ceiling (`{ defaultPageSize, maxPageSize }`, defaulting to the hardening
 * constants). Negative values pass through unchanged — the connection helpers
 * reject those with a GraphQLError, which this must not mask. Returns a new
 * args object; the input is not mutated.
 */
export default function clampConnectionArgs<
  T extends { first?: number | null; last?: number | null },
>(
  args: T,
  limits: { defaultPageSize: number; maxPageSize: number } = {
    defaultPageSize: DEFAULT_PAGE_SIZE,
    maxPageSize: MAX_PAGE_SIZE,
  },
): T {
  // No page bound supplied → impose the default page size.
  if (args.first == null && args.last == null) {
    return { ...args, first: limits.defaultPageSize };
  }
  let { first, last } = args;
  if (first != null && first > limits.maxPageSize) {
    first = limits.maxPageSize;
  }
  if (last != null && last > limits.maxPageSize) {
    last = limits.maxPageSize;
  }
  return { ...args, first, last };
}
