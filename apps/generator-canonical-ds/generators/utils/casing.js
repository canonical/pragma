/**
 * Convert a string to PascalCase
 * @param s - The string to convert
 * @returns The PascalCase string
 * @example
 * toPascalCase("my-component") // "MyComponent"
 */
const toPascalCase = (s) => {
    if (!s)
        return "";
    const camelCased = s
        .replace(/-([a-z])/g, (g) => g[1].toUpperCase())
        .replaceAll("-", "")
        .replaceAll("_", "")
        .replaceAll(" ", "");
    return camelCased.charAt(0).toUpperCase() + camelCased.slice(1);
};
/**
 * Convert a string to kebab-case
 * @param s - The string to convert
 * @returns The kebab-case string
 * @example
 * toKebabCase("MyComponent") // "my-component"
 */
const toKebabCase = (s) => {
    if (!s)
        return "";
    return s
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .toLowerCase();
};
export default {
    toPascalCase,
    toKebabCase,
};
