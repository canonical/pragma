import type { _Item } from "@canonical/ds-types";
import type { MenuItem } from "../../types.js";

/**
 * Internal renderer props — exempt from the native-prop extension convention.
 * This is not a public component and has no single native root the consumer
 * styles: it receives a ready-made ARIA/roving prop bag (`itemProps`) from the
 * menu hook and spreads that onto its element instead of extending a tag's
 * native props.
 */
export interface ItemProps {
  /** The annotated menu item to render. */
  item: _Item<MenuItem>;
  /** ARIA + roving props for the item element, from the menu hook. */
  itemProps: Record<string, unknown>;
  /** Called when the item is activated (click or Enter/Space). */
  onSelect: () => void;
}
