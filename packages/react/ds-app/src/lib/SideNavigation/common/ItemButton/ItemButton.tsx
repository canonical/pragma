import { Icon } from "@canonical/react-ds-global";
import type React from "react";
import type { ItemButtonProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation-item-button";

/**
 * SideNavigation.ItemButton — a navigation row that performs an action
 * instead of navigating (e.g. "Log out", "Create context"). One of the
 * `control` variants selectable on a `LeafNavItem` (SPEC.md §4.4) — the
 * others are Item (link, the default) and ItemSwitch.
 *
 * @implements ds:apps.subcomponent.side-navigation-item-button
 */
const ItemButton = ({
  label,
  icon,
  slot,
  className,
  key: _key,
  ...props
}: ItemButtonProps): React.ReactElement => (
  <li className={[componentCssClassName, className].filter(Boolean).join(" ")}>
    <button className="row" {...props} type="button">
      {/* Start cell is always rendered (empty when no icon), matching Item,
          so labels align whether or not a row has an icon. */}
      <span className="start p">{icon ? <Icon icon={icon} /> : null}</span>
      <span className="label p">{label}</span>
      {slot ? <span className="end slot">{slot}</span> : null}
    </button>
  </li>
);

export default ItemButton;
