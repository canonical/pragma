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

import type { InstanceStats, RawExtraction } from "./types.js";

export const ARTIFACT_VERSION = 1;

export interface SerializedExtraction {
  version: typeof ARTIFACT_VERSION;
  /** Combined fingerprint of the TTL sources the extraction was built from. */
  sourcesHash: string;
  classes: RawExtraction["classes"];
  properties: RawExtraction["properties"];
  inverses: RawExtraction["inverses"];
  functionals: string[];
  datatypes: RawExtraction["datatypes"];
  namespaces: Array<[string, string]>;
  shaclConstraints: RawExtraction["shaclConstraints"];
  unions: RawExtraction["unions"];
  instanceStats: Array<[string, InstanceStats]>;
  selfReferential: string[];
  functionalViolations: string[];
  undeclaredPredicates: string[];
  annotations: Array<[string, Array<[string, string]>]>;
  deepBlankNesting: boolean;
}

/** FNV-1a 64-bit, hex. Deterministic, dependency-free, platform-free. */
const fnv1a64 = (input: string, seed = 0xcbf29ce484222325n): bigint => {
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
 * Fingerprint a set of source contents. Order-independent (sources are
 * combined commutatively) so glob ordering differences don't churn the hash.
 */
export const hashSources = (contents: Iterable<string>): string => {
  let combined = 0n;
  for (const content of contents) {
    combined ^= fnv1a64(content);
  }
  return combined.toString(16).padStart(16, "0");
};

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
