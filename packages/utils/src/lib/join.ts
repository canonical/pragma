/**
 * Join an array into a string, converting each element to a string first.
 *
 * @example
 * join(["a", "b", "c"]) // "a, b, c"
 * join([1, 2, 3], " | ") // "1 | 2 | 3"
 */
export default function join(arr: unknown[], separator = ", "): string {
  return arr.map(String).join(separator);
}
