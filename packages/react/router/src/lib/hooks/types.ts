/**
 * Types for the router-react hook domain.
 *
 * Each hook that accepts structured options or returns a structured value has
 * its props/result type defined here, keeping the hook implementations focused
 * on behaviour.
 */

/** Mapping of selected search-param keys to their current values. */
export type SearchParamValues<TKeys extends readonly string[]> = Readonly<{
  [TKey in TKeys[number]]: string | null;
}>;

/** Options for `useRouterState()` power-user subscriptions. */
export interface UseRouterStateOptions<TSelected> {
  /**
   * Optional equality function used to preserve the previous selected value
   * when the next selection is semantically unchanged.
   */
  readonly isEqual?: (previous: TSelected, next: TSelected) => boolean;
}
