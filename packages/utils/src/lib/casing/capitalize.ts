/**
 * Capitalize the first character of a string.
 *
 * @example
 * capitalize("hello") // "Hello"
 */
export default function capitalize(s: string): string {
  if (!s) return "";

  return s.charAt(0).toUpperCase() + s.slice(1);
}
