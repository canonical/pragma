import { Icon } from "@canonical/react-ds-global";
import type React from "react";
import type { ItemProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation-item";

/**
 * SideNavigation.Item — the default renderer for a single navigation item.
 *
 * A flat leaf row, NOT recursive — an entry with children is a
 * SideNavigation.ItemExpandable instead (SPEC.md §4.3). The row is
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
  // LeafNavItem's own identity field — not spread to the DOM.
  key: _key,
  className,
  ...props
}: ItemProps): React.ReactElement => {
  const Link = LinkComponent;

  const content = (
    <>
      {/* Start cell is always rendered (empty when no icon) so the content
          stays in the middle column — labels align whether or not a row has
          an icon. */}
      <span className="start p">
        {icon ? <Icon width={16} height={16} icon={icon} /> : null}
      </span>
      {/* `title` is a progressive-enhancement fallback for the spec's
         truncated-label tooltip (§7): the browser's own native tooltip, not
         the custom 800ms-delay styled one — SPEC.md §10.17. Only meaningful
         when `children` is plain text (the common case). */}
      <span
        className="label p"
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
