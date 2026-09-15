/** A character outside ASCII: the only text the full fold can change beyond lowercasing. */
const NON_ASCII = /[\u0080-\u{10FFFF}]/u;

/**
 * Fold text for a case-insensitive comparison, the same in every runtime and
 * for every viewer:
 *
 * 1. normalised to NFC, so a precomposed and a decomposed accent start as
 *    the same text — defensive: step 4 alone reaches the same result, so no
 *    fixture can observe it, and it keeps each later step from depending on
 *    composed input;
 * 2. lowercased without a locale;
 * 3. final sigma `ς` read as `σ`, since lowercasing picks the final form by
 *    where the letter falls in its word, and a word's start must still be
 *    found inside a longer word;
 * 4. normalised to NFC again, since a lowercase letter may compose where its
 *    uppercase could not (`T̈` lowercases to `ẗ`).
 *
 * ASCII text is only lowercased: NFC leaves it as it is, it lowercases to
 * ASCII, and it holds no sigma, so the result is the same at a fraction of
 * the cost of folding every value of every row.
 *
 * Lowercasing is one character to one or more; nothing expands a letter into
 * a sequence it might be spelled as, so `ß` and `ss` stay different.
 */
export default function foldText(text: string): string {
  if (!NON_ASCII.test(text)) {
    return text.toLowerCase();
  }
  return text
    .normalize("NFC")
    .toLowerCase()
    .replaceAll("ς", "σ")
    .normalize("NFC");
}
