import { HIDDEN_KEY, ORDER_KEY, WIDTH_KEY_PREFIX } from "./constants.js";
import type { ColumnCommandConfig, PresentationPatch } from "./types.js";

/**
 * The change that returns a table to the arrangement beneath the viewer's
 * own: every column width, the order and the hidden columns the arrangement
 * in force holds, each removed. Written as the viewer's change — to the open
 * view's own preferences, or to the default arrangement with no view open —
 * it clears that layer, so the arrangement the view was saved with, or the
 * columns' declared one, shows through. Empty when the arrangement holds
 * none of them.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function resetColumnArrangement({
  presentation,
}: Pick<ColumnCommandConfig, "presentation">): PresentationPatch {
  return Object.fromEntries(
    Object.keys(presentation)
      .filter(
        (key) =>
          key === ORDER_KEY ||
          key === HIDDEN_KEY ||
          key.startsWith(WIDTH_KEY_PREFIX),
      )
      .map((key) => [key, undefined]),
  );
}
