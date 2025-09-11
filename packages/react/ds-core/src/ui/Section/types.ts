/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { ModifierFamily } from "@canonical/ds-types";
import type { HTMLAttributes, ReactNode } from "react";

/**
    We have used the `HTMLDivElement` as a default props base.
    If your component is based on a different HTML element, please update it accordingly.
    See https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API for a full list of HTML elements interfaces.
*/
export interface SectionProps extends HTMLAttributes<HTMLDivElement> {
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children: ReactNode;
  /* Visual prominence of the section */
  prominence?: ModifierFamily<"prominence">;
}
