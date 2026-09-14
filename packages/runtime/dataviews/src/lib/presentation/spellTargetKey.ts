import type { PresentationTarget } from "./types.js";

/**
 * The key a target's preferences are kept under, in a store and in the
 * presentation's own bookkeeping: the default arrangement's, or a view's
 * named by its id.
 */
export default function spellTargetKey(target: PresentationTarget): string {
  return target === "default" ? "default" : `view:${target.view}`;
}
