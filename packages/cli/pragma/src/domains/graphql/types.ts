/**
 * Type definitions for the graphql domain.
 *
 * The compile report is the shared output shape for `graphql build` and
 * `graphql check`: the full diagnostic list plus source and artifact
 * metadata, rendered by the report formatters.
 */

import type { Diagnostic } from "@canonical/ke-graphql";

/** Artifact paths written by `pragma graphql build`. */
export interface GraphqlArtifacts {
  /** Absolute path of the written GraphQL SDL file. */
  readonly sdl: string;
  /** Absolute path of the written extraction artifact. */
  readonly extraction: string;
}

/** Output shape rendered by `graphql build` and `graphql check`. */
export interface GraphqlCompileReport {
  /** All compiler diagnostics (errors, warnings, info). */
  readonly diagnostics: readonly Diagnostic[];
  /** Resolved absolute TTL file paths that were compiled. */
  readonly files: readonly string[];
  /** Combined fingerprint of the raw TTL source contents. */
  readonly sourcesHash: string;
  /** Written artifact paths (present only for a successful `build`). */
  readonly artifacts?: GraphqlArtifacts;
}
