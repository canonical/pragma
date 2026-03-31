import chalk from "chalk";
import compactUri from "../../../domains/shared/compactUri.js";
import { PREFIX_MAP } from "../../../domains/shared/prefixes.js";
import { buildCard } from "../../components/Card/index.js";
import { formatMarkdown, syntaxColor } from "../../helpers/index.js";
import type { LookupViewProps } from "./types.js";

/**
 * A stacked card view for lookup commands.
 *
 * Renders each lookup result as a bordered card with field rows
 * and sections. Multiple results show a `[N of M]` badge in each
 * card header. Errors are appended after all cards. Output is built
 * as a chalk-styled string inside a single `<Text>` element.
 */
export default function LookupView<T>({
  results,
  errors,
  options,
  domain,
}: LookupViewProps<T>) {
  const prefixes = options.prefixes ?? PREFIX_MAP;
  const total = results.length;
  const labelWidth = computeLabelWidth(options.fields);
  const termWidth = process.stdout.columns ?? 80;

  const cards = results.map((entity, i) => {
    const bodyLines: string[] = [];

    // 2 (left pad) + labelWidth + 2 (gap) = value column offset
    const valueOffset = 2 + labelWidth + 2;
    const valueIndent = " ".repeat(valueOffset);
    const innerWidth = Math.max(termWidth - 4, 20);
    const maxValueWidth = innerWidth - valueOffset;

    for (const field of options.fields) {
      const value = field.value(entity);
      if (isEmpty(value)) continue;
      const raw = formatInlineValue(value, prefixes);
      const formatted = typeof value === "string" ? formatMarkdown(raw) : raw;
      const label = chalk.bold(field.label.padEnd(labelWidth));
      const wrapped = wrapText(formatted, maxValueWidth);
      bodyLines.push(`  ${label}  ${wrapped[0]}`);
      for (let l = 1; l < wrapped.length; l++) {
        bodyLines.push(`${valueIndent}${wrapped[l]}`);
      }
    }

    for (const section of options.sections) {
      const value = entity[section.key];
      if (!section.showWhenEmpty && isEmpty(value)) continue;

      const sectionBody = formatSectionValue(value, section.kind, prefixes);
      if (!sectionBody) continue;

      bodyLines.push("");
      bodyLines.push(`  ${chalk.bold(section.heading)}`);
      for (const line of sectionBody.split("\n")) {
        bodyLines.push(`  ${line}`);
      }
    }

    const badge = total > 1 ? `[${i + 1} of ${total}]` : undefined;
    return buildCard(
      options.title(entity),
      domain,
      bodyLines,
      termWidth,
      badge,
    );
  });

  const errorLines =
    errors.length > 0
      ? [
          "",
          chalk.bold.red("Errors:"),
          ...errors.map((err) => chalk.red(`  • ${err.query}: ${err.message}`)),
        ]
      : [];

  return [...cards, ...errorLines].join("\n\n");
}

function computeLabelWidth<T>(
  fields: readonly { label: string; value: (entity: T) => unknown }[],
): number {
  return fields.reduce((max, f) => Math.max(max, f.label.length), 0);
}

function formatInlineValue(
  value: unknown,
  prefixes: Readonly<Record<string, string>>,
): string {
  if (Array.isArray(value)) {
    return value.map((entry) => formatInlineValue(entry, prefixes)).join(", ");
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => !isEmpty(v))
      .map(([k, v]) => `${k}=${formatInlineValue(v, prefixes)}`)
      .join("; ");
  }
  return formatScalar(value, prefixes);
}

function formatScalar(
  value: unknown,
  prefixes: Readonly<Record<string, string>>,
): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    if (looksLikeUri(value)) return compactUri(value, prefixes);
    return value;
  }
  return String(value);
}

function formatSectionValue(
  value: unknown,
  kind: string,
  prefixes: Readonly<Record<string, string>>,
): string | null {
  switch (kind) {
    case "field":
      return typeof value === "string" && value.trim().length > 0
        ? formatMarkdown(value)
        : null;
    case "code":
      return typeof value === "string" && value.trim().length > 0
        ? syntaxColor(value, "yaml")
        : null;
    case "list":
      if (!Array.isArray(value) || value.length === 0) return null;
      return value
        .map((item) => `• ${formatScalar(item, prefixes)}`)
        .join("\n");
    case "table":
    case "nested-table":
      if (!Array.isArray(value) || value.length === 0) return null;
      return value
        .map((entry) => {
          if (typeof entry === "object" && entry !== null) {
            return Object.entries(entry as Record<string, unknown>)
              .filter(([, v]) => !isEmpty(v))
              .map(([k, v]) => `${k}: ${formatScalar(v, prefixes)}`)
              .join("  ");
          }
          return formatScalar(entry, prefixes);
        })
        .join("\n");
    case "tree":
      return formatTree(value, prefixes);
    default:
      return null;
  }
}

function formatTree(
  value: unknown,
  prefixes: Readonly<Record<string, string>>,
  depth = 0,
): string | null {
  if (Array.isArray(value)) {
    const lines = value
      .map((entry) => formatTree(entry, prefixes, depth))
      .filter(Boolean);
    return lines.length > 0 ? lines.join("\n") : null;
  }

  if (!value || typeof value !== "object") {
    return typeof value === "string" && value.length > 0
      ? `${"  ".repeat(depth)}├─ ${formatScalar(value, prefixes)}`
      : null;
  }

  const node = value as {
    root?: unknown;
    name?: string;
    uri?: string;
    children?: unknown;
  };
  if (node.root) return formatTree(node.root, prefixes, depth);

  const label =
    node.name && node.name.length > 0
      ? node.name
      : node.uri
        ? compactUri(node.uri, prefixes)
        : "item";

  const prefix = depth > 0 ? "├─ " : "";
  const lines = [`${"  ".repeat(depth)}${prefix}${label}`];
  if (Array.isArray(node.children)) {
    const childResult = formatTree(node.children, prefixes, depth + 1);
    if (childResult) lines.push(childResult);
  }
  return lines.join("\n");
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function looksLikeUri(value: string): boolean {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    /^[a-z][a-z0-9+.-]*:/i.test(value)
  );
}

/**
 * Wrap text at word boundaries to fit within maxWidth.
 * Splits on existing newlines first, then wraps each segment.
 */
function wrapText(text: string, maxWidth: number): string[] {
  const segments = text.split("\n");
  return segments.flatMap((segment) => wrapSegment(segment, maxWidth));
}

function wrapSegment(text: string, maxWidth: number): string[] {
  if (text.length <= maxWidth) return [text];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (candidate.length > maxWidth && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) lines.push(current);

  return lines;
}
