import type { HTMLAttributes, ReactNode } from "react";
import type {
  UseDisclosureProps,
  WindowFitmentSide,
} from "../../hooks/index.js";

export interface PopoverProps
  extends Omit<HTMLAttributes<HTMLDetailsElement>, "onToggle">,
    Pick<
      UseDisclosureProps,
      | "preferredDirections"
      | "distance"
      | "gutter"
      | "maxWidth"
      | "autoFit"
      | "closeOnEscape"
      | "closeOnOutsideClick"
    > {
  /**
   * The trigger content, rendered inside the `<summary>`. Clicking it toggles
   * the popover; with no JavaScript the native `<details>` handles the toggle.
   */
  trigger: ReactNode;
  /** The popover body, revealed when open. */
  children: ReactNode;
  /**
   * Controlled open state. When omitted, the popover is uncontrolled and the
   * native `<details>` element owns its state until hydration.
   */
  open?: boolean;
  /** Called when the open state changes. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Preferred placement of the popover relative to its trigger, as logical sides
   * (`inline-*` mirrors in RTL). Defaults to the reading-direction order.
   */
  preferredDirections?: WindowFitmentSide[];
}
