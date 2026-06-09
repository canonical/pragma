import type { ComponentType } from "react";
import type { LinkComponentProps, NavItem } from "../../types.js";

export interface NavTreeProps {
  /** Root NavItem whose direct children (level-1 groups) are rendered. */
  root: NavItem;
  /** Live current location; resolves and keeps the active item in sync. */
  currentUrl?: string;
  /** Component used to render navigable items. Defaults to `"a"`. */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
}
