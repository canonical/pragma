/**
 * Shared types for sample operations across domains.
 *
 * Sample returns 1–5 complete instances as exemplars so agents
 * can learn actual data shapes before writing queries.
 */

/** Raw result from a sample operation — instances plus total count. */
export interface SampleResult<T> {
  readonly samples: readonly T[];
  readonly totalCount: number;
}

/** Full sample output including agent guidance. */
export interface SampleOutput<T> extends SampleResult<T> {
  readonly nextSteps: readonly string[];
}
