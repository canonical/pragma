import type { ModifierFamily } from "@canonical/ds-types";
import type React from "react";

/**
 * Props for the `Chip` component.
 */
export interface ChipProps {
  /**
   * Criticality modifier for status indication.
   * - "success": Positive status
   * - "error": Negative status
   * - "warning": Cautionary status
   * - "information": Informative status
   */
  criticality?: ModifierFamily<"criticality">;

  /**
   * Release stage modifier.
   * - "experimental": Early exploration
   * - "alpha": Functionally incomplete
   * - "beta": Feature-complete, not hardened
   * - "stable": Production-ready
   */
  release?: ModifierFamily<"release">;

  /** Text shown before the value. */
  lead?: string;

  /** The chip’s value text. */
  value?: string;

  /** Called when the chip is clicked. */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;

  /** Called when the chip is dismissed. */
  onDismiss?: () => void;

  /** Unique identifier for the chip. */
  id?: string;

  /** Additional CSS class names. */
  className?: string;

  /** Inline styles for the chip. */
  style?: React.CSSProperties;
}

export type ChipPropsType = ChipProps &
  Omit<React.HTMLAttributes<HTMLButtonElement>, "children">;
