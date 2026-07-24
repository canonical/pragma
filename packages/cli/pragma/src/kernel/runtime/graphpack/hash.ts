/**
 * The two content hashes a pack carries — kept in distinct roles, never
 * conflated.
 *
 * 1. {@link contentHash} — a SHA-256 (ke-graphql's `sha256Hex`) over the
 *    canonicalized *source inputs* (sorted by path, path + content joined with
 *    fixed delimiters). It names the pack's cache directory and is pinned in the
 *    lock, so the same sources always resolve to the same directory and a
 *    changed source is a new directory (free invalidation). Hashing the sorted
 *    TTL *inputs* — never the `data.nq` dump, whose n-quads line order is not
 *    canonical — keeps it deterministic.
 * 2. `hashSources` (re-exported from ke-graphql) — an order-independent FNV-1a
 *    64 fingerprint stored *inside* `schema.json` as the extraction's freshness
 *    token. ke-graphql compares it against the loaded sources to detect a stale
 *    artifact. It is a staleness signal, not a cache key.
 */

import { hashSources, sha256Hex } from "@canonical/ke-graphql";

/** A single source input: a stable path label and its raw text content. */
export interface HashInput {
  readonly path: string;
  readonly content: string;
}

/** Delimiter between a source's path and its content. */
const FIELD_SEP = "\n<<<pragma-pack:content>>>\n";
/** Delimiter between successive sources. */
const RECORD_SEP = "\n<<<pragma-pack:next>>>\n";

/**
 * The pack's content hash: SHA-256 over the canonicalized source inputs.
 *
 * @param inputs - The source inputs (path + content).
 * @returns The lowercase hex SHA-256 — the pack's cache-directory name.
 * @note Async — SHA-256 via Web Crypto.
 */
export function contentHash(inputs: readonly HashInput[]): Promise<string> {
  const canonical = [...inputs]
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map((input) => `${input.path}${FIELD_SEP}${input.content}`)
    .join(RECORD_SEP);
  return sha256Hex(canonical);
}

export { hashSources };
