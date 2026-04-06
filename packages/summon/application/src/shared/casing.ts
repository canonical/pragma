export function toSegments(value: string): string[] {
  return value
    .split(/[\/_-]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function toPascalCase(value: string): string {
  return toSegments(value)
    .map((segment) => {
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join("");
}

export function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);

  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function toKebabCase(value: string): string {
  return toSegments(value)
    .map((segment) => segment.toLowerCase())
    .join("-");
}

export function toTitleCase(value: string): string {
  return toSegments(value)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function normalizeCommandPath(value: string): string {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\\/g, "/");
}
