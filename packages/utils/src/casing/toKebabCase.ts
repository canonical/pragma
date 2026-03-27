/**
 * Convert a string to kebab-case.
 *
 * Handles camelCase, PascalCase, snake_case, spaces, and consecutive uppercase.
 *
 * @example
 * toKebabCase("MyComponent") // "my-component"
 * toKebabCase("some_thing") // "some-thing"
 * toKebabCase("HTMLParser") // "html-parser"
 */
export default function toKebabCase(s: string): string {
  if (!s) return "";

  return s
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}
