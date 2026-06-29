/**
 * Strip a phone display mask back to raw digits — the inverse of
 * {@link applyPhoneMask}. Removes every non-digit (separators, spaces, dashes,
 * parens), leaving only the national-number digits. Use it to derive the
 * submitted/registered value from a masked display string.
 *
 * @note Pure.
 */
export default function removePhoneMask(value: string): string {
  return value.replace(/\D/g, "");
}
