import { DEFAULT_MESSAGES } from "./DEFAULT_MESSAGES.js";
import type { DataViewsMessages } from "./types.js";

/**
 * The words a root speaks: the application's messages over the English
 * record, so a message it leaves out keeps its English and a whole
 * replacement leaves none. Frozen, so no part can reword another's.
 *
 * A message given as `undefined` is left out rather than copied over the
 * English: a catalog that has not loaded, or a lookup that missed, must not
 * blank a control's name or hand a part something it cannot call.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function resolveMessages(
  messages: Partial<DataViewsMessages> = {},
): DataViewsMessages {
  const given = Object.entries(messages).filter(
    ([, message]) => message !== undefined,
  );
  return Object.freeze({
    ...DEFAULT_MESSAGES,
    ...Object.fromEntries(given),
  });
}
