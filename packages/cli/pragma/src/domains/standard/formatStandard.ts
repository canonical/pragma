/**
 * Standard output formatters.
 *
 * Pure functions: typed data → string.
 * Consumed by standard commands for plain, LLM, and JSON modes.
 */

import type {
  CategorySummary,
  StandardDetailed,
  StandardSummary,
} from "../shared/types.js";

// =============================================================================
// Plain
// =============================================================================

export function formatStandardsListPlain(
  standards: StandardSummary[],
): string {
  const lines: string[] = [];
  for (const s of standards) {
    const cat = s.category ? ` [${s.category}]` : "";
    lines.push(`${s.name}${cat}`);
    lines.push(`  ${s.description}`);
  }
  return lines.join("\n");
}

/**
 * @see ST.04
 */
export function formatStandardGetPlain(
  standard: StandardDetailed,
  detailed: boolean,
): string {
  const lines: string[] = [];
  lines.push(standard.name);
  lines.push(`Category: ${standard.category || "—"}`);
  lines.push(`Description: ${standard.description}`);
  if (standard.extends) {
    lines.push(`Extends: ${standard.extends}`);
  }

  if (detailed) {
    if (standard.dos.length > 0) {
      lines.push("");
      lines.push("Do:");
      for (const d of standard.dos) {
        lines.push(`  ${d.code}`);
      }
    }

    if (standard.donts.length > 0) {
      lines.push("");
      lines.push("Don't:");
      for (const d of standard.donts) {
        lines.push(`  ${d.code}`);
      }
    }
  }

  return lines.join("\n");
}

export function formatCategoriesPlain(
  categories: CategorySummary[],
): string {
  const lines: string[] = [];
  for (const c of categories) {
    const plural = c.standardCount === 1 ? "standard" : "standards";
    lines.push(`${c.name} (${c.standardCount} ${plural})`);
  }
  return lines.join("\n");
}

// =============================================================================
// LLM
// =============================================================================

export function formatStandardsListLlm(
  standards: StandardSummary[],
): string {
  const lines: string[] = [];
  lines.push("## Standards");
  lines.push("");
  for (const s of standards) {
    const cat = s.category ? ` [${s.category}]` : "";
    lines.push(`- **${s.name}**${cat}: ${s.description}`);
  }
  return lines.join("\n");
}

export function formatStandardGetLlm(
  standard: StandardDetailed,
  detailed: boolean,
): string {
  const lines: string[] = [];
  lines.push(`## ${standard.name}`);
  lines.push(`Category: ${standard.category || "—"}`);
  lines.push(standard.description);

  if (detailed) {
    if (standard.dos.length > 0) {
      lines.push("");
      lines.push("### Do");
      for (const d of standard.dos) {
        lines.push(`- ${d.code}`);
      }
    }

    if (standard.donts.length > 0) {
      lines.push("");
      lines.push("### Don't");
      for (const d of standard.donts) {
        lines.push(`- ${d.code}`);
      }
    }
  }

  return lines.join("\n");
}

export function formatCategoriesLlm(
  categories: CategorySummary[],
): string {
  const lines: string[] = [];
  lines.push("## Standard Categories");
  lines.push("");
  for (const c of categories) {
    lines.push(`- **${c.name}** (${c.standardCount})`);
  }
  return lines.join("\n");
}

// =============================================================================
// JSON
// =============================================================================

export function formatStandardJson(
  standard: StandardDetailed,
  detailed: boolean,
): string {
  if (detailed) {
    return JSON.stringify(standard, null, 2);
  }
  const { dos: _dos, donts: _donts, ...summary } = standard;
  return JSON.stringify(summary, null, 2);
}
