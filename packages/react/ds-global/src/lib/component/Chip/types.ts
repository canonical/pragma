import type { ModifierFamily } from "@canonical/ds-types";
import type { ComponentProps, MouseEventHandler } from "react";

/**
 * The Chip's DS-owned props, shared by both of its possible roots.
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

  /** Called when the chip is dismissed. */
  onDismiss?: () => void;
}

/**
 * Interactive chip — rendered as a `<button>` when an `onClick` handler is
 * supplied, so it extends native `<button>` props.
 */
type InteractiveChipProps = ChipProps & {
  /** Called when the chip is clicked. Its presence makes the chip a button. */
  onClick: MouseEventHandler<HTMLButtonElement>;
} & Omit<ComponentProps<"button">, keyof ChipProps | "onClick" | "children">;

/**
 * Static chip — rendered as a `<span>` when no `onClick` is supplied, so it
 * extends native `<span>` props.
 */
type StaticChipProps = ChipProps & {
  /** A static chip has no click handler and renders a `<span>`. */
  onClick?: undefined;
} & Omit<ComponentProps<"span">, keyof ChipProps | "onClick" | "children">;

/**
 * Chip props: a discriminated union on `onClick` (issue #628 precedent). A chip
 * with an `onClick` renders a `<button>` and extends button props; one without
 * renders a `<span>` and extends span props. No polymorphic `as` generic.
 */
export type ChipPropsType = InteractiveChipProps | StaticChipProps;
