/**
 * Apply a national-number display mask to a raw value (cosmetic only).
 *
 * The mask uses `#` as a digit slot; any other character is a literal separator
 * emitted between digits (e.g. `"(###) ###-####"`). Non-digits in `value` are
 * stripped first, so the result is purely a function of the typed digits. Extra
 * digits beyond the mask length are appended unformatted (so longer-than-typical
 * numbers are never truncated). With no mask, the raw digits are returned.
 *
 * This is display-only — callers keep the raw digits as the source of truth.
 * @note Pure.
 */
export default function applyPhoneMask(value: string, format?: string): string {
  const digits = value.replace(/\D/g, "");
  if (!format) return digits;

  let out = "";
  let d = 0;
  for (const char of format) {
    if (d >= digits.length) break;
    if (char === "#") {
      out += digits[d];
      d += 1;
    } else {
      out += char;
    }
  }
  // Any digits beyond the mask's slots are appended raw (never dropped).
  if (d < digits.length) out += digits.slice(d);
  return out;
}
