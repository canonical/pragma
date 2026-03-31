/**
 * Truncate a string to fit within a maximum width, appending an ellipsis
 * when the string exceeds the limit.
 *
 * Returns the original string unchanged if it fits. Otherwise, trims to
 * `maxWidth - 1` characters and appends `…`.
 */
export default function truncateText(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) return text;
  if (maxWidth <= 1) return "…";
  return `${text.slice(0, maxWidth - 1)}…`;
}
