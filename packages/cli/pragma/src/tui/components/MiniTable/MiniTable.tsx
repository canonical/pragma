import { Box, Text } from "ink";
import compactUri from "../../../domains/shared/compactUri.js";
import { PREFIX_MAP } from "../../../domains/shared/prefixes.js";
import type { MiniTableProps } from "./types.js";

/**
 * A compact aligned table for key-value or multi-column data.
 *
 * Renders each entry as a row with values aligned by computing
 * the maximum width of each key across all entries.
 */
export default function MiniTable({ data, prefixes }: MiniTableProps) {
  const prefixMap = prefixes ?? PREFIX_MAP;

  if (data.length === 0) return null;

  const allKeys = collectKeys(data);
  const widths = computeKeyWidths(data, allKeys, prefixMap);

  return (
    <Box flexDirection="column" paddingLeft={2}>
      {data.map((entry, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static table rows
        <Text key={i}>
          {allKeys
            .map((key) => {
              const value = formatValue(entry[key], prefixMap);
              const w = widths.get(key) ?? value.length;
              return value.padEnd(w);
            })
            .join("  ")}
        </Text>
      ))}
    </Box>
  );
}

function collectKeys(data: readonly Record<string, unknown>[]): string[] {
  const seen = new Set<string>();
  for (const entry of data) {
    for (const key of Object.keys(entry)) {
      seen.add(key);
    }
  }
  return [...seen];
}

function computeKeyWidths(
  data: readonly Record<string, unknown>[],
  keys: string[],
  prefixes: Readonly<Record<string, string>>,
): Map<string, number> {
  const widths = new Map<string, number>();
  for (const key of keys) {
    let max = 0;
    for (const entry of data) {
      const formatted = formatValue(entry[key], prefixes);
      max = Math.max(max, formatted.length);
    }
    widths.set(key, max);
  }
  return widths;
}

function formatValue(
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
  if (Array.isArray(value)) return value.map(String).join(", ");
  return String(value);
}
