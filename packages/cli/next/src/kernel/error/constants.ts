/**
 * The closed set of pragma error codes.
 *
 * Every {@link PragmaError} carries one of these; the CLI projector maps each
 * to a process exit code and the covenant freezes the exit-code table. Ported
 * from the v1 error kernel with two additions for the v2 exit model:
 * `STORE_UNAVAILABLE` (its own exit code, D2) and `UNKNOWN_VERB` (the usage
 * class the unknown-command suggester resolves to).
 */

/** All recognized pragma error codes as a const tuple. */
const ERROR_CODES = [
  "ENTITY_NOT_FOUND",
  "EMPTY_RESULTS",
  "INVALID_INPUT",
  "AMBIGUOUS_INPUT",
  "UNKNOWN_VERB",
  "STORE_ERROR",
  "STORE_UNAVAILABLE",
  "CONFIG_ERROR",
  "INTERNAL_ERROR",
] as const;

export { ERROR_CODES };
