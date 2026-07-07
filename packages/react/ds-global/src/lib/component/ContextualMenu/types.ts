import type { HTMLAttributes, ReactNode } from "react";
import type {
  MenuItem,
  UseContextualMenuProps,
  WindowFitmentPlacement,
  WindowFitmentSide,
} from "#lib/hooks/index.js";

export type { MenuItem } from "#lib/hooks/index.js";

export interface ContextualMenuProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect">,
    Pick<
      UseContextualMenuProps,
      "distance" | "gutter" | "maxWidth" | "autoFit" | "wrap"
    > {
  /**
   * The trigger content, rendered inside the trigger button. Clicking it opens
   * the menu.
   */
  trigger: ReactNode;
  /**
   * The menu groups. Each top-level item is a group; its `items` are the menu
   * entries. One level is supported now; deeper nesting is reserved for submenus.
   */
  groups: MenuItem[];
  /** Accessible name for the menu. Falls back to labelling by the trigger. */
  label?: string;
  /**
   * Preferred placement of the menu relative to its trigger. Each entry is a
   * bare logical side (centred) or a `{ side, align }` pair; `inline-*` mirrors
   * in RTL. Defaults to the leading-edge, top-aligned placement (with flips).
   */
  preferredDirections?: (WindowFitmentSide | WindowFitmentPlacement)[];
  /** Called with an item's key/url when it is activated. */
  onSelect?: (item: MenuItem) => void;
  /** Controlled open state. */
  open?: boolean;
  /** Called when the open state changes. */
  onOpenChange?: (open: boolean) => void;
}
