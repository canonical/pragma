import type { ComponentProps, ReactNode } from "react";
import type { SECTION_SPACING } from "./constants.js";

export type SectionSpacing = (typeof SECTION_SPACING)[number];

type OwnProps = {
  /** Child elements */
  children: ReactNode;
  /**
    Spacing variant of the section
    FLAG: Unique, potentially inconsistent/unstable API
  */
  spacing?: SectionSpacing;
  /** Whether the section has a top border */
  bordered?: boolean;
};

/**
 * Props for the Section component, extending the native props of its
 * `<section>` root.
 */
export type SectionProps = OwnProps &
  Omit<ComponentProps<"section">, keyof OwnProps>;
