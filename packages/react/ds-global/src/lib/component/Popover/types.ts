import type { ComponentProps, ReactNode, RefObject } from "react";
import type {
  UseDisclosureProps,
  WindowFitmentPlacement,
  WindowFitmentSide,
} from "../../hooks/index.js";
import type ButtonProps from "../Button/types.js";

type OwnProps = Pick<
  UseDisclosureProps,
  | "distance"
  | "gutter"
  | "maxWidth"
  | "autoFit"
  | "closeOnEscape"
  | "closeOnOutsideClick"
> & {
  /** Interactive dialog content. */
  children: ReactNode;
  /** Class for the root, or the dialog when externally anchored. */
  className?: string;
  /** Accessible name placed on the dialog itself. */
  label?: string;
  /** Focus target when opened. Defaults to the first enabled control. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Dialog attributes, including application-owned data attributes. */
  dialogProps?: Omit<
    ComponentProps<"div">,
    "children" | "role" | "aria-modal" | "aria-hidden" | "ref"
  > & { [key: `data-${string}`]: string | number | undefined };
  /** Controlled open state. Uncontrolled by default. */
  open?: boolean;
  /** Called when the open state changes. */
  onOpenChange?: (open: boolean) => void;
  /** Ordered logical sides for the anchored surface. */
  preferredDirections?: (WindowFitmentSide | WindowFitmentPlacement)[];
};

/** Native, no-JavaScript baseline using details/summary. */
type DetailsPopoverProps = OwnProps & {
  trigger: ReactNode;
  triggerProps?: never;
  anchorRef?: never;
} & Omit<ComponentProps<"details">, keyof OwnProps | "onToggle" | "children">;

/** Styled Pragma Button trigger. This variant requires JavaScript. */
type ButtonPopoverProps = OwnProps & {
  trigger: ReactNode;
  triggerProps: Omit<ButtonProps, "children">;
  anchorRef?: never;
} & Omit<ComponentProps<"div">, keyof OwnProps | "children">;

/** External launcher, such as a menu item, owns open state and ARIA wiring. */
type AnchoredPopoverProps = OwnProps & {
  anchorRef: RefObject<HTMLElement | null>;
  trigger?: never;
  triggerProps?: never;
  label: string;
  /** External launchers own the state because Popover renders no trigger. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export type PopoverProps =
  | DetailsPopoverProps
  | ButtonPopoverProps
  | AnchoredPopoverProps;
