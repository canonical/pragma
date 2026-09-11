import { Icon } from "@canonical/react-ds-global";
import type React from "react";
import type { ItemProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation-item";

/**
 * SideNavigation.Item — the default renderer for a single navigation item.
 *
 * A flat leaf row, NOT recursive — an entry with children is a
 * SideNavigation.ItemExpandable instead (the 24.04 spec §4.3). The row is
 * `[icon] [content] [end]` over a shared grid template (so the icon aligns
 * with the header logo). An item with a `url` renders as a link via
 * `LinkComponent` (default `"a"`); otherwise a non-navigable label. The end
 * slot is the optional `slot` (a badge, count, …), or nothing. Content is
 * composed via `children`, matching `Button`'s own convention — pass
 * anything, not only text.
 *
 * @implements ds:apps.subcomponent.side-navigation-item
 */
const Item = ({
  url,
  children,
  icon,
  slot,
  disabled = false,
  active = false,
  LinkComponent = "a",
  className,
  ...props
}: ItemProps): React.ReactElement => {
  const Link = LinkComponent;

  const content = (
    <>
      {/* Start cell is always rendered (empty when no icon) so content
          stays in the middle column — labels align with or without icons. */}
      <span className="start">
        {icon ? <Icon width={16} height={16} icon={icon} /> : null}
      </span>
      {/* `title` — native-tooltip fallback for the spec's truncated-label
          tooltip (the 24.04 spec §7), not the custom 800ms-delay one
          (the 24.04 spec §10.17). Only meaningful when `children` is
          plain text. */}
      <span
        className="label"
        title={typeof children === "string" ? children : undefined}
      >
        {children}
      </span>
      {slot ? <span className="end slot">{slot}</span> : null}
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
