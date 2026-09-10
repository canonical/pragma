import type { ResultWindow } from "./types.js";

/**
 * Project the explicitly displayed window out of a full result set:
 * rows `(page - 1) * size` through `page * size`, one-based pages. The
 * returned array is a fresh copy; the input is never sliced in place.
 * Invalid windows (non-positive or fractional pages and sizes) throw, the
 * same rejections the addressed command layer applies.
 */
export default function applyWindow<T>(
  rows: readonly T[],
  window: ResultWindow,
): T[] {
  if (!Number.isInteger(window.page) || window.page < 1) {
    throw new Error("page must be a positive integer");
  }
  if (!Number.isInteger(window.size) || window.size < 1) {
    throw new Error("size must be a positive integer");
  }
  const start = (window.page - 1) * window.size;
  if (start >= rows.length) {
    return [];
  }
  return rows.slice(start, start + window.size);
}
