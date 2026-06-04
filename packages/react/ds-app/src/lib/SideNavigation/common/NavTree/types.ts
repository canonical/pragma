import type { Item as NavItem } from "@canonical/ds-types";
import type { ComponentType } from "react";
import type { LinkComponentProps } from "../../types.js";

export interface NavTreeProps {
  /** Root item whose direct children are rendered. */
  root: NavItem;
  /** Live current location; resolves and keeps the active item in sync. */
  currentUrl?: string;
  /** Component used to render navigable items. Defaults to `"a"`. */
  LinkComponent?: ComponentType<LinkComponentProps> | "a";
}
