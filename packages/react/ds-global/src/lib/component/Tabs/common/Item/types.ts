import type { LinkComponent } from "../../../../types/link.js";
import type { TabItem } from "../../types.js";

/**
 * Props for the internal Tabs Item renderer.
 *
 * Not a public subcomponent — Tabs iterates `navigationRoot.items` and renders
 * one of these per child. Kept internal so router integration lives in one
 * place (the `LinkComponent` on Tabs), mirroring SideNavigation.
 */
export interface ItemProps {
  /** The tab's navigation item. */
  item: TabItem;
  /** Whether this tab is the current location (drives `aria-current="page"`). */
  active: boolean;
  /** Component used to render the tab when it is navigable. Defaults to `"a"`. */
  LinkComponent: LinkComponent;
}
