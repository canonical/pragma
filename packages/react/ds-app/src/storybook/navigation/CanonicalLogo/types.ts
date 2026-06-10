import type { HTMLAttributes } from "react";

/**
 * Props for the CanonicalLogo component.
 */
export interface CanonicalLogoProps extends HTMLAttributes<HTMLAnchorElement> {
  /** Destination for the home link. Defaults to "/". */
  href?: string;
}
