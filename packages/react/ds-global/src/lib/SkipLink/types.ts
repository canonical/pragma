import type { HTMLAttributes, ReactNode } from "react";

/**
    We have used the `HTMLDivElement` as a default props base.
    If your component is based on a different HTML element, please update it accordingly.
    See https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API for a full list of HTML elements interfaces.
*/
export interface SkipLinkProps
  extends Omit<HTMLAttributes<HTMLAnchorElement>, "href" | "tabIndex"> {
  /** The contents of the skip link itself */
  children?: ReactNode;
  /**
   * ID of the main content element
   * @default "main"
   * */
  mainId?: string;
}
