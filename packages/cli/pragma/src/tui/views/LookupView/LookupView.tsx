import { Text } from "ink";
import chalk from "chalk";
import compactUri from "../../../domains/shared/compactUri.js";
import { PREFIX_MAP } from "../../../domains/shared/prefixes.js";
import { buildCard } from "../../components/Card/index.js";
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

  const cards = results.map((entity, i) => {
    const bodyLines: string[] = [];

    // 2 (left pad) + labelWidth + 2 (gap) = value column offset
    const valueIndent = " ".repeat(2 + labelWidth + 2);

    for (const field of options.fields) {
      const value = field.value(entity);
      if (isEmpty(value)) continue;
      const formatted = formatInlineValue(value, prefixes);
      const label = chalk.bold(field.label.padEnd(labelWidth));
      const lines = formatted.split("\n");
      bodyLines.push(`  ${label}  ${lines[0]}`);
      for (let l = 1; l < lines.length; l++) {
        bodyLines.push(`${valueIndent}${lines[l]}`);
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
    return buildCard(options.title(entity), domain, bodyLines, badge);
  });

  const errorLines =
    errors.length > 0
      ? [
          "",
          chalk.bold.red("Errors:"),
          ...errors.map((err) => chalk.red(`  • ${err.query}: ${err.message}`)),
        ]
      : [];

  const output = [...cards, ...errorLines].join("\n\n");
  return <Text>{output}</Text>;
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
        ? value
        : null;
    case "code":
      return typeof value === "string" && value.trim().length > 0
        ? value
        : null;
    case "list":
      if (!Array.isArray(value) || value.length === 0) return null;
      return value.map((item) => `• ${formatScalar(item, prefixes)}`).join("\n");
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

  const node = value as { root?: unknown; name?: string; uri?: string; children?: unknown };
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
