/**
 * Check if a string is in PascalCase.
 *
 * @example
 * isPascalCase("MyComponent") // true
 * isPascalCase("myComponent") // false
 */
export default function isPascalCase(s: string): boolean {
  return /^[A-Z][a-z0-9]*(?:[A-Z][a-z0-9]*)*$/.test(s);
}
