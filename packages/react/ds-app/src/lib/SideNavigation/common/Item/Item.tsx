import type React from "react";
import type { ItemProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation-item";

/**
 * SideNavigation.Item — the default renderer for a single WD405 navigation item.
 *
 * Presentational: it takes the item fields spread directly (url, key, label,
 * disabled, …) plus `active`, `depth`, and `LinkComponent`. An item with a `url`
 * renders as a link via `LinkComponent` (default `"a"`); otherwise a label. Any
 * nested list is passed in as `children` (the tree walk lives in NavTree), so a
 * custom `Component` can replace this renderer without owning traversal.
 *
 * @implements ds:apps.subcomponent.side-navigation-item
 */
const Item = ({
  url,
  label,
  disabled = false,
  active = false,
  depth = 0,
  LinkComponent = "a",
  children,
  // WD405 Item fields not spread to the DOM.
  key: _key,
  items: _items,
  displayItemsType: _displayItemsType,
  Component: _Component,
  className,
  ...props
}: ItemProps): React.ReactElement => {
  const Link = LinkComponent;
  return (
    <li
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-depth={depth}
      data-disabled={disabled || undefined}
      data-active={active || undefined}
      {...props}
    >
      {url ? (
        <Link
          className="row"
          href={disabled ? undefined : url}
          aria-current={active ? "page" : undefined}
        >
          {label}
        </Link>
      ) : (
        <span className="row" aria-current={active ? "page" : undefined}>
          {label}
        </span>
      )}
      {children}
    </li>
  );
};

export default Item;
