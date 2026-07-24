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
  // RESERVED: declared and exit-mapped (usage, exit 2) for forward-compat and
  // advertised in the covenant, but not yet raised by any site. Reserved for a
  // future ambiguous glob/lookup match (a name resolving to several entities);
  // until then no factory exists, so it cannot be raised by accident.
  "AMBIGUOUS_INPUT",
  "UNKNOWN_VERB",
  "STORE_UNAVAILABLE",
  "CONFIG_ERROR",
  "INTERNAL_ERROR",
  // A runtime condition that is NOT a bug and NOT a usage mistake, so it must
  // NOT collapse to INTERNAL_ERROR's "please report this issue": a capability
  // genuinely unavailable in this build/environment (`create package` /
  // `create application` in the compiled binary, whose generator assets are not
  // embedded — `create component` is embedded and runs), OR an external command
  // that RAN and failed for a fixable environment reason (a denied global
  // `npm i -g`, a network/registry failure — see `shared/assertExecOk`). Both
  // carry an actionable recovery and map to the generic runtime exit 1.
  "UNSUPPORTED",
] as const;

export { ERROR_CODES };
