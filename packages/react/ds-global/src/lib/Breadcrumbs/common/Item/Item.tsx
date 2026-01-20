import type React from "react";
import type { ItemProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds breadcrumbs-item";

/**
 * Breadcrumbs.Item subcomponent
 *
 * A single breadcrumb item with link and separator.
 * DOM order per DSL: [0] link, [1] separator
 * The separator is hidden on the last item via CSS :last-of-type.
 *
 * @implements ds:global.subcomponent.breadcrumbs-item
 */
const Item = ({
  children,
  href,
  current = false,
  separator = "/",
  className,
  ...props
}: ItemProps): React.ReactElement => (
  <li
    className={[componentCssClassName, current && "current", className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    {/* edges[0]: link (cardinality: 1, slotName: default) */}
    {current ? (
      <span className="breadcrumbs-item-link" aria-current="page">
        {children}
      </span>
    ) : (
      <a className="breadcrumbs-item-link" href={href}>
        {children}
      </a>
    )}
    {/* edges[1]: separator - hidden on last item via CSS */}
    <span className="breadcrumbs-item-separator" aria-hidden="true">
      {separator}
    </span>
  </li>
);

Item.displayName = "Breadcrumbs.Item";

export default Item;
