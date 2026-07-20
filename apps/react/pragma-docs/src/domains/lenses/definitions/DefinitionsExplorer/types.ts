export interface DefinitionsExplorerProps {
  /** Additional CSS class names. */
  className?: string;
  /** The selected term (prefixed URI, percent-decoded by the router), or
   * undefined on `/definitions` (the no-default-term explorer). */
  readonly term: string | undefined;
}
