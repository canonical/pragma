/**
 * Convert a string to camelCase.
 *
 * @example
 * toCamelCase("my-component") // "myComponent"
 * toCamelCase("some_thing") // "someThing"
 */
export default function toCamelCase(s: string): string {
  if (!s) return "";

  return s
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}
