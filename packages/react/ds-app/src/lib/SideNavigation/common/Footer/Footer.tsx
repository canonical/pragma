import type React from "react";
import type { FooterItem, LeafFooterItem } from "../../types.js";
import { Item } from "../Item/index.js";
import { ItemButton } from "../ItemButton/index.js";
import { ItemExpandable } from "../ItemExpandable/index.js";
import type { FooterProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds footer";

/**
 * Renders one footer leaf row. The Footer is where a navigation row may be
 * a button — the content tree accepts links and plain labels only, while
 * the footer's `LeafFooterItem` keeps the `"button"` row. A navigable item
 * (`url` set, `control` not `"button"`) is dispatched to `Item` (a link,
 * through `LinkComponent`, marked active when it is the current location);
 * anything else renders as `ItemButton`. Explicit `control` always wins
 * over the `url`-presence inference, so an action item can carry a `url`
 * yet still render as a button. A toggle-style footer row has no dedicated
 * switch — a consumer composes one from `ItemButton` plus a `slot` (e.g. a
 * state badge) instead.
 */
const renderFooterItem = (
  item: LeafFooterItem,
  currentUrl: string | undefined,
  LinkComponent: FooterProps["LinkComponent"],
): React.ReactElement => {
  const row = item.url !== undefined && item.url === currentUrl;

  if (item.control !== "button" && item.url) {
    return (
      <Item
        key={item.label}
        url={item.url}
        icon={item.icon}
        slot={item.slot}
        LinkComponent={LinkComponent}
        active={row}
      >
        {item.label}
      </Item>
    );
  }

  return (
    <ItemButton
      key={item.label}
      icon={item.icon}
      slot={item.slot}
      onClick={item.onClick}
    >
      {item.label}
    </ItemButton>
  );
};

/**
 * SideNavigation.Footer — optional region pinned to the bottom, reserved
 * for user-related content. Data-only: `root` is the footer's only data
 * surface — free-form leaves (`LeafFooterItem`, buttons via
 * `control`/`onClick`) and depth-1 expandables (`ExpandableFooterItem`,
 * whose children disclose through the same native `<details>` disclosure
 * the content tree uses). A certificate-user application, for instance,
 * composes the `certificate` icon and omits the logout item itself.
 *
 * @implements ds:apps.subcomponent.side-navigation-footer
 */
const Footer = ({
  className,
  root,
  LinkComponent = "a",
  currentUrl,
  ...props
}: FooterProps): React.ReactElement => {
  const list = root?.items ?? [];

  return (
    <footer
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {list.length > 0 ? (
        <ul className="list">
          {list.map((entry: FooterItem) =>
            "items" in entry && entry.items.length > 0 ? (
              <ItemExpandable
                key={entry.label}
                heading={entry.label}
                icon={entry.icon}
                collapseOnChildClick
                // Seed from whether a child row is the current location —
                // the disclosure's own one-way sync re-opens it on
                // navigation, exactly as the content tree does.
                defaultExpanded={entry.items.some(
                  (child) => child.url === currentUrl,
                )}
              >
                {entry.items.map((child) =>
                  renderFooterItem(child, currentUrl, LinkComponent),
                )}
              </ItemExpandable>
            ) : (
              renderFooterItem(entry, currentUrl, LinkComponent)
            ),
          )}
        </ul>
      ) : null}
    </footer>
  );
};

export default Footer;
