/**
 * Three-mode formatter for `pragma standard list` output.
 *
 * - **plain** — terminal text with progressive disclosure.
 * - **llm** — condensed Markdown consumed by LLM agents and reused
 *   by the MCP adapter when `condensed: true`.
 * - **json** — structured JSON; enrichment varies by disclosure level.
 *
 * Disclosure levels:
 *   - summary  — name + category + description (default)
 *   - digest   — summary + first do example (truncated)
 *   - detailed — summary + full dos/donts
 */

import type { Formatters } from "../../shared/formatters.js";
import type { CodeBlock, StandardDetailed } from "../../shared/types.js";
import type { StandardListOutput } from "./types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_MAX_EXAMPLE_LENGTH = 120;

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

function plain({ items, details, disclosure }: StandardListOutput): string {
  const lines: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const s = items[i]!;
    const cat = s.category ? ` [${s.category}]` : "";
    lines.push(`${s.name}${cat}`);
    lines.push(`  ${s.description}`);

    if (disclosure.level === "digest") {
      const maxLen = disclosure.maxExampleLength ?? DEFAULT_MAX_EXAMPLE_LENGTH;
      const example = firstDoExample(details?.[i], maxLen);
      if (example) {
        lines.push(`  Example: ${example}`);
      }
    }

    if (disclosure.level === "detailed") {
      const detail = details?.[i];
      if (detail) {
        if (detail.dos.length > 0) {
          lines.push("  Do:");
          for (const d of detail.dos) {
            lines.push(`    ${d.code}`);
          }
        }
        if (detail.donts.length > 0) {
          lines.push("  Don't:");
          for (const d of detail.donts) {
            lines.push(`    ${d.code}`);
          }
        }
      }
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// LLM
// ---------------------------------------------------------------------------

function llm({ items, details, disclosure }: StandardListOutput): string {
  const lines: string[] = [];
  lines.push("## Standards");
  lines.push("");

  for (let i = 0; i < items.length; i++) {
    const s = items[i]!;
    const cat = s.category ? ` [${s.category}]` : "";
    lines.push(`- **${s.name}**${cat}: ${s.description}`);

    if (disclosure.level === "digest") {
      const maxLen = disclosure.maxExampleLength ?? DEFAULT_MAX_EXAMPLE_LENGTH;
      const example = firstDoExample(details?.[i], maxLen);
      if (example) {
        lines.push(`  - Example: \`${example}\``);
      }
    }

    if (disclosure.level === "detailed") {
      const detail = details?.[i];
      if (detail) {
        if (detail.dos.length > 0) {
          lines.push("  - **Do**:");
          for (const d of detail.dos) {
            lines.push(`    - ${d.code}`);
          }
        }
        if (detail.donts.length > 0) {
          lines.push("  - **Don't**:");
          for (const d of detail.donts) {
            lines.push(`    - ${d.code}`);
          }
        }
      }
    }
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

const formatters: Formatters<StandardListOutput> = { plain, llm, json };

export default formatters;
