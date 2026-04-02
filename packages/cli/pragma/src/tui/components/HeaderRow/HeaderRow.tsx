import { Box, Text } from "ink";
import { COL_GAP } from "../../constants.js";
import { truncateText } from "../../helpers/index.js";
import type { HeaderRowProps } from "./types.js";

/**
 * Column header labels with a separator line below.
 *
 * Renders each column label in bold, padded to its computed width,
 * followed by a horizontal rule of `─` characters.
 */
export default function HeaderRow<T>({ columns, widths }: HeaderRowProps<T>) {
  const gap = " ".repeat(COL_GAP);

  const labels = columns
    .map((col, i) => {
      const w = widths[i] ?? col.label.length;
      return truncateText(col.label, w).padEnd(w);
    })
    .join(gap);

  const totalWidth =
    widths.reduce((sum, w) => sum + w, 0) + (widths.length - 1) * COL_GAP;
  const separator = "─".repeat(totalWidth);

  return (
    <Box flexDirection="column">
      <Text bold>{labels}</Text>
      <Text dimColor>{separator}</Text>
    </Box>
  );
}
