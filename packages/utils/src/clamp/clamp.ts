/**
 * Clamp a numeric value between minimum and maximum bounds.
 *
 * This function provides flexible clamping behavior:
 * - With both bounds: clamps value between min and max
 * - With only min: ensures value is not below min
 * - With only max: ensures value is not above max
 * - With no bounds: returns value unchanged
 *
 * @param value - The number to clamp.
 * @param min - Minimum bound (inclusive). When omitted, no lower limit is enforced.
 * @param max - Maximum bound (inclusive). When omitted, no upper limit is enforced.
 * @returns The clamped value.
 *
 * @example
 * // Standard clamping with both bounds
 * clamp(5, 0, 10)    // 5 (within range)
 * clamp(-2, 0, 10)   // 0 (below min)
 * clamp(42, 0, 10)   // 10 (above max)
 *
 * @example
 * // Single bound clamping
 * clamp(5, 0)         // 5 (above min, no max)
 * clamp(-2, 0)        // 0 (below min)
 * clamp(42, undefined, 10) // 10 (above max, no min)
 *
 * @example
 * // No bounds (identity function)
 * clamp(5)            // 5
 * clamp(-2)           // -2
 */
const clamp = (value: number, min?: number, max?: number): number => {
  // Early return if no bounds provided
  if (min === undefined && max === undefined) {
    return value;
  }

  if (min !== undefined && value < min) {
    return min;
  }
  if (max !== undefined && value > max) {
    return max;
  }
  return value;
};

export default clamp;
