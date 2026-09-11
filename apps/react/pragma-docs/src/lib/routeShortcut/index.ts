/**
 * The keyboard allocation: routes claim their own key, and anything that
 * displays or wires one reads it back from the route table.
 *
 * NOT barrelled from `#lib/index.js` — that barrel carries the app's
 * COMPONENTS, and nothing here renders. Import from
 * `#lib/routeShortcut/index.js`.
 */

export type { ShortcutAllocation } from "./collectShortcuts.js";
export { collectShortcuts } from "./collectShortcuts.js";
export {
  ROUTE_SHORTCUT_META_KEY,
  routeShortcutFacet,
} from "./shortcutFacet.js";
