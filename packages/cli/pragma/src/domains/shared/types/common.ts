/** Shared cross-domain types used by multiple domains and contracts. */

/** Runtime filter settings controlling tier and channel visibility in queries. */
export interface FilterConfig {
  /** Active tier path, or `undefined` for all-tiers visibility. */
  readonly tier: string | undefined;
  /** Release channel determining which stability levels are visible. */
  readonly channel: "normal" | "experimental" | "prerelease";
}

/**
 * Controls how much detail an operation returns.
 *
 * - `"summary"` — minimal fields (names and counts).
 * - `"digest"` — intermediate detail with optional example length cap.
 * - `"detailed"` — full content including code blocks and anatomy.
 */
export type Disclosure =
  | { readonly level: "summary" }
  | { readonly level: "digest"; readonly maxExampleLength?: number }
  | { readonly level: "detailed" };

/** Outcome of a batch operation: successful results alongside per-item errors. */
export interface BatchResult<T> {
  /** Items that were processed successfully. */
  readonly results: readonly T[];
  /** Items that failed, each carrying the entity name, error code, and message. */
  readonly errors: readonly {
    name: string;
    code: string;
    message: string;
  }[];
}
