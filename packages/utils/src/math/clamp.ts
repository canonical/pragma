/**
 * Clamp a numeric value between optional minimum and maximum bounds.
 *
 * If `min` is provided and `value < min`, returns `min`.
 * If `max` is provided and `value > max`, returns `max`.
 * If both are omitted, returns the input value unchanged.
 *
 * @param value - The number to clamp.
 * @param min - Minimum bound (inclusive). When omitted, only `max` is enforced.
 * @param max - Maximum bound (inclusive). When omitted, only `min` is enforced.
 * @returns The clamped value.
 *
 * @example
 * clamp(5, 0, 10) // 5
 * clamp(-2, 0, 10) // 0
 * clamp(42, undefined, 10) // 10
 * clamp(3, 5, undefined) // 5
 */
const clamp = (value: number, min?: number, max?: number): number => {
  if (min !== undefined && value < min) {
    return min;
  }
  if (max !== undefined && value > max) {
    return max;
  }
  return value;
};

export default clamp;
