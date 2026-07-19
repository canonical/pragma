export interface ComponentEntityPageProps {
  /** Additional CSS class names. */
  className?: string;
  /** Route params from `/components/:uri` — `uri` is percent-decoded. */
  readonly params: { readonly uri: string };
}
