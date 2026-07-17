import type { ComponentProps, ReactNode } from "react";
import type {
  UseDisclosureProps,
  WindowFitmentSide,
} from "../../hooks/index.js";

type OwnProps = Pick<
  UseDisclosureProps,
  | "distance"
  | "gutter"
  | "maxWidth"
  | "autoFit"
  | "closeOnEscape"
  | "closeOnOutsideClick"
> & {
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
};

/**
 * Props for the Popover component. Extends its native `<details>` root, with
 * `onToggle` deliberately excluded: once hydrated the disclosure hook owns the
 * toggle, so consumers drive open state via `open`/`onOpenChange`.
 */
export type PopoverProps = OwnProps &
  Omit<ComponentProps<"details">, keyof OwnProps | "onToggle">;
