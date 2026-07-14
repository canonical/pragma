import type React from "react";
import type { ItemProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds breadcrumbs-item";

/**
 * Default breadcrumb item renderer.
 *
 * Can be replaced by providing a custom Component in the Item
 * that satisfies ItemProps.
 *
 * @implements ds:global.subcomponent.breadcrumbs-item
 */
const Item = ({
  children,
  label,
  url,
  current = false,
  separator = "/",
  disabled = false,
  className,
  LinkComponent = "a",
  // Destructure Item props we don't spread to DOM
  key: _key,
  items: _items,
  Component: _Component,
  ...props
}: ItemProps): React.ReactElement => {
  const content = children ?? label;
  const Link = LinkComponent;

  return (
    <li
      className={[componentCssClassName, current && "current", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {/* edges[1]: separator - rendered before the link (inverting the
          anatomy-DSL edge order) so that on wrap the slash starts the new
          line rather than trailing the previous one; hidden on the first
          item via CSS */}
      <span className="separator" aria-hidden="true">
        {separator}
      </span>
      {/* edges[0]: link (cardinality: 1, slotName: default) */}
      {current || disabled ? (
        <span className="link" aria-current={current ? "page" : undefined}>
          {content}
        </span>
      ) : (
        <Link className="link" href={url}>
          {content}
        </Link>
      )}
    </li>
  );
};

Item.displayName = "Breadcrumbs.Item";

export default Item;
