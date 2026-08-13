import { getContext, setContext } from "svelte";
import type { SvelteSet } from "svelte/reactivity";
import type { NavTreeController } from "./useNavTree.svelte.js";

export interface NavTreeContext {
  /** Ids of currently-expanded (disclosed) items, shared across the whole tree. */
  expandedIds: SvelteSet<string>;
  /** The owning region's keyboard/focus controller. */
  tree: NavTreeController;
  /** Reactive getter for the current location, used to mark the matching item. */
  currentUrl: () => string | undefined;
}

const contextKey = Symbol("nav-tree");

/** Set by `NavTree` — one instance per region, read by every `Item` beneath it. */
export function setNavTreeContext(context: NavTreeContext): void {
  setContext(contextKey, context);
}

/** Read by `Item`. Throws outside a `NavTree` subtree — it's an internal contract, not public API. */
export function getNavTreeContext(): NavTreeContext {
  const context = getContext<NavTreeContext | undefined>(contextKey);
  if (!context) {
    throw new Error(
      "SideNavigation.Item must be rendered inside a NavTree — no NavTreeContext found.",
    );
  }
  return context;
}
