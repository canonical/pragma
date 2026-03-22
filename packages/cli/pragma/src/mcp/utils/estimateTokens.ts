/**
 * Estimate token count from text length using the ~4 chars/token heuristic.
 *
 * @param text - The text to estimate tokens for.
 * @returns A human-readable string like `"~250"`.
 */
export default function estimateTokens(text: string): string {
  return `~${Math.ceil(text.length / 4)}`;
}
