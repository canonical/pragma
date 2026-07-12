import type { ToolResult } from "../ToolSpec.js";

/**
 * Wrap condensed Markdown text in the MCP condensed tool envelope.
 *
 * The token figure is the shared chars/4 heuristic — the single estimator
 * for every read tool, replacing the per-spec inline copies.
 */
export default function condense(text: string): ToolResult {
  return {
    condensed: true,
    text,
    tokens: `~${Math.ceil(text.length / 4)}`,
  };
}
