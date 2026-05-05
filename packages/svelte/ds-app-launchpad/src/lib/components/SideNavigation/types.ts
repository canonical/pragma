/* @canonical/generator-ds 0.17.1 */

import type { Snippet } from "svelte";
import type { SvelteHTMLElements } from "svelte/elements";

export type ExpandToggleProps = {
  "aria-expanded": boolean;
  "aria-controls": string;
  "aria-label": string;
};

type BaseProps = SvelteHTMLElements["header"];

export interface SideNavigationProps extends BaseProps {
  /**
   * A snippet containing the logo to be displayed at the top of the side navigation.
   */
  logo: Snippet<[]>;
  /**
   * A snippet containing a button to toggle the expansion of the side navigation.
   *
   * Snippet arguments:
   * - `expandToggleProps`: Props that should be spread on the button element to provide accessibility information:
   *   - `aria-expanded`: A boolean indicating whether the side navigation is expanded or collapsed;
   *   - `aria-controls`: The id of the side navigation's `nav` element;
   *   - `aria-label`: A label describing the action of the button.
   */
  expandToggle?: Snippet<[expandToggleProps: ExpandToggleProps]>;
  /**
   * A snippet containing content to be displayed at the bottom of the side navigation, below the navigation items. The icons of the items in the footer will always be visible, even when the side navigation is collapsed.
   */
  footer?: Snippet<[]>;
  /**
   * Whether the side navigation is expanded or collapsed.
   *
   * @default true
   */
  expanded?: boolean;
  /**
   * Main page navigation items.
   */
  children: Snippet<[]>;
}
