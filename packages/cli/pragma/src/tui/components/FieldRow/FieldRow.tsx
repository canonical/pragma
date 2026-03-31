import { Box, Text } from "ink";
import type { FieldRowProps } from "./types.js";

/**
 * A label-value pair rendered as a single row in a lookup card.
 *
 * The label is bold and padded to a fixed width so that values
 * align vertically across multiple field rows.
 */
export default function FieldRow({
  label,
  value,
  labelWidth,
  valueColor,
}: FieldRowProps) {
  const paddedLabel = label.padEnd(labelWidth);

  return (
    <Box>
      <Text bold>{`  ${paddedLabel}`}</Text>
      <Text color={valueColor}>{` ${value}`}</Text>
    </Box>
  );
}
