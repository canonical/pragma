// =============================================================================
// The precompute artifact (Prisma-DMMF pattern): RawExtraction is the only
// store-dependent pass output and is fully serializable. Build once with the
// store; rebuild the executable schema anywhere in milliseconds — no Oxigraph,
// no TTL parse, no SPARQL.
//
// `sourcesHash` keeps the artifact honest: it fingerprints the TTL inputs
// (FNV-1a 64 — staleness detection, not security), and consumers fall back
// to a live compile when it no longer matches the loaded sources.
// =============================================================================

import type { RawExtraction } from "#shared";
import { ARTIFACT_VERSION } from "./constants.js";
import type { SerializedExtraction } from "./types.js";

/** FNV-1a 64-bit hash of a string. Deterministic, dependency-free, platform-free. */
const hashFnv1a64 = (input: string, seed = 0xcbf29ce484222325n): bigint => {
  const PRIME = 0x100000001b3n;
  const MASK = 0xffffffffffffffffn;
  let hash = seed;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * PRIME) & MASK;
  }
  return hash;
};

/**
 * Fingerprint a set of source contents as a 16-character hex string
 * (FNV-1a 64 — staleness detection, not security). Order-independent
 * (sources are combined commutatively) so glob ordering differences don't
 * churn the hash.
 */
export const hashSources = (contents: Iterable<string>): string => {
  let combined = 0n;
  for (const content of contents) {
    combined ^= hashFnv1a64(content);
  }
  return combined.toString(16).padStart(16, "0");
};

/**
 * Serialize a RawExtraction (plus the fingerprint of the sources it was
 * built from) to the JSON artifact format — the input for artifact boots
 * via compileFromExtraction.
 */
export const serializeExtraction = (
  extraction: RawExtraction,
  sourcesHash: string,
): string =>
  JSON.stringify(
    {
      version: ARTIFACT_VERSION,
      sourcesHash,
      classes: extraction.classes,
      properties: extraction.properties,
      inverses: extraction.inverses,
      functionals: [...extraction.functionals],
      datatypes: extraction.datatypes,
      namespaces: [...extraction.namespaces],
      shaclConstraints: extraction.shaclConstraints,
      unions: extraction.unions,
      instanceStats: [...extraction.instanceStats],
      selfReferential: [...extraction.selfReferential],
      functionalViolations: [...extraction.functionalViolations],
      undeclaredPredicates: [...extraction.undeclaredPredicates],
      annotations: [...extraction.annotations].map(([target, values]) => [
        target,
        [...values],
      ]),
      deepBlankNesting: extraction.deepBlankNesting,
    } satisfies SerializedExtraction,
    null,
    0,
  );

/**
 * Parse a serialized extraction artifact (JSON text or already-parsed
 * object) back into a RawExtraction plus its sources fingerprint. Throws
 * when the artifact's format version is not the supported one.
 */
export const deserializeExtraction = (
  artifact: string | SerializedExtraction,
): { extraction: RawExtraction; sourcesHash: string } => {
  const parsed: SerializedExtraction =
    typeof artifact === "string" ? JSON.parse(artifact) : artifact;
  if (parsed.version !== ARTIFACT_VERSION) {
    throw new Error(
      `ke-graphql: extraction artifact version ${parsed.version} is not supported (expected ${ARTIFACT_VERSION}) — regenerate it`,
    );
  }
  return {
    sourcesHash: parsed.sourcesHash,
    extraction: {
      classes: parsed.classes,
      properties: parsed.properties,
      inverses: parsed.inverses,
      functionals: new Set(parsed.functionals),
      datatypes: parsed.datatypes,
      namespaces: new Map(parsed.namespaces),
      shaclConstraints: parsed.shaclConstraints,
      unions: parsed.unions,
      instanceStats: new Map(parsed.instanceStats),
      selfReferential: new Set(parsed.selfReferential),
      functionalViolations: new Set(parsed.functionalViolations),
      undeclaredPredicates: new Set(parsed.undeclaredPredicates),
      annotations: new Map(
        parsed.annotations.map(([target, values]) => [target, new Map(values)]),
      ),
      deepBlankNesting: parsed.deepBlankNesting,
    },
  };
};
