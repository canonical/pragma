// =============================================================================
// Public types for the contract check. Type-only: no runtime code lives here,
// which is why the coverage config excludes this file.
// =============================================================================

/**
 * One way in which a provider's schema fails to subsume the contract.
 *
 * `code` is a graphql-js `BreakingChangeType` member (`FIELD_REMOVED`,
 * `FIELD_CHANGED_KIND`, `ARG_REMOVED`, `TYPE_REMOVED`, ...), or the synthetic
 * `INVALID_SDL` when the provider's SDL could not be parsed at all.
 */
export interface ContractViolation {
  readonly code: string;
  readonly message: string;
}

/** The outcome of checking one provider's SDL against the contract. */
export interface ContractResult {
  readonly satisfied: boolean;
  readonly violations: readonly ContractViolation[];
}

/** Options for {@link satisfiesContract} and {@link assertSatisfiesContract}. */
export interface SatisfiesContractOptions {
  /**
   * Contract SDL to check against. Defaults to this package's shipped
   * schema/contract SDL file. A malformed value here THROWS — the contract is
   * ours, so a broken one is a programmer error, not a provider failure.
   */
  readonly contractSdl?: string;
  /** Name used in thrown-error text. Defaults to `"provider"`. */
  readonly providerName?: string;
}
