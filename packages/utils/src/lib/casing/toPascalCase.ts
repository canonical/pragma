/**
 * Convert a string to PascalCase.
 *
 * @example
 * toPascalCase("my-component") // "MyComponent"
 * toPascalCase("some_thing") // "SomeThing"
 */
export default function toPascalCase(s: string): string {
  if (!s) return "";

  const camel = s
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^[A-Z]/, (c) => c.toLowerCase());

  return camel.charAt(0).toUpperCase() + camel.slice(1);
}
