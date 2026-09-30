import type { _Item } from "@canonical/ds-types";
import type { MenuEntry, MenuSeparator } from "./types.js";

/**
 * Narrow a menu entry (raw or annotated) to a separator via its `type`
 * discriminant. In the false branch the entry narrows to a `MenuItem`, so
 * render code can branch between a divider and an interactive item.
 *
 * @param entry The menu entry to test.
 * @returns Whether the entry is a separator.
 */
const isMenuSeparator = (
  entry: MenuEntry | _Item<MenuEntry>,
): entry is MenuSeparator | _Item<MenuSeparator> =>
  "type" in entry && entry.type === "separator";

export default isMenuSeparator;
