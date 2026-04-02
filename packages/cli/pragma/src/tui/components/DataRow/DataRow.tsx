import { Text } from "ink";
import compactUri from "../../../domains/shared/compactUri.js";
import { PREFIX_MAP } from "../../../domains/shared/prefixes.js";
import { COL_GAP, DOMAIN_COLORS } from "../../constants.js";
import { truncateText } from "../../helpers/index.js";
import type { DataRowProps } from "./types.js";

/**
 * A single data row in the list view table.
 *
 * Formats each column value, truncates to fit the computed width,
 * and applies domain-aware coloring: IRI columns render dim,
 * name columns render in the domain's instance color.
 */
export default function DataRow<T>({
  item,
  columns,
  widths,
  prefixes,
  domain,
}: DataRowProps<T>) {
  const prefixMap = prefixes ?? PREFIX_MAP;
  const gap = " ".repeat(COL_GAP);
  const colors = DOMAIN_COLORS[domain];

  const cells = columns.map((col, i) => {
    const w = widths[i] ?? 20;
    const raw = item[col.key];
    const formatted = formatCellValue(raw, col, prefixMap);
    const truncated = truncateText(formatted, w).padEnd(w);

    if (col.key === "uri") {
      return (
        <Text key={col.key} dimColor>
          {truncated}
        </Text>
      );
    }
    if (col.key === "name" && colors) {
      return (
        <Text key={col.key} color={colors.instanceFg}>
          {truncated}
        </Text>
      );
    }
    return <Text key={col.key}>{truncated}</Text>;
  });

  return (
    <Text>
      {cells.map((cell, i) => (
        <Text key={columns[i]?.key ?? i}>
          {i > 0 ? gap : ""}
          {cell}
        </Text>
      ))}
    </Text>
  );
}

function formatCellValue(
  raw: unknown,
  col: { format?: (value: unknown) => string },
  prefixes: Readonly<Record<string, string>>,
): string {
  if (col.format) return col.format(raw);
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "string" && looksLikeUri(raw))
    return compactUri(raw, prefixes);
  if (Array.isArray(raw)) return raw.map(String).join(", ");
  return String(raw);
}

function looksLikeUri(value: string): boolean {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    /^[a-z][a-z0-9+.-]*:/i.test(value)
  );
}
