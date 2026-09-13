import type { ResultWindow } from "./types.js";

/**
 * Why a window cannot be asked for, or null when it can: pages and sizes
 * are positive integers, and a cursor is a token or null, never the empty
 * string. One check for the command layer, which reports the reason, and
 * for the coordinator and the local projection, which throw it.
 */
export default function rejectWindow(
  window: Pick<ResultWindow, "page" | "size" | "cursor">,
): string | null {
  if (!Number.isInteger(window.page) || window.page < 1) {
    return "page must be a positive integer";
  }
  if (!Number.isInteger(window.size) || window.size < 1) {
    return "size must be a positive integer";
  }
  if (window.cursor === "") {
    return "cursor must not be empty; use null to clear it";
  }
  return null;
}
