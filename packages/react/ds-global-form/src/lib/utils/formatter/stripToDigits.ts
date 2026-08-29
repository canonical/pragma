/**
 * Reduce a display string to the digits it contains, dropping every separator
 * (spaces, dashes, parens, and anything else). This is the `parse` half of a
 * digit-grouping {@link ./types.js | Formatter} — the inverse of
 * {@link ./applyPattern.js | applyPattern}.
 *
 * @note Pure.
 */
export default function stripToDigits(value: string): string {
  return value.replace(/\D/g, "");
}
