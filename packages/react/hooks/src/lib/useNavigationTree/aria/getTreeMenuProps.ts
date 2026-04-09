import type { UseNavigationTreeResult } from "../types.js";
import type { TreeMenuPropsResult } from "./types.js";

/**
 * Build ARIA props for a tree or group container element.
 *
 * Depth 0 produces `role="tree"`. Depth 1+ produces `role="group"`.
 *
 * @param _nav - Navigation hook result (unused, reserved for future use)
 * @param opts - Depth of this container and accessible label
 * @returns ARIA attributes to spread on the container element
 */
export default function getTreeMenuProps(
  _nav: UseNavigationTreeResult,
  opts: { depth: number; label?: string },
): TreeMenuPropsResult {
  return {
    role: opts.depth === 0 ? "tree" : "group",
    ...(opts.label ? { "aria-label": opts.label } : {}),
  };
}
