import type { NavItem } from "../../types.js";

export interface NavTreeProps {
  /** Root item — its direct children render as groups. */
  root: NavItem;
  /** The current location, used to mark the matching item and open its ancestors. */
  currentUrl?: string;
}
