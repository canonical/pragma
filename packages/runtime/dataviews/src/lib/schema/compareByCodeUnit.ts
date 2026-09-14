/**
 * Order two strings by UTF-16 code unit, the one order every runtime agrees
 * on whatever locale data it carries.
 */
export default function compareByCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
