import type { SvelteHTMLElements } from "svelte/elements";
import type { NavItem } from "../../types.js";

type BaseProps = SvelteHTMLElements["div"];

export interface ContentProps extends BaseProps {
  /** Main navigation, as a root NavItem. Its direct children render as groups. */
  root: NavItem;
  /** The current location, used to resolve the active item. */
  currentUrl?: string;
}
