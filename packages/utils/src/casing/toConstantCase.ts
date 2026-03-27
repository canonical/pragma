import toSnakeCase from "./toSnakeCase.js";

/**
 * Convert a string to CONSTANT_CASE.
 *
 * @example
 * toConstantCase("myComponent") // "MY_COMPONENT"
 * toConstantCase("some-thing") // "SOME_THING"
 */
export default function toConstantCase(s: string): string {
  if (!s) return "";

  return toSnakeCase(s).toUpperCase();
}
