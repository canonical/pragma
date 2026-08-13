import type { _Item } from "@canonical/ds-types";
import type { SvelteSet } from "svelte/reactivity";
import type { NavItem } from "../../types.js";
import type { NavTreeController } from "../NavTree/useNavTree.svelte.js";

export interface ItemProps {
  /** The annotated item this row renders (depth ≥ 2 — root and groups never reach Item). */
  item: _Item<NavItem>;
  /** The current location, used to mark the matching item `aria-current="page"`. */
  currentUrl?: string;
  /** Ids of currently-expanded (disclosed) items, shared across the whole tree. */
  expandedIds: SvelteSet<string>;
  /** The owning region's keyboard/focus controller. */
  tree: NavTreeController;
}
