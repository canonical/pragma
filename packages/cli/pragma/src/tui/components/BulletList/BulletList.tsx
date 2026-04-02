import { Box, Text } from "ink";
import compactUri from "../../../domains/shared/compactUri.js";
import { PREFIX_MAP } from "../../../domains/shared/prefixes.js";
import type { BulletListProps } from "./types.js";

/**
 * A simple bulleted list with `•` prefix.
 *
 * Formats each item as a string, compacting URIs when detected.
 */
export default function BulletList({ items, prefixes }: BulletListProps) {
  const prefixMap = prefixes ?? PREFIX_MAP;

  return (
    <Box flexDirection="column" paddingLeft={2}>
      {items.map((item) => {
        const text = formatItem(item, prefixMap);
        return <Text key={text}>• {text}</Text>;
      })}
    </Box>
  );
}

function formatItem(
  value: unknown,
  prefixes: Readonly<Record<string, string>>,
): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      /^[a-z][a-z0-9+.-]*:/i.test(value)
    ) {
      return compactUri(value, prefixes);
    }
    return value;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(" | ");
  }
  return String(value);
}
