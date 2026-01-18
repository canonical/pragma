/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { HTMLAttributes, ReactNode } from "react";
import type { SECTION_SPACING } from "./constants.js";

export type SectionSpacing = (typeof SECTION_SPACING)[number];

/**
    We have used the `HTMLDivElement` as a default props base.
    If your component is based on a different HTML element, please update it accordingly.
    See https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API for a full list of HTML elements interfaces.
*/
export interface SectionProps extends HTMLAttributes<HTMLDivElement> {
  /** Additional CSS classes */
  className?: string;
  /** Child elements */
  children: ReactNode;
  /**
    Spacing variant of the section
    FLAG: Unique, potentially inconsistent/unstable API
  */
  spacing?: SectionSpacing;
  /** Whether the section has a top border */
  bordered?: boolean;
}
