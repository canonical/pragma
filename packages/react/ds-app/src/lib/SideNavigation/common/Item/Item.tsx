import { Icon } from "@canonical/react-ds-global";
import type React from "react";
import type { ItemProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation-item";

/**
 * SideNavigation.Item — the default renderer for a single navigation item.
 *
 * A flat leaf row, NOT recursive: traversal lives in NavTree's two loops. The
 * row is `[icon] [label] [end]` over a shared grid template (so the icon aligns
 * with the header logo). An item with a `url` renders as a link via
 * `LinkComponent` (default `"a"`); otherwise a non-navigable label.
 *
 * End slot is derived, not authored:
 * - has subitems → a disclosure caret (static affordance in PR1; expand/collapse
 *   behaviour is deferred);
 * - leaf → the optional `slot` (a badge, count, …), or nothing.
 *
 * @implements ds:apps.subcomponent.side-navigation-item
 */
const Item = ({
  url,
  label,
  icon,
  slot,
  disabled = false,
  active = false,
  LinkComponent = "a",
  // NavItem fields not spread to the DOM.
  key: _key,
  items,
  displayItemsType: _displayItemsType,
  Component: _Component,
  className,
  ...props
}: ItemProps): React.ReactElement => {
  const Link = LinkComponent;
  const hasSubitems = (items?.length ?? 0) > 0;

  const content = (
    <>
      {/* Start cell is always rendered (empty when no icon) so the label stays
          in the middle column — labels align whether or not a row has an icon. */}
      <span className="start">{icon ? <Icon icon={icon} /> : null}</span>
      <span className="label p">{label}</span>
      {/* End slot: caret for groups (static in PR1), else the leaf slot. */}
      {hasSubitems ? (
        <Icon icon="chevron-down" className="end caret" />
      ) : slot ? (
        <span className="end slot">{slot}</span>
      ) : null}
    </>
  );

  return (
    <li
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
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
          {content}
        </Link>
      ) : (
        <span className="row" aria-current={active ? "page" : undefined}>
          {content}
        </span>
      )}
    </li>
  );
};

export default Item;
