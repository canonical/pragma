import type { IconName } from "@canonical/ds-assets";
import type React from "react";
import type { FooterItem } from "../../types.js";
import { Item } from "../Item/index.js";
import { ItemButton } from "../ItemButton/index.js";
import { ItemSwitch } from "../ItemSwitch/index.js";
import { NavTree } from "../NavTree/index.js";
import type { FooterProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds footer";

const FOOTER_ITEM_DEFAULTS: Record<
  FooterItem["kind"],
  { icon: IconName; label: string }
> = {
  account: { icon: "user", label: "Account settings" },
  notifications: { icon: "notifications", label: "Notifications" },
  logout: { icon: "log-out", label: "Log out" },
};

/**
 * Renders one footer item from the closed vocabulary, dispatching on
 * `control` the same way `NavTree`'s own `renderEntry` does (SPEC.md
 * §4.4) — `"switch"` renders `ItemSwitch`; otherwise, navigable (`url` set)
 * items render as `Item` (a link), and action items (most commonly
 * `logout`, which nearly always has no page of its own) render as
 * `ItemButton`. Explicit `control` always wins over the `url`-presence
 * inference, so a `notifications` item can be a switch even though it
 * would otherwise default to a link.
 */
const renderFooterItem = (
  item: FooterItem,
  certificateUser: boolean,
): React.ReactElement => {
  const defaults = FOOTER_ITEM_DEFAULTS[item.kind];
  const icon =
    item.kind === "account" && certificateUser ? "certificate" : defaults.icon;
  const label = item.label ?? defaults.label;

  if (item.control === "switch") {
    return (
      <ItemSwitch
        key={item.kind}
        icon={icon}
        checked={item.checked}
        defaultChecked={item.defaultChecked}
        onCheckedChange={item.onCheckedChange}
      >
        {label}
      </ItemSwitch>
    );
  }

  if (item.control !== "button" && item.url) {
    return (
      <Item key={item.kind} url={item.url} icon={icon} slot={item.slot}>
        {label}
      </Item>
    );
  }

  return (
    <ItemButton
      key={item.kind}
      icon={icon}
      slot={item.slot}
      onClick={item.onClick}
    >
      {label}
    </ItemButton>
  );
};

/**
 * SideNavigation.Footer — optional region pinned to the bottom, reserved
 * for user-related content. `items` (the spec's closed `footer-items`
 * vocabulary — account settings, notifications, log out, SPEC.md §4.1)
 * takes precedence when given; `certificateUser` swaps the account icon and
 * drops any logout item. Falls back to the free-form `root`
 * (`cs:react.component.link_component`-style tree, via its own
 * `useNavigationTree` instance) and then to `children`.
 *
 * @implements ds:apps.subcomponent.side-navigation-footer
 */
const Footer = ({
  className,
  root,
  items,
  certificateUser = false,
  LinkComponent = "a",
  currentUrl,
  children,
  ...props
}: FooterProps): React.ReactElement => {
  const visibleItems = certificateUser
    ? items?.filter((item) => item.kind !== "logout")
    : items;

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {visibleItems && visibleItems.length > 0 ? (
        <ul className="list">
          {visibleItems.map((item) => renderFooterItem(item, certificateUser))}
        </ul>
      ) : root ? (
        <NavTree
          root={root}
          currentUrl={currentUrl}
          LinkComponent={LinkComponent}
        />
      ) : (
        children
      )}
    </div>
  );
};

export default Footer;
