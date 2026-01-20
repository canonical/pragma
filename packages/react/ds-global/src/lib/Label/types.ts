import type { ModifierFamily } from "@canonical/ds-types";
import type { HTMLAttributes, ReactNode } from "react";

/**
 * Props for the Label component
 *
 * @implements dso:global.component.label
 *
 * Anatomy (from DSL):
 * - layout.display: inline
 * - typography.size: font/size/label
 * - typography.weight: font/weight/medium
 *
 * Modifier families (from DSL):
 * - anticipation: constructive, caution, destructive
 * - importance: primary, secondary, tertiary
 * - criticality: success, error, warning, information
 */
export interface LabelProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * The label text content
   */
  children?: ReactNode;
  /**
   * Visual anticipation modifier - indicates expected outcome
   * - constructive: Positive outcome
   * - caution: Potentially risky
   * - destructive: Negative/irreversible outcome
   */
  anticipation?: ModifierFamily<"anticipation">;
  /**
   * Visual importance modifier - indicates hierarchy
   * - primary: High prominence
   * - secondary: Medium prominence
   * - tertiary: Low prominence
   */
  importance?: ModifierFamily<"importance">;
  /**
   * Visual criticality modifier - indicates status/severity
   * - success: Positive status
   * - error: Error status
   * - warning: Warning status
   * - information: Informational status
   */
  criticality?: ModifierFamily<"criticality">;
}
