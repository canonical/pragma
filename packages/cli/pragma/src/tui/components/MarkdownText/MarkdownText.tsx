import { Box, Text } from "ink";
import { formatMarkdown } from "../../helpers/index.js";
import type { MarkdownTextProps } from "./types.js";

/**
 * Minimal Markdown-to-ANSI renderer for terminal display.
 *
 * Converts `**bold**` to chalk bold, `` `code` `` to dim, and
 * `- item` to bullet `•`. No heading parsing, no link rendering.
 */
export default function MarkdownText({ content }: MarkdownTextProps) {
  const formatted = formatMarkdown(content);

  return (
    <Box paddingLeft={2}>
      <Text>{formatted}</Text>
    </Box>
  );
}
