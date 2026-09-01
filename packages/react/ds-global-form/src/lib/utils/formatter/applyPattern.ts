/**
 * Group a run of digits according to a display pattern (cosmetic only).
 *
 * The pattern uses `#` as a digit slot; any other character is a literal
 * separator emitted between digits (e.g. `"(###) ###-####"`). Non-digits in
 * `value` are stripped first, so the result is purely a function of the digits
 * given. Extra digits beyond the pattern's slots are appended unformatted, so a
 * longer-than-typical value is never truncated. With no pattern, the digits are
 * returned as they are.
 *
 * This is display-only — callers keep the digits as the source of truth and
 * recover them with {@link stripToDigits}.
 *
 * @note Pure.
 */
export default function applyPattern(value: string, pattern?: string): string {
  const digits = value.replace(/\D/g, "");
  if (!pattern) return digits;

  let out = "";
  let taken = 0;
  for (const char of pattern) {
    if (taken >= digits.length) break;
    if (char === "#") {
      // `slice` rather than an index: it yields a string, not a value the type
      // system claims is always present (see cs:code.array.safe_access).
      out += digits.slice(taken, taken + 1);
      taken += 1;
    } else {
      out += char;
    }
  }
  // Any digits beyond the pattern's slots are appended raw (never dropped).
  return out + digits.slice(taken);
}
