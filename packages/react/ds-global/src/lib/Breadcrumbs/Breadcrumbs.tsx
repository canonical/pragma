import type React from "react";
import { getItemId } from "@canonical/utils";
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
	items,
	separator = "/",
	LinkComponent = "a",
	className,
	"aria-label": ariaLabel = "Breadcrumb",
	...props
}: BreadcrumbsProps): React.ReactElement => (
	<nav
		className={[componentCssClassName, className].filter(Boolean).join(" ")}
		aria-label={ariaLabel}
		{...props}
	>
		<ol className="list">
			{items.map((item) => {
				const itemKey = getItemId(item);
				const { key: _key, ...itemProps } = item;
				const ItemComponent = item.Component ?? Item;

				// Switch: use custom Component or default Item
				// Each item is spread onto the component
				return (
					<ItemComponent
						key={itemKey}
						separator={separator}
						LinkComponent={LinkComponent}
						{...itemProps}
					/>
				);
			})}
		</ol>
	</nav>
);

Breadcrumbs.Item = Item;

export default Breadcrumbs;
