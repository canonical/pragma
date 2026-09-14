import type { ViewPresentation } from "./types.js";

/**
 * Whether two arrangements hold the same keys with the same values, compared
 * as JSON: the arrangement is stored as JSON, so two that stringify alike
 * are one arrangement.
 */
export default function arePresentationsEqual(
  a: ViewPresentation,
  b: ViewPresentation,
): boolean {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every(
      (key) =>
        Object.hasOwn(b, key) &&
        (a[key] === b[key] ||
          JSON.stringify(a[key]) === JSON.stringify(b[key])),
    )
  );
}
