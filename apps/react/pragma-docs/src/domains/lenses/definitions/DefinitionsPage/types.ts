export interface DefinitionsPageProps {
  /** Additional CSS class names. */
  className?: string;
  /** Route params: `/definitions` passes `{}`, `/definitions/:term` passes
   * `{ term }` with `term` percent-decoded by the router codec. */
  readonly params?: { readonly term?: string };
}
