import type React from "react";
import { Item } from "./common/index.js";
import type { BreadcrumbsProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds breadcrumbs";

/**
 * Breadcrumbs are a navigational aid that shows users their current location
 * within a site's information hierarchy. They provide a clear path from the
 * root of the information hierarchy (IA) to the current page, allowing users
 * to quickly understand where they are and easily navigate back to previous
 * levels in the IA. Breadcrumbs should reflect the IA, not the user's path
 * they took to arrive at the current page. They work best in websites or
 * applications with multiple levels of hierarchy and are particularly useful
 * when users might arrive at deep pages through search or external links.
 *
 * @implements ds:global.pattern.breadcrumbs
 */
const Breadcrumbs = ({
  children,
  className,
  "aria-label": ariaLabel = "Breadcrumb",
  ...props
}: BreadcrumbsProps): React.ReactElement => (
  <nav
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    aria-label={ariaLabel}
    {...props}
  >
    <ol className="breadcrumbs-list">
      {/* DSL edges[0]: breadcrumbs-item (cardinality: 1..*) */}
      {children}
    </ol>
  </nav>
);

Breadcrumbs.Item = Item;

export default Breadcrumbs;
