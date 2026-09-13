import rejectWindow from "./rejectWindow.js";
import type { ResultWindow } from "./types.js";

/**
 * Project the explicitly displayed window out of a full result set:
 * rows `(page - 1) * size` through `page * size`, one-based pages. The
 * returned array is a fresh copy; the input is never sliced in place.
 * Invalid windows throw, the same rejections the addressed command layer
 * applies.
 */
export default function applyWindow<T>(
  rows: readonly T[],
  window: ResultWindow,
): T[] {
  const rejection = rejectWindow(window);
  if (rejection !== null) {
    throw new Error(rejection);
  }
  const start = (window.page - 1) * window.size;
  if (start >= rows.length) {
    return [];
  }
  return rows.slice(start, start + window.size);
}
