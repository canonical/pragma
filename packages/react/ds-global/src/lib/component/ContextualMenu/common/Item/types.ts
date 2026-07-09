import type { _Item } from "@canonical/ds-types";
import type { MenuItem } from "../../types.js";

export interface ItemProps {
  /** The annotated menu item to render. */
  item: _Item<MenuItem>;
  /** ARIA + roving props for the item element, from the menu hook. */
  itemProps: Record<string, unknown>;
  /** Called when the item is activated (click or Enter/Space). */
  onSelect: () => void;
}
