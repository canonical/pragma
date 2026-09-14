/** The UTF-16 units of "0" and "9". */
const ZERO = 0x30;
const NINE = 0x39;

/** The UTF-16 surrogates, the only units whose order and code-point order part. */
const FIRST_SURROGATE = 0xd800;
const LAST_SURROGATE = 0xdfff;

/** The last unit that opens a surrogate pair. */
const LAST_HIGH_SURROGATE = 0xdbff;

/** Whether the unit at `at` is an ASCII digit. */
const isDigitAt = (text: string, at: number): boolean => {
  const unit = text.charCodeAt(at);
  return unit >= ZERO && unit <= NINE;
};

/** Whether a UTF-16 unit is half of a surrogate pair. */
const isSurrogate = (unit: number): boolean =>
  unit >= FIRST_SURROGATE && unit <= LAST_SURROGATE;

/** Whether a UTF-16 unit opens a surrogate pair. */
const isHighSurrogate = (unit: number): boolean =>
  unit >= FIRST_SURROGATE && unit <= LAST_HIGH_SURROGATE;

/** Where the digit run starting at `start` ends: the first unit that is not a digit. */
const findDigitRunEnd = (text: string, start: number): number => {
  let end = start + 1;
  while (end < text.length && isDigitAt(text, end)) {
    end += 1;
  }
  return end;
};

/** Where a digit run's value begins: past its leading zeros. */
const skipLeadingZeros = (text: string, start: number, end: number): number => {
  let at = start;
  while (at < end && text.charCodeAt(at) === ZERO) {
    at += 1;
  }
  return at;
};

/** Order two digit sequences of one length by the number they spell. */
const compareDigits = (
  a: string,
  aStart: number,
  b: string,
  bStart: number,
  length: number,
): number => {
  for (let offset = 0; offset < length; offset += 1) {
    const order = a.charCodeAt(aStart + offset) - b.charCodeAt(bStart + offset);
    if (order !== 0) {
      return Math.sign(order);
    }
  }
  return 0;
};

/**
 * Order two units that differ by the code points they begin. Unit order is
 * code-point order except where a surrogate meets a unit from U+E000 to
 * U+FFFF, so the code points are read only when a surrogate is involved.
 */
const compareDifferingUnits = (
  a: string,
  aAt: number,
  b: string,
  bAt: number,
): number => {
  // Differing just past a high half both strings share: the pairs decide, so
  // a low half is never ordered on its own, and malformed text still sorts
  // one way. Before a string's start the unit is NaN, which no range holds.
  if (isHighSurrogate(a.charCodeAt(aAt - 1))) {
    const aPair = a.codePointAt(aAt - 1) as number; // defined: aAt - 1 >= 0
    const bPair = b.codePointAt(bAt - 1) as number; // defined: the units before matched
    if (aPair !== bPair) {
      return Math.sign(aPair - bPair);
    }
  }
  const aUnit = a.charCodeAt(aAt);
  const bUnit = b.charCodeAt(bAt);
  if (!(isSurrogate(aUnit) || isSurrogate(bUnit))) {
    return Math.sign(aUnit - bUnit);
  }
  const aPoint = a.codePointAt(aAt) as number; // defined: aAt < a.length
  const bPoint = b.codePointAt(bAt) as number; // defined: bAt < b.length
  return Math.sign(aPoint - bPoint);
};

/**
 * Order two strings as numeric collation does for their digits, without
 * locale data: each string is read as runs of digits and runs of other
 * characters, a digit run compares by the number it spells and any other run
 * by code point, so `item2` orders before `item10`.
 *
 * It keeps numeric order and nothing else a locale would: case and accents
 * order by code point. A digit run compares at any length — leading zeros
 * dropped, a longer run the larger number — and is never read as a
 * floating-point number, so no precision is lost. A string with fewer runs
 * orders first where the runs it has tie, and strings the runs leave equal —
 * `a02` and `a2` — compare as whole strings, differing only in zeros, so the order stays
 * total and one list sorts one way whatever order it arrives in.
 *
 * It reads both strings in place, allocating nothing, and reads a run of
 * other text only to its first difference, because a sort calls it for
 * every comparison.
 */
export default function compareDigitRuns(a: string, b: string): number {
  // Equal strings tie at once: a column of few distinct values is mostly
  // ties, and scanning them run by run would only confirm it.
  if (a === b) {
    return 0;
  }
  let aAt = 0;
  let bAt = 0;
  // Whether the walk is inside two equal runs of other text, past their
  // first character: a digit on one side then ends the shorter run.
  let inText = false;
  while (aAt < a.length && bAt < b.length) {
    const aDigit = isDigitAt(a, aAt);
    const bDigit = isDigitAt(b, bAt);
    if (aDigit && bDigit) {
      const aEnd = findDigitRunEnd(a, aAt);
      const bEnd = findDigitRunEnd(b, bAt);
      const aValue = skipLeadingZeros(a, aAt, aEnd);
      const bValue = skipLeadingZeros(b, bAt, bEnd);
      const order =
        Math.sign(aEnd - aValue - (bEnd - bValue)) ||
        compareDigits(a, aValue, b, bValue, aEnd - aValue);
      if (order !== 0) {
        return order;
      }
      aAt = aEnd;
      bAt = bEnd;
      continue;
    }
    if (inText && aDigit !== bDigit) {
      // One run of other text ended where the other goes on: it is the
      // shorter, and a prefix orders first.
      return aDigit ? -1 : 1;
    }
    if (a.charCodeAt(aAt) !== b.charCodeAt(bAt)) {
      return compareDifferingUnits(a, aAt, b, bAt);
    }
    aAt += 1;
    bAt += 1;
    inText = true;
  }
  if (aAt < a.length) {
    return 1;
  }
  // Runs left equal differ only in leading zeros, where code unit and code
  // point agree: the whole strings decide by unit.
  return bAt < b.length ? -1 : a < b ? -1 : 1;
}
