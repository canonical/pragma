import { casing } from "@canonical/utils";

/**
 * Converts a list of domains to a form key.
 * Note: When using "." as a separator, the react-hook-form library will nest the form state by each .
 * So, it is important that extra . are removed to avoid unexpected nesting.
 * Additionally, the `getValues` method should be used, with a key returned by this function, to access the form state.
 * Otherwise, you will have to deal with the nested form state.
 * @param domains - The domains to convert.
 * @example
 * ```ts
 * toGlobalFormStateKey("Typographic Specimen", "--font-size");
 * // Returns "TypographicSpecimen.FontSize"
 * // Causes a form structure like this to be created:
 * // { TypographicSpecimen: { FontSize: "value" } }
 * ```
 * @returns The form key.
 */
const toGlobalFormStateKey = (...domains: string[]) => {
  const delim = ".";
  return domains.map((domain) => domain.replaceAll(delim, "_")).join(delim);
};

export default toGlobalFormStateKey;
