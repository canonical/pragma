import type { HTMLAttributes, ReactNode } from "react";
import type {
  MenuEntry,
  MenuItem,
  UseContextualMenuProps,
  WindowFitmentPlacement,
  WindowFitmentSide,
} from "../../hooks/index.js";

export type { MenuEntry, MenuItem, MenuSeparator } from "../../hooks/index.js";

export interface ContextualMenuProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect">,
    Pick<
      UseContextualMenuProps,
      "distance" | "gutter" | "maxWidth" | "autoFit"
    > {
  /**
   * Whether arrow keys wrap at the first/last item. Defaults to true (the
   * APG menu convention), unlike the underlying hook.
   */
  wrap?: boolean;
  /**
   * The trigger content, rendered inside the trigger button. Clicking it opens
   * the menu.
   */
  trigger: ReactNode;
  /**
   * The menu entries: one flat list of items and separators
   * (`{ type: "separator" }`). An item's own `items` form its submenu, which
   * may itself contain separators.
   */
  items: MenuEntry[];
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
