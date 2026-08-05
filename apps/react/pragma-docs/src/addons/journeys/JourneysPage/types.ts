export interface JourneysPageProps {
  /** Additional CSS class names. */
  className?: string;
  /** Route params: `/journeys` passes `{}`, `/journeys/:job` passes
   * `{ job }` with `job` percent-decoded by the router codec. */
  readonly params?: { readonly job?: string };
}
