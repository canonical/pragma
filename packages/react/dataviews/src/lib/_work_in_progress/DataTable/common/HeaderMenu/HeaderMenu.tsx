import {
  ContextualMenu,
  Icon,
  type MenuEntry,
  type MenuItem,
} from "@canonical/react-ds-global";
import { memo, type ReactElement, useCallback, useMemo } from "react";
import { useMenuPhase } from "../hooks/index.js";
import type { HeaderMenuProps } from "./types.js";

/**
 * The class of the design system's menu, which the button drawn before the
 * menu mounts wears too, so the header styles one trigger either way.
 */
const triggerCssClassName = "ds contextual-menu menu";

/** The words the menu shows, collected so they can be localised in one place. */
const MESSAGES = {
  ascending: "Sort ascending",
  descending: "Sort descending",
  removeFromSort: "Remove from sort",
  triggerFor: "Sort options for",
} as const;

/** The items every sortable column offers, with remove where it applies. */
const listItems = (removable: boolean): MenuEntry[] => [
  { key: "asc", label: MESSAGES.ascending },
  { key: "desc", label: MESSAGES.descending },
  ...(removable ? [{ key: "remove", label: MESSAGES.removeFromSort }] : []),
];

/**
 * One sortable column's header menu: the design system's contextual menu,
 * opened from a button in the header and named for its column, carrying
 * the column's sort as the path that needs neither a pointer's precision
 * nor a modifier key.
 *
 * Sort ascending and Sort descending set the column's direction where it
 * already stands in the ordering, add it as a further term while the source
 * has room for one, and sort by it alone once the source has none left.
 * Remove from sort appears while the reader's ordering names the column.
 * Choosing an item closes the menu and returns focus to its button.
 *
 * The menu itself mounts only while it is open: before and after, the
 * header holds only its button, drawn as the menu's own, so a wide table
 * pays for no menu's positioning or window listeners but the one in use,
 * however many columns a reader has sorted from. It is memoised, so a
 * render of the header row — every frame of a resize — renders no menu
 * again.
 *
 * Offered once scripts have taken over. Without them the header's own link
 * sorts by the column alone and the sort panel's links move and remove
 * terms; placing a column beside the terms already stated needs scripts.
 */
function HeaderMenu({
  columnId,
  header,
  removable,
  onPlace,
  onRemoveFromSort,
}: HeaderMenuProps): ReactElement {
  const items = useMemo(() => listItems(removable), [removable]);
  const { phase, placeholder, menuRoot, openMenu, closeMenu } = useMenuPhase();
  // One identity while the column holds, so the menu's own context holds.
  const choose = useCallback(
    (item: MenuItem) => {
      if (item.key === "remove") {
        onRemoveFromSort(columnId);
      } else {
        onPlace(columnId, item.key === "desc" ? "desc" : "asc");
      }
    },
    [columnId, onPlace, onRemoveFromSort],
  );
  const trigger = (
    <>
      <Icon icon="menu-contextual" />
      <span className="menu-label">
        {MESSAGES.triggerFor} {header}
      </span>
    </>
  );
  if (phase === "closed") {
    return (
      <div className={triggerCssClassName}>
        <button
          ref={placeholder}
          type="button"
          className="trigger"
          aria-haspopup="menu"
          aria-expanded={false}
          onClick={(event) => {
            // The menu opens as soon as it has mounted, and moves focus to
            // its first item, as it does on every later open.
            openMenu(event.currentTarget);
          }}
        >
          {trigger}
        </button>
      </div>
    );
  }
  return (
    <ContextualMenu
      ref={menuRoot}
      className="menu"
      trigger={trigger}
      items={items}
      open={phase === "open"}
      onOpenChange={closeMenu}
      onSelect={choose}
    />
  );
}

export default memo(HeaderMenu);
