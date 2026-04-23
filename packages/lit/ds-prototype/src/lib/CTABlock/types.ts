export interface LinkObject {
  /** HTML content for the link label (e.g. "Learn more &rsaquo;"). */
  content_html: string;
  /** HTML attributes for the anchor element. */
  attrs?: {
    href?: string;
    [key: string]: string | undefined;
  };
}

export interface CTABlockProps {
  /** Primary (constructive) action link. */
  primary?: LinkObject;
  /** Secondary action links. */
  secondaries?: LinkObject[];
  /** Plain text link action. */
  link?: LinkObject;
}
