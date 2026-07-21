/**
 * The strip-socket reader: how the shell learns what the active route's
 * composed layout wants in the mode strip (the P-5 handshake's read side).
 *
 * Follows `readRouteQueryEntry`'s contract exactly: route `meta` is
 * `unknown`-typed by design, so every read passes a shape assertion —
 * absence is fine (empty sockets), a malformed entry throws, because a
 * route that half-declares its strip is a bug, not an absence.
 */

import { SHELL_STRIP_META_KEY } from "./constants.js";
import type { StripSlotsEntry } from "./types.js";

export const readStripSlots = (
  meta: Readonly<Record<string, unknown>> | undefined,
): StripSlotsEntry | undefined => {
  const entry = meta?.[SHELL_STRIP_META_KEY];
  if (entry === undefined) return undefined;
  if (typeof entry !== "object" || entry === null) {
    throw new Error(`route meta ${SHELL_STRIP_META_KEY} is not an object`);
  }
  const { Context, Controls, Status } = entry as Record<string, unknown>;
  if (Context !== undefined && typeof Context !== "function") {
    throw new Error(
      `route meta ${SHELL_STRIP_META_KEY}.Context is not a component`,
    );
  }
  if (Controls !== undefined && typeof Controls !== "function") {
    throw new Error(
      `route meta ${SHELL_STRIP_META_KEY}.Controls is not a component`,
    );
  }
  if (Status !== undefined && typeof Status !== "function") {
    throw new Error(
      `route meta ${SHELL_STRIP_META_KEY}.Status is not a component`,
    );
  }
  return entry as StripSlotsEntry;
};
