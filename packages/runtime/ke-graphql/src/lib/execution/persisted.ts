// =============================================================================
// Persisted-query manifest (KG.19): hash → query text, generated at build
// time from the client's compiled operations (e.g. relay-compiler output).
// In production the handler accepts only these (allowArbitraryQueries:
// false), and — because the store is immutable between deploys — responses
// become pure functions of (hash, variables): infinitely CDN-cacheable
// until the next deploy.
// =============================================================================

/**
 * Hash a string as lowercase SHA-256 hex — the Relay/Apollo persisted-query
 * hash convention (SHA-256 of the exact operation text). Uses Web Crypto:
 * platform-neutral (Node 18+, Bun, Workers).
 */
export const sha256Hex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * Build a persisted-query manifest (SHA-256 hash → operation text) from
 * operation texts. Feed the result to the handler:
 *
 * ```ts
 * const manifest = await createPersistedManifest(operationTexts);
 * createGraphQLHandler(schema, {
 *   persistedQueries: {
 *     get: (hash) => manifest[hash] ?? null,
 *     allowArbitraryQueries: false,
 *   },
 *   ...
 * });
 * ```
 */
export const createPersistedManifest = async (
  operations: Iterable<string>,
): Promise<Record<string, string>> => {
  const manifest: Record<string, string> = {};
  for (const text of operations) {
    manifest[await sha256Hex(text)] = text;
  }
  return manifest;
};
