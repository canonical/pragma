/**
 * Generic list and lookup renderers for CLI and LLM output modes.
 *
 * All domain formatters delegate to these pure, layout-only functions.
 * Each renderer accepts a typed options bag (defined in contracts.ts)
 * and returns a fully formatted string — no I/O, no side effects.
 */

import compactUri from "./compactUri.js";
import type {
  ColumnDef,
  LookupField,
  LookupSectionOverride,
  RenderListOptions,
  RenderLookupOptions,
  SectionDef,
} from "./contracts.js";
import { PREFIX_MAP } from "./prefixes.js";

type RenderMode = "plain" | "llm";

export function renderListPlain<T>(
  items: readonly T[],
  options: RenderListOptions<T>,
): string {
  const prefixes = options.prefixes ?? PREFIX_MAP;
  const rows = items.map((item) =>
    options.columns
      .map((column) => ({
        column,
        value: formatColumnValue(item, column, prefixes),
      }))
      .filter(({ column, value }) => shouldRenderColumn(column, value))
      .map(({ value }) => value),
  );

  const widths = rows.reduce<number[]>(
    (acc, row) =>
      row.map((value, index) => Math.max(acc[index] ?? 0, value.length)),
    [],
  );

  return rows
    .map((row) =>
      row
        .map((value, index) => value.padEnd(widths[index] ?? value.length))
        .join("  ")
        .trimEnd(),
    )
    .join("\n");
}

export function renderListLlm<T>(
  items: readonly T[],
  options: RenderListOptions<T>,
): string {
  const prefixes = options.prefixes ?? PREFIX_MAP;
  const lines = [`## ${options.heading} (${items.length})`, ""];

  for (const item of items) {
    const values = options.columns
      .map((column) => ({
        column,
        value: formatColumnValue(item, column, prefixes),
      }))
      .filter(({ column, value }) => shouldRenderColumn(column, value));

    const iri = values.find(({ column }) => column.key === "uri")?.value;
    const name = values.find(({ column }) => column.key === "name")?.value;
    const rest = values
      .filter(({ column }) => column.key !== "uri" && column.key !== "name")
      .map(({ value }) => value)
      .filter(Boolean);

    const parts: string[] = [];
    if (iri) parts.push(`\`${iri}\``);
    if (name) {
      parts.push(iri ? `— **${name}**` : `**${name}**`);
    }
    if (rest.length > 0) {
      parts.push(rest.join(" | "));
    }

    lines.push(`- ${parts.join(" ")}`.trimEnd());
  }

  return lines.join("\n");
}

export function renderLookupPlain<T>(
  entity: T,
  options: RenderLookupOptions<T>,
): string {
  return renderLookup(entity, options, "plain");
}

export function renderLookupLlm<T>(
  entity: T,
  options: RenderLookupOptions<T>,
): string {
  return renderLookup(entity, options, "llm");
}

function renderLookup<T>(
  entity: T,
  options: RenderLookupOptions<T>,
  mode: RenderMode,
): string {
  const title = options.title(entity);
  const fields = renderLookupFields(entity, options, mode);
  const sections = renderLookupSections(entity, options, mode);

  if (mode === "llm") {
    return [`## ${title}`, "", ...fields, ...sections].join("\n").trimEnd();
  }

  const headingRule = "═".repeat(Math.max(title.length, 24));
  return [title, headingRule, "", ...fields, ...sections].join("\n").trimEnd();
}

function renderLookupFields<T>(
  entity: T,
  options: RenderLookupOptions<T>,
  mode: RenderMode,
): string[] {
  const prefixes = options.prefixes ?? PREFIX_MAP;
  return options.fields.flatMap((field) => {
    const value = field.value(entity);
    if (isEmptyValue(value)) {
      return [];
    }

    const formatted = formatInlineValue(value, prefixes);
    return mode === "llm"
      ? [`- ${field.label}: ${formatted}`]
      : [`  ${field.label}: ${formatted}`];
  });
}

function renderLookupSections<T>(
  entity: T,
  options: RenderLookupOptions<T>,
  mode: RenderMode,
): string[] {
  const sections: string[] = [];

  for (const section of options.sections) {
    const value = entity[section.key];
    if (!section.showWhenEmpty && isEmptyValue(value)) {
      continue;
    }

    const override = options.sectionOverrides?.[section.key]?.[mode];
    const body = override
      ? override(entity, section)
      : renderSectionValue(value, section, options, mode);

    if (!body) {
      continue;
    }

    sections.push("");
    sections.push(
      mode === "llm" ? `### ${section.heading}` : `${section.heading}:`,
    );
    sections.push(body);
  }

  return sections;
}

function renderSectionValue<T>(
  value: unknown,
  section: SectionDef<T>,
  options: RenderLookupOptions<T>,
  mode: RenderMode,
): string | null {
  const prefixes = options.prefixes ?? PREFIX_MAP;

  switch (section.kind) {
    case "field":
      return renderFieldValue(value, prefixes, mode);
    case "code":
      return renderCodeValue(value, section, options, mode);
    case "list":
    case "table":
    case "nested-table":
      return renderCollectionValue(value, prefixes, mode);
    case "tree":
      return renderTreeValue(value, prefixes, mode);
    default:
      return null;
  }
}

function renderFieldValue(
  value: unknown,
  prefixes: Readonly<Record<string, string>>,
  mode: RenderMode,
): string | null {
  if (isEmptyValue(value)) {
    return null;
  }

  const text = formatScalarValue(value, prefixes);
  return mode === "llm" ? text : indentBlock(text);
}

function renderCodeValue<T>(
  value: unknown,
  section: SectionDef<T>,
  options: RenderLookupOptions<T>,
  mode: RenderMode,
): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const language =
    options.codeLanguage?.(section, value) ?? inferCodeLanguage(value);
  if (mode === "llm") {
    return [`\`\`\`${language}`, value, "```"].join("\n");
  }

  const header = language === "text" ? "" : `[${language}]\n`;
  return indentBlock(`${header}${value}`.trimEnd());
}

function renderCollectionValue(
  value: unknown,
  prefixes: Readonly<Record<string, string>>,
  mode: RenderMode,
): string | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const lines = value.map(
    (entry) => `- ${formatCollectionEntry(entry, prefixes)}`,
  );
  return mode === "llm" ? lines.join("\n") : indentBlock(lines.join("\n"));
}

function renderTreeValue(
  value: unknown,
  prefixes: Readonly<Record<string, string>>,
  mode: RenderMode,
): string | null {
  const lines = buildTreeLines(value, prefixes);
  if (lines.length === 0) {
    return null;
  }

  return mode === "llm" ? lines.join("\n") : indentBlock(lines.join("\n"));
}

function buildTreeLines(
  value: unknown,
  prefixes: Readonly<Record<string, string>>,
  depth = 0,
): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => buildTreeLines(entry, prefixes, depth));
  }

  if (!value || typeof value !== "object") {
    return typeof value === "string" && value.length > 0
      ? [`${"  ".repeat(depth)}- ${formatScalarValue(value, prefixes)}`]
      : [];
  }

  const rootedTree = value as { root?: unknown };
  if (rootedTree.root) {
    return buildTreeLines(rootedTree.root, prefixes, depth);
  }

  const treeNode = value as {
    name?: unknown;
    uri?: unknown;
    children?: unknown;
  };
  const label =
    typeof treeNode.name === "string" && treeNode.name.length > 0
      ? treeNode.name
      : typeof treeNode.uri === "string"
        ? compactUri(treeNode.uri, prefixes)
        : "item";

  const lines = [`${"  ".repeat(depth)}- ${label}`];
  if (Array.isArray(treeNode.children)) {
    lines.push(...buildTreeLines(treeNode.children, prefixes, depth + 1));
  }
  return lines;
}

function formatCollectionEntry(
  value: unknown,
  prefixes: Readonly<Record<string, string>>,
): string {
  if (!value || typeof value !== "object") {
    return formatScalarValue(value, prefixes);
  }

  const object = value as Record<string, unknown>;
  return Object.entries(object)
    .filter(([, entryValue]) => !isEmptyValue(entryValue))
    .map(
      ([key, entryValue]) =>
        `${key}: ${formatInlineValue(entryValue, prefixes)}`,
    )
    .join(" | ");
}

function formatColumnValue<T>(
  item: T,
  column: ColumnDef<T>,
  prefixes: Readonly<Record<string, string>>,
): string {
  const raw = item[column.key];
  if (column.format) {
    return column.format(raw);
  }

  return formatInlineValue(raw, prefixes);
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
      .filter(([, entryValue]) => !isEmptyValue(entryValue))
      .map(
        ([key, entryValue]) =>
          `${key}=${formatInlineValue(entryValue, prefixes)}`,
      )
      .join("; ");
  }

  return formatScalarValue(value, prefixes);
}

function formatScalarValue(
  value: unknown,
  prefixes: Readonly<Record<string, string>>,
): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return looksLikeUri(value) ? compactUri(value, prefixes) : value;
  }

  return String(value);
}

function shouldRenderColumn<T>(column: ColumnDef<T>, value: string): boolean {
  if (value.length > 0) {
    return true;
  }

  return column.showWhenEmpty === true;
}

function inferCodeLanguage(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("@prefix") || trimmed.includes(" a ")) {
    return "ttl";
  }
  if (trimmed.includes(":") && trimmed.includes("\n")) {
    return "yaml";
  }
  return "text";
}

function looksLikeUri(value: string): boolean {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    /^[a-z][a-z0-9+.-]*:/i.test(value)
  );
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}

function indentBlock(value: string, spaces = 2): string {
  const indent = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => `${indent}${line}`)
    .join("\n");
}
