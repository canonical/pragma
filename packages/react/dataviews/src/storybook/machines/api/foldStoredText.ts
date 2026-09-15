/**
 * Fold text as the mock backend compares it: the same fold core's `contains`
 * uses — normalised to NFC, lowercased without a locale, final sigma read as
 * sigma, and normalised to NFC again — kept here because core's is internal.
 * The shared fixture table checks that the two agree.
 */
export default function foldStoredText(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replaceAll("ς", "σ")
    .normalize("NFC");
}
