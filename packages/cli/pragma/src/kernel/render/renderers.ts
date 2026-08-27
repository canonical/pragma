/**
 * Generic list and lookup renderers for the plain and llm output modes.
 *
 * Domain formatters delegate to these pure, layout-only functions: each takes
 * a typed options bag (see {@link contracts}) and returns a fully formatted
 * string — no I/O, no side effects. The single-field record collapse and
 * URI-compaction behaviour are ported verbatim from the v1 renderers.
 */

import { compactUri } from "./compactUri.js";
import type {
  ColumnDef,
  RenderContext,
  RenderListOptions,
  RenderLookupOptions,
  SectionDef,
} from "./contracts.js";
import { DEFAULT_PREFIX_MAP } from "./prefixes.js";
import { defaultStyle, type RenderStyle, styleFor } from "./style.js";

type RenderMode = "plain" | "llm";

/**
 * The widest a plain-table cell renders. Cells are records, not documents: a
 * pack can ship arbitrary prose in a column (one shipped an 834-character
 * multi-line description), and a single cell that wraps destroys the
 * one-row-one-record model every field-splitting consumer relies on. Longer
 * values are truncated with an ellipsis; the detail escape hatch is `lookup`.
 */
export const MAX_PLAIN_CELL_WIDTH = 80;

/**
 * The placeholder for an empty cell in a populated column. The grid stays
 * rectangular: a value's absence must not shift its neighbours left, or
 * `awk '{print $4}'` reads a different field on every row.
 */
const EMPTY_CELL = "-";

/** The context assumed when a caller passes none: interactive, headers on. */
const DEFAULT_CONTEXT: RenderContext = { headers: true, stdoutIsTty: true };

/**
 * The markdown heading level `renderLookupSections` gives a section in llm mode
 * — the lookup title is `##`, so a section is `###`. Read, not re-typed, by
 * {@link nestHeadings}: the renderer is the only party that knows its own
 * nesting depth, and it must stay the only party that encodes it.
 */
const SECTION_HEADING_LEVEL = 3;

/** Markdown's deepest heading. Demotion clamps here rather than overflowing. */
const MAX_HEADING_LEVEL = 6;

/**
 * An ATX heading: up to three spaces of indent, 1–6 `#`, whitespace, text.
 *
 * The indent is CommonMark's — four spaces would make the line an indented
 * code block, three or fewer leave it a heading. Missing it left
 * `  ### Accessibility` un-nested while its unindented twin was demoted, so
 * one body could come out with two conflicting hierarchies. The indent is
 * captured so a rewrite preserves it.
 */
const ATX_HEADING = /^( {0,3})(#{1,6})(\s+\S.*)$/;

/**
 * A fenced code-block delimiter: up to three spaces of indent, then the run of
 * markers, then whatever follows on the line (the info string).
 *
 * The RUN LENGTH and the info string both matter for closing, which is why
 * they are captured rather than just recognised — see {@link nestHeadings}.
 */
const CODE_FENCE = /^ {0,3}((`{3,})|(~{3,}))([^`]*)$/;

/**
 * The empty-state body — the message plus its optional hint on a second line,
 * or "" when the caller declared no message (bare-empty behavior preserved).
 */
function emptyBody<T>(options: RenderListOptions<T>): string {
  if (!options.emptyMessage) return "";
  return options.emptyHint
    ? `${options.emptyMessage}\n${options.emptyHint}`
    : options.emptyMessage;
}

/**
 * The empty-list notice a dispatcher routes to STDERR (exit 0): zero rows is
 * a calm success, and stdout — the data stream — must not carry a human
 * sentence a pipe would read as a record. Exported for the formatter seam's
 * `emptyNotice`; the plain renderer itself no longer prints it.
 */
export function renderListEmptyNotice<T>(
  options: RenderListOptions<T>,
): string {
  return emptyBody(options);
}

/**
 * One plain-table cell: single-line (embedded newlines collapse to a space)
 * and at most {@link MAX_PLAIN_CELL_WIDTH} characters, truncated with an
 * ellipsis — see the constant's rationale.
 */
function disciplineCell(value: string): string {
  const singleLine = value.replace(/\s*\n\s*/g, " ").trim();
  if (singleLine.length <= MAX_PLAIN_CELL_WIDTH) return singleLine;
  return `${singleLine.slice(0, MAX_PLAIN_CELL_WIDTH - 1).trimEnd()}…`;
}

/**
 * Render a list as a plain table: a bold UPPERCASE header row (from
 * `column.label`), then one padded row per item over a RECTANGULAR grid — a
 * column is included when any row (or `showWhenEmpty`) populates it, and an
 * empty cell in an included column renders `-` so fields never shift. An
 * empty list renders nothing on a terminal (the notice is stderr's, see
 * {@link renderListEmptyNotice}) and just the header row on a pipe, so a
 * zero-record table stays well-formed for field-splitting consumers.
 *
 * @param items - The rows.
 * @param options - Columns and empty-state copy.
 * @param context - Header/TTY presentation facts (defaults to a terminal
 *   with headers on).
 * @param style - TTY styling; off a TTY the styler is inert, so piped bytes
 *   carry no escape sequences.
 * @returns The formatted table.
 */
export function renderListPlain<T>(
  items: readonly T[],
  options: RenderListOptions<T>,
  context: RenderContext = DEFAULT_CONTEXT,
  style: RenderStyle = defaultStyle(),
): string {
  if (items.length === 0) {
    // A piped zero-record table keeps its schema; a terminal needs nothing.
    return context.headers && !context.stdoutIsTty
      ? renderHeaderRow(options.columns, style)
      : "";
  }

  const prefixes = options.prefixes ?? DEFAULT_PREFIX_MAP;
  const cells = items.map((item) =>
    options.columns.map((column) =>
      disciplineCell(formatColumnValue(item, column, prefixes)),
    ),
  );
  const included = options.columns
    .map((column, index) => ({ column, index }))
    .filter(
      ({ column, index }) =>
        column.showWhenEmpty === true ||
        cells.some((row) => (row[index] ?? "").length > 0),
    );

  const header = included.map(({ column }) => column.label.toUpperCase());
  const rows = cells.map((row) =>
    included.map(({ index }) => {
      const value = row[index] ?? "";
      return value.length > 0 ? value : EMPTY_CELL;
    }),
  );

  const layoutRows = context.headers ? [header, ...rows] : rows;
  const widths = layoutRows.reduce<number[]>(
    (acc, row) =>
      row.map((value, index) => Math.max(acc[index] ?? 0, value.length)),
    [],
  );
  const padded = layoutRows.map((row) =>
    row
      .map((value, index) => value.padEnd(widths[index] ?? value.length))
      .join("  ")
      .trimEnd(),
  );

  if (!context.headers) return padded.join("\n");
  const [headerLine, ...bodyLines] = padded;
  const styledHeader = style.enabled
    ? style.bold(headerLine ?? "")
    : (headerLine ?? "");
  return [styledHeader, ...bodyLines].join("\n");
}

/** The zero-record header row (every declared column, uppercase labels). */
function renderHeaderRow<T>(
  columns: readonly ColumnDef<T>[],
  style: RenderStyle,
): string {
  const line = columns
    .map((column) => column.label.toUpperCase())
    .join("  ")
    .trimEnd();
  return style.enabled ? style.bold(line) : line;
}

export function renderListLlm<T>(
  items: readonly T[],
  options: RenderListOptions<T>,
): string {
  const prefixes = options.prefixes ?? DEFAULT_PREFIX_MAP;
  const lines = [`## ${options.heading} (${items.length})`, ""];

  if (items.length === 0) {
    const body = emptyBody(options);
    return body ? `${lines[0]}\n\n${body}` : lines.join("\n");
  }

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

/**
 * Render an entity lookup as plain text.
 *
 * @param entity - The looked-up entity.
 * @param options - The lookup layout (title, fields, sections).
 * @param style - TTY styling; defaults to the process style. On a color-capable
 *   terminal the title is bold, its `═` rule dim, and field labels cyan; off a
 *   TTY the styler is inert, so the output is byte-identical to the plain form.
 * @returns The formatted lookup block.
 */
export function renderLookupPlain<T>(
  entity: T,
  options: RenderLookupOptions<T>,
  style: RenderStyle = defaultStyle(),
): string {
  return renderLookup(entity, options, "plain", style);
}

export function renderLookupLlm<T>(
  entity: T,
  options: RenderLookupOptions<T>,
): string {
  // The condensed form is a byte-frozen agent contract — never styled.
  return renderLookup(entity, options, "llm", styleFor(false));
}

function renderLookup<T>(
  entity: T,
  options: RenderLookupOptions<T>,
  mode: RenderMode,
  style: RenderStyle,
): string {
  const title = options.title(entity);
  const fields = renderLookupFields(entity, options, mode, style);
  const sections = renderLookupSections(entity, options, mode);

  if (mode === "llm") {
    return [`## ${title}`, "", ...fields, ...sections].join("\n").trimEnd();
  }

  const headingRule = "═".repeat(Math.max(title.length, 24));
  const head = style.enabled
    ? [style.bold(title), style.dim(headingRule)]
    : [title, headingRule];
  return [...head, "", ...fields, ...sections].join("\n").trimEnd();
}

function renderLookupFields<T>(
  entity: T,
  options: RenderLookupOptions<T>,
  mode: RenderMode,
  style: RenderStyle,
): string[] {
  const prefixes = options.prefixes ?? DEFAULT_PREFIX_MAP;
  return options.fields.flatMap((field) => {
    const value = field.value(entity);
    if (isEmptyValue(value)) {
      return [];
    }

    const formatted = formatInlineValue(value, prefixes);
    if (mode === "llm") return [`- ${field.label}: ${formatted}`];
    const label = style.enabled ? style.cyan(field.label) : field.label;
    return [`  ${label}: ${formatted}`];
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
      mode === "llm"
        ? `${"#".repeat(SECTION_HEADING_LEVEL)} ${section.heading}`
        : `${section.heading}:`,
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
  const prefixes = options.prefixes ?? DEFAULT_PREFIX_MAP;

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
  // Plain mode is not markdown — a `###` there is literal text, and rewriting
  // it would corrupt the value. Only the llm mode's markdown has a hierarchy to
  // collide with, so only it nests.
  return mode === "llm"
    ? nestHeadings(text, SECTION_HEADING_LEVEL)
    : indentBlock(text);
}

/**
 * Demote a section body's own ATX headings so they nest UNDER the heading the
 * renderer gave the section.
 *
 * Authored markdown cannot know what level it will be rendered at; the renderer
 * can, and so the renderer is the side that moves. A block whose shallowest
 * heading is at or above `parentLevel` is shifted down as a whole — `###
 * Accessibility` inside a `### Guidelines` section becomes `#### Accessibility`
 * — which fixes the collision (a section heading immediately followed by a
 * same-level heading reads as an empty section) while preserving the content's
 * internal hierarchy exactly. Content already nested deeper is left alone.
 *
 * Headings inside a fenced code block are content, not structure — a `# ` in a
 * shell sample is a comment — so fenced regions pass through untouched.
 *
 * @param text - The section body as authored.
 * @param parentLevel - The heading level the section itself was rendered at.
 * @returns The body with its headings nested below `parentLevel`.
 */
function nestHeadings(text: string, parentLevel: number): string {
  const lines = text.split("\n");
  const headings = new Map<number, number>();
  // A fence CLOSES only on the same marker character, a run at least as long
  // as the opener's, and no info string — CommonMark's rule, and the reason
  // the opener's length is remembered rather than just its character. Toggling
  // on any same-character run let a ``` sample inside a ```` block read as the
  // close, after which every `#` line in that code block was rewritten as a
  // heading: the renderer editing someone's sample code.
  let fence: { marker: string; length: number } | undefined;
  for (const [index, line] of lines.entries()) {
    const delimiter = CODE_FENCE.exec(line);
    const run = delimiter?.[1];
    if (run !== undefined) {
      const marker = run.charAt(0);
      const info = (delimiter?.[4] ?? "").trim();
      if (fence === undefined) {
        fence = { marker, length: run.length };
        continue;
      }
      if (
        marker === fence.marker &&
        run.length >= fence.length &&
        info === ""
      ) {
        fence = undefined;
      }
      continue;
    }
    if (fence !== undefined) continue;
    const level = ATX_HEADING.exec(line)?.[2]?.length;
    if (level !== undefined) headings.set(index, level);
  }

  if (headings.size === 0) return text;
  const shift = parentLevel + 1 - Math.min(...headings.values());
  if (shift <= 0) return text;

  return lines
    .map((line, index) => {
      const level = headings.get(index);
      if (level === undefined) return line;
      const hashes = "#".repeat(Math.min(level + shift, MAX_HEADING_LEVEL));
      // `$1` keeps the line's own indent: rewriting it away would turn a
      // legally indented heading into an unindented one.
      return line.replace(ATX_HEADING, `$1${hashes}$3`);
    })
    .join("\n");
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
