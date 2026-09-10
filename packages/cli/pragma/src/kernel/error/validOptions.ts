/**
 * Naming a filter's admissible values without printing a catalogue.
 *
 * Shared by the error renderers and by the filter layer that builds a recovery
 * message, so one mistyped value cannot be described at two different lengths
 * depending on which line the reader happens to see.
 */

/**
 * How many valid options a rendered error names before it stops listing them.
 *
 * Taken from the real vocabularies rather than picked round: the largest a
 * reader can usefully scan is the coordinate set at 36, so every filter at or
 * below this cap still renders in full. Above it sit the vocabularies that are
 * catalogues rather than choices — variables at 1,156, symbols at 745, blocks
 * at 252 — and naming those turned one mistyped filter value into roughly 90KB
 * of terminal output, or an MCP response large enough to threaten its own
 * payload budget. The JSON error envelope still carries every option, so a
 * machine consumer loses nothing.
 */
export const MAX_LISTED_OPTIONS = 40;

/**
 * Render an admissible-value list, naming at most {@link MAX_LISTED_OPTIONS}.
 *
 * The count of what is withheld is the useful part of a long vocabulary: it
 * tells the reader this is a catalogue to list, not a choice to read.
 *
 * @param options - Every accepted value, in the order the caller supplies.
 * @param prefix - How the line introduces the values.
 * @returns One line, with no trailing newline and no full stop.
 */
export function formatValidOptions(
  options: readonly string[],
  prefix = "Valid options",
): string {
  if (options.length <= MAX_LISTED_OPTIONS) {
    return `${prefix}: ${options.join(", ")}`;
  }
  const shown = options.slice(0, MAX_LISTED_OPTIONS).join(", ");
  const rest = options.length - MAX_LISTED_OPTIONS;
  return `${prefix} (${options.length}), first ${MAX_LISTED_OPTIONS}: ${shown}, and ${rest} more`;
}
