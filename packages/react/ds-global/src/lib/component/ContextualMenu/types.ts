import type { ComponentProps, ReactNode } from "react";
import type {
  MenuEntry,
  MenuItem,
  UseContextualMenuProps,
  WindowFitmentPlacement,
  WindowFitmentSide,
} from "../../hooks/index.js";

export type { MenuEntry, MenuItem, MenuSeparator } from "../../hooks/index.js";

type OwnProps = Pick<
  UseContextualMenuProps,
  "distance" | "gutter" | "maxWidth" | "autoFit"
> & {
  /**
   * Whether arrow keys wrap at the first/last item. Defaults to true (the
   * APG menu convention), unlike the underlying hook. Declared here rather
   * than picked from the hook so the differing default is documented where a
   * consumer reads it.
   */
  wrap?: boolean;
  /**
   * The trigger content, rendered inside the trigger button. Clicking it opens
   * the menu.
   */
  trigger: ReactNode;
  /**
   * The menu entries: one flat list of items and separators
   * (`{ type: "separator", key: "…" }`). An item's own `items` form its submenu, which
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
  /**
   * Class name applied to the menu's own popup surface. The surface is
   * portaled to `document.body` (so it escapes any `overflow`/`z-index`
   * ancestor stacking context), which means it is never a DOM descendant of
   * this component's own root — `className` on the root has no way to reach
   * it, by design (custom-property inheritance follows the rendered DOM
   * tree, not the React tree, and a portal breaks that ancestry). This is
   * the one hook a consumer needing to theme the surface itself (rather
   * than just the trigger) has.
   */
  surfaceClassName?: string;
};

export type ContextualMenuProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
