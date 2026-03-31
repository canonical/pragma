import { Text } from "ink";
import chalk from "chalk";
import compactUri from "../../../domains/shared/compactUri.js";
import { PREFIX_MAP } from "../../../domains/shared/prefixes.js";
import { COL_GAP, DOMAIN_COLORS } from "../../constants.js";
import {
  computeWidths,
  fitColumns,
  truncateText,
} from "../../helpers/index.js";
import { useTerminalSize } from "../../hooks/index.js";
import type { ListViewProps } from "./types.js";

/**
 * A responsive table view for list commands.
 *
 * Renders all items of a domain (block, token, modifier, etc.) as a
 * tabular display with column headers, proportional widths, and
 * domain-aware coloring. Columns drop right-to-left when the terminal
 * is too narrow. Output is built as a chalk-styled string inside a
 * single `<Text>` element to avoid Ink's flex-column spacing.
 */
export default function ListView<T>({
  heading,
  domain,
  items,
  columns,
  prefixes,
}: ListViewProps<T>) {
  const { columns: termWidth } = useTerminalSize();
  const prefixMap = prefixes ?? PREFIX_MAP;

  const visibleColumns = fitColumns(columns, termWidth);
  const widths = computeWidths(visibleColumns, items, termWidth);
  const colors = DOMAIN_COLORS[domain];
  const gap = " ".repeat(COL_GAP);
  const colorFn = resolveChalkColor(colors?.instanceFg);

  const headingLine = chalk.bold(
    colorFn(`${heading} (${items.length})`),
  );

  const headerLine = chalk.bold(
    visibleColumns
      .map((col, i) => {
        const w = widths[i] ?? col.label.length;
        return truncateText(col.label, w).padEnd(w);
      })
      .join(gap),
  );

  const totalWidth =
    widths.reduce((sum, w) => sum + w, 0) + (widths.length - 1) * COL_GAP;
  const separator = chalk.dim("─".repeat(totalWidth));

  const dataLines = items.map((item) =>
    visibleColumns
      .map((col, i) => {
        const w = widths[i] ?? 20;
        const raw = (item as Record<string, unknown>)[col.key];
        const formatted = formatCellValue(raw, col, prefixMap);
        const padded = truncateText(formatted, w).padEnd(w);

        if (col.key === "uri") return chalk.dim(padded);
        if (col.key === "name") return colorFn(padded);
        return padded;
      })
      .join(gap),
  );

  const output = [headingLine, headerLine, separator, ...dataLines].join("\n");
  return <Text>{output}</Text>;
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

function resolveChalkColor(
  colorName: string | undefined,
): (text: string) => string {
  if (!colorName) return (text) => text;
  const fn = chalk[colorName as keyof typeof chalk];
  return typeof fn === "function" ? (fn as (text: string) => string) : (text) => text;
}
