import {
  CollapseToggle,
  Content,
  Footer,
  Header,
  Item,
} from "./common/index.js";
import SideNavigationRoot from "./SideNavigation.svelte";

const SideNavigation = SideNavigationRoot as typeof SideNavigationRoot & {
  /** `SideNavigation.Header` — the brand + collapse toggle region. */
  Header: typeof Header;
  /** `SideNavigation.Content` — the main, scrollable navigation region. */
  Content: typeof Content;
  /** `SideNavigation.Footer` — the region pinned to the bottom. */
  Footer: typeof Footer;
  /** `SideNavigation.Item` — a single navigation row. */
  Item: typeof Item;
  /** `SideNavigation.CollapseToggle` — the button that expands/collapses the rail. */
  CollapseToggle: typeof CollapseToggle;
};
SideNavigation.Header = Header;
SideNavigation.Content = Content;
SideNavigation.Footer = Footer;
SideNavigation.Item = Item;
SideNavigation.CollapseToggle = CollapseToggle;

export type {
  CollapseToggleProps as SideNavigationCollapseToggleProps,
  ContentProps as SideNavigationContentProps,
  FooterProps as SideNavigationFooterProps,
  HeaderProps as SideNavigationHeaderProps,
  ItemProps as SideNavigationItemProps,
} from "./common/index.js";
export type { NavItem, SideNavigationProps } from "./types.js";
export { SideNavigation };
