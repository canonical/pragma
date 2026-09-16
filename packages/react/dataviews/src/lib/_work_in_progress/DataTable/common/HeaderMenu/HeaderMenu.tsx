import type { DataViewsMessages } from "@canonical/dataviews-core";
import {
  ContextualMenu,
  Icon,
  type MenuEntry,
  type MenuItem,
} from "@canonical/react-ds-global";
import {
  memo,
  type ReactElement,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { MessagesContext } from "../../../../common/index.js";
import { composeMessage } from "../../../../utils/index.js";
import { useMenuPhase } from "../hooks/index.js";
import type { HeaderMenuProps } from "./types.js";

/**
 * The class of the design system's menu, which the button drawn before the
 * menu mounts wears too, so the header styles one trigger either way.
 */
const triggerCssClassName = "ds contextual-menu menu";

/**
 * The menu's items: the column's sort where it offers one, with remove
 * where it applies, then its visibility and its place, in the table's words.
 */
const listItems = (
  {
    sortable,
    removable,
    hideable,
    offers,
  }: Pick<HeaderMenuProps, "sortable" | "removable" | "hideable" | "offers">,
  messages: DataViewsMessages,
): MenuEntry[] => {
  const sort: MenuEntry[] = sortable
    ? [
        { key: "asc", label: messages.sortAscending },
        { key: "desc", label: messages.sortDescending },
        ...(removable
          ? [{ key: "remove", label: messages.removeFromSort }]
          : []),
        { type: "separator", key: "separator" },
      ]
    : [];
  const hide: MenuEntry[] = hideable
    ? [{ key: "hide", label: messages.hideColumn, disabled: !offers.hide }]
    : [];
  return [
    ...sort,
    ...hide,
    {
      key: "move-left",
      label: messages.moveColumnLeft,
      disabled: !offers["move-left"],
    },
    {
      key: "move-right",
      label: messages.moveColumnRight,
      disabled: !offers["move-right"],
    },
  ];
};

/**
 * One column's header menu: the design system's contextual menu, opened
 * from a button in the header and named for its column, carrying the
 * column's sort, its visibility and its place as the path that needs
 * neither a pointer's precision, a modifier key nor a drag.
 *
 * Sort ascending and Sort descending set the column's direction where it
 * already stands in the ordering, add it as a further term while the source
 * has room for one, and sort by it alone once the source has none left.
 * Remove from sort appears while the reader's ordering names the column.
 * The sort appears only where the column offers one. Hide column appears
 * where the column may be hidden, disabled while it is the last shown;
 * Move column left and Move column right step past the shown column beside
 * it, disabled at either end. Choosing an item closes the menu and returns
 * focus to its button — or, when the column is hidden and its button with
 * it, to the header now standing where it stood — and the table announces
 * what changed. Every word is the table's messages'.
 *
 * The menu itself mounts only while it is open: before and after, the
 * header holds only its button, drawn as the menu's own, so a wide table
 * pays for no menu's positioning or window listeners but the one in use,
 * however many columns a reader has sorted from. It is memoised, so a
 * render of the header row — every frame of a resize — renders no menu
 * again.
 *
 * Offered once scripts have taken over. Without them the header's own link
 * sorts by the column alone, the sort panel's links move and remove terms,
 * and the table's settings links hide and move columns; placing a column
 * beside the terms already stated needs scripts.
 */
function HeaderMenu({
  columnId,
  header,
  sortable,
  removable,
  hideable,
  offers,
  onPlace,
  onRemoveFromSort,
  onChangeColumn,
}: HeaderMenuProps): ReactElement {
  const messages = useContext(MessagesContext);
  const items = useMemo(
    () => listItems({ sortable, removable, hideable, offers }, messages),
    [sortable, removable, hideable, offers, messages],
  );
  const { phase, placeholder, menuRoot, openMenu, closeMenu } = useMenuPhase();
  // One identity while the column holds, so the menu's own context holds.
  const choose = useCallback(
    (item: MenuItem) => {
      switch (item.key) {
        case "remove":
          onRemoveFromSort(columnId);
          return;
        case "asc":
        case "desc":
          onPlace(columnId, item.key);
          return;
        case "hide":
        case "move-left":
        case "move-right":
          onChangeColumn(columnId, item.key);
          return;
      }
    },
    [columnId, onPlace, onRemoveFromSort, onChangeColumn],
  );
  const trigger = (
    <>
      <Icon icon="menu-contextual" />
      <span className="menu-label">
        {composeMessage((place) => messages.columnOptions(place(header)))}
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
