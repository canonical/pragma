/**
 * Estimate token count from text length using ~4 chars/token heuristic.
 */
export default function estimateTokens(text: string): string {
  return `~${Math.ceil(text.length / 4)}`;
}
