import type { HTMLAttributes, ReactNode } from "react";

/**
 * Criticality modifier values
 * Maps to DSL modifierFamily: criticality
 */
export type Criticality = "info" | "success" | "warning" | "critical";

/**
 * Props for the Label component
 *
 * @implements dso:global.component.label
 *
 * Anatomy (from DSL):
 * - layout.display: inline
 * - typography.size: font/size/label
 * - typography.weight: font/weight/medium
 */
export interface LabelProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * The label text content
   */
  children: ReactNode;
  /**
   * Visual criticality modifier
   * Maps to DSL hasModifierFamily: criticality
   */
  criticality?: Criticality;
}
