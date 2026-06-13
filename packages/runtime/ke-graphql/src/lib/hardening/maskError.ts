// =============================================================================
// Production error masking. An unexpected throw inside a resolver (a store
// error, a bug) bubbles up wrapped in a GraphQLError whose `originalError` is
// the underlying Error — and its message can leak SPARQL fragments or store
// internals to the client. In production those messages are replaced with a
// generic one, while deliberate client-facing GraphQLErrors (validation, our
// own throws — which carry no non-GraphQL originalError) pass through.
// =============================================================================

import { GraphQLError, type GraphQLFormattedError } from "graphql";

/**
 * Format a GraphQL execution error, masking internal/unexpected errors when
 * `mask` is set. An error is "internal" when it wraps a non-GraphQLError
 * `originalError` (a thrown runtime error): its message becomes generic
 * (locations/path retained, `extensions.code = "INTERNAL_SERVER_ERROR"`).
 * Deliberate GraphQLErrors pass through unchanged via `toJSON()`.
 */
export default function maskError(
  error: GraphQLError,
  mask: boolean,
): GraphQLFormattedError {
  if (
    mask &&
    error.originalError &&
    !(error.originalError instanceof GraphQLError)
  ) {
    return {
      message: "Internal server error",
      ...(error.locations ? { locations: error.locations } : {}),
      ...(error.path ? { path: error.path } : {}),
      extensions: { code: "INTERNAL_SERVER_ERROR" },
    };
  }
  return error.toJSON();
}
