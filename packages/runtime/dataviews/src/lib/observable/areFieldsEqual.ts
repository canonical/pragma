/**
 * Whether two records hold the same value under every key of the first:
 * what a channel of a flat state record compares publications by, so a
 * publication that changes nothing tells nobody.
 */
export default function areFieldsEqual<T extends object>(a: T, b: T): boolean {
  return (Object.keys(a) as (keyof T)[]).every((key) => a[key] === b[key]);
}
