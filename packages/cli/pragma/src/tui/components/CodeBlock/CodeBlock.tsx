import { Box, Text } from "ink";
import { BOX } from "../../constants.js";
import { syntaxColor } from "../../helpers/index.js";
import { useTerminalSize } from "../../hooks/index.js";
import type { CodeBlockProps } from "./types.js";

/**
 * A bordered code block with lightweight syntax coloring.
 *
 * Renders code inside a single-line bordered sub-box using thin
 * box-drawing characters. Applies keyword-level colorization via
 * the syntaxColor helper.
 */
export default function CodeBlock({ code, language }: CodeBlockProps) {
  const { columns: termWidth } = useTerminalSize();
  const innerWidth = Math.max(termWidth - 8, 20);

  const colored = syntaxColor(code, language);
  const lines = colored.split("\n");

  const topBorder = `  ${BOX.thinVertical === "│" ? "┌" : BOX.thinVertical}${"─".repeat(innerWidth)}${"┐"}`;
  const bottomBorder = `  ${"└"}${"─".repeat(innerWidth)}${"┘"}`;

  return (
    <Box flexDirection="column">
      <Text dimColor>{topBorder}</Text>
      {lines.map((line, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static code lines
        <Text key={i}>
          {"  │ "}
          {line}
        </Text>
      ))}
      <Text dimColor>{bottomBorder}</Text>
    </Box>
  );
}
