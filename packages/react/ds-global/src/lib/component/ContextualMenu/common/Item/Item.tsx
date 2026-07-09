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

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!disabled) onSelect();
    }
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
      onClick={disabled ? undefined : onSelect}
      onKeyDown={handleKeyDown}
    >
      {content}
    </div>
  );
};

export default Item;
