/**
 * Split a value into segments by common separators (/, _, -, +, space).
 */
export function toSegments(value: string): string[] {
  return value.split(/[/_\-+\s]+/).filter(Boolean);
}

/**
 * Convert a value to PascalCase.
 */
export function toPascalCase(value: string): string {
  return toSegments(value)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

/**
 * Convert a value to camelCase.
 */
export function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);

  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert a value to kebab-case.
 */
export function toKebabCase(value: string): string {
  return toSegments(value)
    .map((segment) => segment.toLowerCase())
    .join("-");
}

/**
 * Convert a value to Title Case.
 */
export function toTitleCase(value: string): string {
  return toSegments(value)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

/**
 * Normalize a command path argument: trim, remove leading/trailing slashes,
 * convert backslashes to forward slashes.
 */
export function normalizeCommandPath(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}
