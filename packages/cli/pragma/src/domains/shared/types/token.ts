/** Token domain return types. */

import type { URI } from "@canonical/ke";

/** Summary view of a design token. */
export interface TokenSummary {
  /** Full RDF URI identifying this token in the ke store. */
  readonly uri: URI;
  /** Human-readable token name (e.g., `"color-primary"`). */
  readonly name: string;
  /** Token category (e.g., `"color"`, `"spacing"`, `"typography"`). */
  readonly category: string;
}

/** Digest view of a token for generic list contracts. */
export type TokenDigest = TokenSummary;

/** Detailed view of a token, extending the summary with per-theme resolved values. */
export interface TokenDetailed extends TokenSummary {
  /** Resolved values keyed by theme (e.g., `{ theme: "dark", value: "#fff" }`). */
  readonly values: readonly { theme: string; value: string }[];
}

/** Lightweight reference to a token (name + URI), used in cross-references. */
export interface TokenRef {
  /** Human-readable token name. */
  readonly name: string;
  /** Full RDF URI of the referenced token. */
  readonly uri: URI;
}
