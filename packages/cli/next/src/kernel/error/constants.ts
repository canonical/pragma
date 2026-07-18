/**
 * The closed set of pragma error codes.
 *
 * Every {@link PragmaError} carries one of these; the CLI projector maps each
 * to a process exit code and the covenant freezes the exit-code table. Ported
 * from the v1 error kernel with two additions for the v2 exit model:
 * `STORE_UNAVAILABLE` (its own exit code, D2) and `UNKNOWN_VERB` (the usage
 * class the unknown-command suggester resolves to). A store failure is either
 * `STORE_UNAVAILABLE` (can't reach it) or a plain `INTERNAL_ERROR`, so no
 * distinct `STORE_ERROR` code is carried.
 */

/** All recognized pragma error codes as a const tuple. */
const ERROR_CODES = [
  "ENTITY_NOT_FOUND",
  "EMPTY_RESULTS",
  "INVALID_INPUT",
  "AMBIGUOUS_INPUT",
  "UNKNOWN_VERB",
  "STORE_UNAVAILABLE",
  "CONFIG_ERROR",
  "INTERNAL_ERROR",
  // A capability that is genuinely unavailable in this build/environment — not
  // a bug and not a usage mistake, so it must NOT collapse to INTERNAL_ERROR's
  // "please report this issue". Today: `create package` / `create application`
  // in the compiled binary, whose generator assets are not embedded there
  // (`create component` is embedded and runs). Maps to the generic runtime exit 1.
  "UNSUPPORTED",
] as const;

export { ERROR_CODES };
