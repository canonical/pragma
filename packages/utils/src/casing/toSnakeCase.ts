/**
 * Convert a string to snake_case.
 *
 * @example
 * toSnakeCase("myComponent") // "my_component"
 * toSnakeCase("MyComponent") // "my_component"
 * toSnakeCase("some-thing") // "some_thing"
 */
export default function toSnakeCase(s: string): string {
  if (!s) return "";

  return s
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}
