/**
 * Convert a string to Title Case (space-separated capitalized words).
 *
 * @example
 * toTitleCase("my-component") // "My Component"
 * toTitleCase("some_thing") // "Some Thing"
 * toTitleCase("hello world") // "Hello World"
 */
export default function toTitleCase(s: string): string {
  if (!s) return "";

  return s
    .split(/[-_\s/+]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
