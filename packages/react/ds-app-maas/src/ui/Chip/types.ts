/* @canonical/generator-canonical-ds 0.4.0-experimental.0 */
import type React from "react";

/**
 * Props for the `Chip` component.
 */
export interface ChipProps {
  /**
   * The chip’s appearance.
   * @default "neutral"
   */
  appearance?: "neutral" | "positive" | "negative" | "caution" | "information";

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
