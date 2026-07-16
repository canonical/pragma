import type React from "react";
import { Icon } from "../../../Icon/index.js";
import type { ItemProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds contextual-menu-item";

/**
 * A single contextual-menu entry. By default it renders an optional leading
 * icon, the label, and an optional right-aligned slot (badge or shortcut). When
 * the item opts into a custom renderer (`displayItemsType: "custom"` with a
 * `Component`), that component owns the item's content instead.
 *
 * @implements dso:global.subcomponent.contextual-menu-item
 */
const Item = ({ item, itemProps, onSelect }: ItemProps): React.ReactElement => {
  const {
    label,
    disabled,
    slot,
    icon,
    className,
    displayItemsType,
    Component,
    items,
  } = item;

  // An item with children is a submenu trigger; it shows a trailing caret.
  const hasSubmenu = !!items?.length;

  // A submenu parent is NOT selectable — activating it opens its submenu
  // (handled by the navigation hook's ArrowRight/click), it does not fire
  // `onSelect` like a leaf. Only enabled leaves select.
  const isSelectable = !disabled && !hasSubmenu;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      // Stop the Space/Enter from also reaching the menu container's key handler
      // (where a bare Space would otherwise start a typeahead search).
      event.stopPropagation();
      // Always suppress the browser default — on a focusable div a bare Space
      // scrolls the page, so a "no-op" on a disabled item or submenu parent
      // would not actually be a no-op. Only a selectable leaf activates.
      event.preventDefault();
      if (isSelectable) {
        onSelect();
      }
    }
  };

  // Selecting a LEAF fires `onSelect` in addition to the navigation state update
  // already wired by `itemProps.onClick` (which highlights the item / opens a
  // submenu on hover). A submenu parent is not choosable, so it only runs the
  // navigation handler — clicking/hovering it highlights it and shows its
  // submenu, but it never fires `onSelect`. `itemProps` is loosely typed
  // (`Record<string, unknown>`), so narrow its click handler before calling.
  const navOnClick = itemProps?.onClick as
    | ((event: React.MouseEvent) => void)
    | undefined;
  const handleClick = (event: React.MouseEvent) => {
    navOnClick?.(event);
    if (isSelectable) onSelect();
  };

  const content =
    displayItemsType === "custom" && Component ? (
      <Component item={item} />
    ) : (
      <>
        {/* Icon always precedes the text (Figma). */}
        {icon ? <span className="icon">{icon}</span> : null}
        <span className="label">{label}</span>
        {slot ? <span className="slot">{slot}</span> : null}
        {/* Submenu items show a trailing caret (Canonical chevron-right icon; a
            plain slot and a submenu caret are mutually exclusive in the Figma
            spec). It is mirrored to point left in RTL via CSS. */}
        {hasSubmenu ? (
          <span className="caret" aria-hidden="true">
            <Icon icon="chevron-right" />
          </span>
        ) : null}
      </>
    );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the div carries role="menuitem" (from itemProps) with roving tabindex, the correct WAI-ARIA menu pattern (a <button> cannot be a menuitem)
    <div
      className={[componentCssClassName, disabled && "disabled", className]
        .filter(Boolean)
        .join(" ")}
      {...itemProps}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {content}
    </div>
  );
};

export default Item;
