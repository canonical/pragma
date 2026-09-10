import { Icon } from "@canonical/react-ds-global";
import type React from "react";
import type { ItemButtonProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation-item-button";

/**
 * SideNavigation.ItemButton — a navigation row that performs an action
 * instead of navigating (e.g. "Log out", "Create context"). Buttons are a
 * Footer-only row kind: the content tree accepts links and plain labels,
 * so an `ItemButton` belongs in a `SideNavigation.Footer` — rendered from
 * a `control: "button"` footer item or composed via the Footer's
 * `children`. Content is composed via `children`,
 * matching `Button`'s own convention.
 *
 * @implements ds:apps.subcomponent.side-navigation-item-button
 */
const ItemButton = ({
  children,
  icon,
  slot,
  className,
  ...props
}: ItemButtonProps): React.ReactElement => (
  <li className={[componentCssClassName, className].filter(Boolean).join(" ")}>
    <button className="row" {...props} type="button">
      {/* Start cell is always rendered (empty when no icon), matching Item,
          so content stays aligned whether or not a row has an icon. */}
      <span className="start">
        {icon ? <Icon width={16} height={16} icon={icon} /> : null}
      </span>
      {/* `title` — native tooltip fallback for truncated text; the 24.04 spec §10.17. */}
      <span
        className="label"
        title={typeof children === "string" ? children : undefined}
      >
        {children}
      </span>
      {slot ? <span className="end slot">{slot}</span> : null}
    </button>
  </li>
);

export default ItemButton;
