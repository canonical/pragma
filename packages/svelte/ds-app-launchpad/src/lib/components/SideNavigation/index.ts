/* @canonical/generator-ds 0.17.1 */

import { ExpandToggle, NavigationItem } from "./common/index.js";
import { default as SideNavigationRoot } from "./SideNavigation.svelte";

const SideNavigation = SideNavigationRoot as typeof SideNavigationRoot & {
  /**
   * `SideNavigation.NavigationItem` A clickable button item within the side navigation.
   */
  NavigationItem: typeof NavigationItem;
  /**
   * `SideNavigation.ExpandToggle` A button to toggle the expansion of the side navigation.
   */
  ExpandToggle: typeof ExpandToggle;
};

SideNavigation.NavigationItem = NavigationItem;
SideNavigation.ExpandToggle = ExpandToggle;

export * from "./types.js";
export { SideNavigation };

export type { NavigationItemProps as SideNavigationItemProps } from "./common/index.js";
