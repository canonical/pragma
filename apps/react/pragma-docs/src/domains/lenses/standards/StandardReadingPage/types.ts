export interface StandardReadingPageProps {
  /** Additional CSS class names. */
  className?: string;
  /** Route params from `/standards/:uri` — `uri` is percent-decoded. */
  readonly params: { readonly uri: string };
}
