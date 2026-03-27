import templateHelpers from "./templateHelpers.js";

/**
 * Create a vars object with helpers included.
 */
export default function withHelpers(
  vars: Record<string, unknown>,
): Record<string, unknown> {
  return { ...templateHelpers, ...vars };
}
