/**
 * Public types for the contract check.
 *
 * Type-only: no runtime code lives here, which is why the coverage config
 * excludes this file.
 */

/**
 * Every code a {@link ContractViolation} can carry.
 *
 * The first sixteen are graphql-js's `BreakingChangeType` members, spelled out
 * locally rather than imported. The member set is identical in both graphql
 * majors this package supports, but the two declare it differently — v16 as a
 * `declare enum`, v17 as a const-object union — so importing it would make the
 * emitted `.d.ts` vary with the consumer's installed major, which is exactly
 * the version-independence this package exists to preserve. Owning it also
 * gives a consumer completion and exhaustiveness on `code`, which a bare
 * `string` cannot. `contractViolationCodes.test.ts` pins the union against
 * graphql's own set, so a drift is a failure rather than a silent divergence.
 *
 * The last three are this package's own: see `constants.ts`.
 */
export type ContractViolationCode =
  | "TYPE_REMOVED"
  | "TYPE_CHANGED_KIND"
  | "TYPE_REMOVED_FROM_UNION"
  | "VALUE_REMOVED_FROM_ENUM"
  | "REQUIRED_INPUT_FIELD_ADDED"
  | "IMPLEMENTED_INTERFACE_REMOVED"
  | "FIELD_REMOVED"
  | "FIELD_CHANGED_KIND"
  | "REQUIRED_ARG_ADDED"
  | "ARG_REMOVED"
  | "ARG_CHANGED_KIND"
  | "DIRECTIVE_REMOVED"
  | "DIRECTIVE_ARG_REMOVED"
  | "REQUIRED_DIRECTIVE_ARG_ADDED"
  | "DIRECTIVE_REPEATABLE_REMOVED"
  | "DIRECTIVE_LOCATION_REMOVED"
  | "INVALID_SDL"
  | "INVALID_SCHEMA"
  | "ROOT_TYPE_MISMATCH";

/** One way in which a provider's schema fails to subsume the contract. */
export interface ContractViolation {
  readonly code: ContractViolationCode;
  readonly message: string;
}

/** The outcome of checking one provider's SDL against the contract. */
export interface ContractResult {
  readonly satisfied: boolean;
  readonly violations: readonly ContractViolation[];
}

/** Options for {@link satisfiesContract}. */
export interface SatisfiesContractOptions {
  /**
   * Contract SDL to check against. Defaults to this package's shipped
   * schema/contract SDL file. A malformed value here THROWS — the contract is
   * ours, so a broken one is a programmer error, not a provider failure.
   */
  readonly contractSdl?: string;
}

/**
 * Options for {@link assertSatisfiesContract}.
 *
 * Separate from {@link SatisfiesContractOptions} because `providerName` only
 * has anywhere to go in a thrown message: a shared type would let
 * `satisfiesContract(sdl, { providerName })` type-check and silently do
 * nothing.
 */
export interface AssertSatisfiesContractOptions
  extends SatisfiesContractOptions {
  /** Name used in thrown-error text. Defaults to `"provider"`. */
  readonly providerName?: string;
}
