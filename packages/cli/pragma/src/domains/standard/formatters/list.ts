import type { Formatters } from "../../shared/formatters.js";
import type { CodeBlock, StandardDetailed } from "../../shared/types/index.js";
import type { StandardListOutput } from "./types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_MAX_EXAMPLE_LENGTH = 120;

interface StandardListRow {
  readonly uri: StandardDetailed["uri"];
  readonly name: StandardDetailed["name"];
  readonly category: StandardDetailed["category"];
  readonly description: StandardDetailed["description"];
  readonly extends?: StandardDetailed["extends"];
  readonly example?: string;
  readonly dos?: StandardDetailed["dos"];
  readonly donts?: StandardDetailed["donts"];
}

function truncate(text: string, max: number): string {
  const oneLine = text.replace(/\n/g, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max - 1)}…`;
}

function firstDoExample(
  detail: StandardDetailed | null | undefined,
  maxLen: number,
): string | undefined {
  if (!detail || detail.dos.length === 0) return undefined;
  // Safe — length check above guarantees dos[0] exists
  return truncate((detail.dos[0] as CodeBlock).code, maxLen);
}

// ---------------------------------------------------------------------------
// Plain
// ---------------------------------------------------------------------------

function plain(output: StandardListOutput): string {
  return buildRows(output)
    .map((row) => formatPlainRow(row, output.disclosure.level))
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// LLM
// ---------------------------------------------------------------------------

function llm(output: StandardListOutput): string {
  const lines = ["## Standards", ""];

  for (const row of buildRows(output)) {
    lines.push(formatLlmRow(row, output.disclosure.level));
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

function json({ items, details, disclosure }: StandardListOutput): string {
  if (disclosure.level === "summary" || !details) {
    return JSON.stringify(items, null, 2);
  }

  if (disclosure.level === "digest") {
    const maxLen = disclosure.maxExampleLength ?? DEFAULT_MAX_EXAMPLE_LENGTH;
    const enriched = items.map((s, i) => {
      const example = firstDoExample(details[i], maxLen);
      return example ? { ...s, example } : s;
    });
    return JSON.stringify(enriched, null, 2);
  }

  // detailed — merge full detail into each item
  const enriched = items.map((s, i) => {
    const detail = details[i];
    return detail ? { ...s, dos: detail.dos, donts: detail.donts } : s;
  });
  return JSON.stringify(enriched, null, 2);
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** Three-mode formatter for `pragma standard list` output. */
const formatters: Formatters<StandardListOutput> = { plain, llm, json };

export default formatters;

function buildRows({
  items,
  details,
  disclosure,
}: StandardListOutput): readonly StandardListRow[] {
  if (disclosure.level === "summary") {
    return items;
  }

  if (disclosure.level === "digest") {
    const maxLen = disclosure.maxExampleLength ?? DEFAULT_MAX_EXAMPLE_LENGTH;
    return items.map((item, index) => ({
      ...item,
      extends: details?.[index]?.extends,
      example: firstDoExample(details?.[index], maxLen),
    }));
  }

  return items.map((item, index) => ({
    ...item,
    extends: details?.[index]?.extends,
    dos: details?.[index]?.dos,
    donts: details?.[index]?.donts,
  }));
}

function formatPlainRow(
  row: StandardListRow,
  level: StandardListOutput["disclosure"]["level"],
): string {
  const lines = [formatHeading(row), `  ${row.description}`];

  if (row.extends) {
    lines.push(`  Extends: ${row.extends}`);
  }

  if (level === "digest" && row.example) {
    lines.push(`  Example: ${row.example}`);
  }

  if (level === "detailed") {
    if (row.dos && row.dos.length > 0) {
      lines.push("  Do:");
      lines.push(...row.dos.map((item) => `    ${item.code}`));
    }

    if (row.donts && row.donts.length > 0) {
      lines.push("  Don't:");
      lines.push(...row.donts.map((item) => `    ${item.code}`));
    }
  }

  return lines.join("\n");
}

function formatLlmRow(
  row: StandardListRow,
  level: StandardListOutput["disclosure"]["level"],
): string {
  const lines = [
    `- **${row.name}**${row.category ? ` [${row.category}]` : ""}`,
  ];
  lines.push(`  ${row.description}`);

  if (row.extends) {
    lines.push(`  Extends: ${row.extends}`);
  }

  if (level === "digest" && row.example) {
    lines.push(`  Example: \`${row.example}\``);
  }

  if (level === "detailed") {
    if (row.dos && row.dos.length > 0) {
      lines.push("  **Do**:");
      lines.push(...row.dos.map((item) => `  - ${item.code}`));
    }

    if (row.donts && row.donts.length > 0) {
      lines.push("  **Don't**:");
      lines.push(...row.donts.map((item) => `  - ${item.code}`));
    }
  }

  return lines.join("\n");
}

function formatHeading(row: StandardListRow): string {
  return row.category ? `${row.name} [${row.category}]` : row.name;
}
