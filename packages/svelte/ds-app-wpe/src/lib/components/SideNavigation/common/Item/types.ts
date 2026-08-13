import type { _Item } from "@canonical/ds-types";
import type { NavItem } from "../../types.js";

export interface ItemProps {
  /** The annotated item this row renders (depth ≥ 2 — root and groups never reach Item). */
  item: _Item<NavItem>;
}
