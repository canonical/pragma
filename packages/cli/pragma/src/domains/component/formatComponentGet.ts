/**
 * Format component detail results for different output modes.
 *
 * Pure functions: ComponentDetailed → string.
 * Supports aspect filtering via the `aspects` parameter.
 */

import chalk from "chalk";
import {
  formatField,
  formatHeading,
  formatList,
  formatSection,
} from "../../lib/formatTerminal.js";
import type { AnatomyNode, ComponentDetailed } from "../shared/types.js";
import type { AspectFlags } from "./resolveAspects.js";

/**
 * Format component summary (default mode, no --detailed).
 */
export function formatComponentGet(component: ComponentDetailed): string {
  const lines: string[] = [];

  lines.push(formatHeading(component.name));
  lines.push("");
  lines.push(formatField("URI:", component.uri));
  lines.push(formatField("Tier:", component.tier));

  if (component.modifiers.length > 0) {
    lines.push(formatField("Modifiers:", component.modifiers.join(", ")));
  }

  const impl = component.implementations
    .filter((i) => i.available)
    .map((i) => i.framework);
  if (impl.length > 0) {
    lines.push(formatField("Implementations:", impl.join(", ")));
  }

  lines.push(formatField("Anatomy nodes:", String(component.nodeCount)));
  lines.push(formatField("Tokens:", String(component.tokenCount)));

  return lines.join("\n");
}

/**
 * Format component detailed view with aspect filtering.
 */
export function formatComponentGetDetailed(
  component: ComponentDetailed,
  aspects: AspectFlags,
): string {
  const lines: string[] = [];

  lines.push(formatHeading(component.name));
  lines.push("");
  lines.push(formatField("URI:", component.uri));
  lines.push(formatField("Tier:", component.tier));

  if (aspects.modifiers && component.modifierValues.length > 0) {
    lines.push("");
    lines.push(
      formatSection(
        "Modifiers",
        component.modifierValues
          .map((m) => `  ${chalk.bold(m.family)}: ${m.values.join(", ")}`)
          .join("\n"),
      ),
    );
  }

  if (aspects.implementations && component.implementationPaths.length > 0) {
    lines.push("");
    lines.push(
      formatSection(
        "Implementations",
        formatList(
          component.implementationPaths.map(
            (i) => `${chalk.bold(i.framework)}: ${i.path}`,
          ),
        ),
      ),
    );
  }

  if (aspects.tokens && component.tokens.length > 0) {
    lines.push("");
    lines.push(
      formatSection("Tokens", formatList(component.tokens.map((t) => t.name))),
    );
  }

  if (aspects.standards && component.standards.length > 0) {
    lines.push("");
    lines.push(
      formatSection(
        "Standards",
        formatList(component.standards.map((s) => `${s.name} (${s.category})`)),
      ),
    );
  }

  if (aspects.anatomy && component.anatomy) {
    lines.push("");
    lines.push(
      formatSection("Anatomy", formatAnatomyTree(component.anatomy.root, 0)),
    );
  }

  return lines.join("\n");
}

/**
 * Format component detail as LLM-friendly Markdown.
 */
export function formatComponentGetLlm(
  component: ComponentDetailed,
  detailed: boolean,
  aspects: AspectFlags,
): string {
  const lines: string[] = [];

  lines.push(`## ${component.name}`);
  lines.push("");
  lines.push(`- URI: ${component.uri}`);
  lines.push(`- Tier: ${component.tier}`);

  if (component.modifiers.length > 0) {
    lines.push(`- Modifiers: ${component.modifiers.join(", ")}`);
  }

  const impl = component.implementations
    .filter((i) => i.available)
    .map((i) => i.framework);
  if (impl.length > 0) {
    lines.push(`- Implementations: ${impl.join(", ")}`);
  }

  lines.push(`- Anatomy nodes: ${component.nodeCount}`);
  lines.push(`- Tokens: ${component.tokenCount}`);

  if (!detailed) return lines.join("\n");

  if (aspects.modifiers && component.modifierValues.length > 0) {
    lines.push("");
    lines.push("### Modifiers");
    for (const m of component.modifierValues) {
      lines.push(`- **${m.family}**: ${m.values.join(", ")}`);
    }
  }

  if (aspects.implementations && component.implementationPaths.length > 0) {
    lines.push("");
    lines.push("### Implementations");
    for (const i of component.implementationPaths) {
      lines.push(`- ${i.framework}: \`${i.path}\``);
    }
  }

  if (aspects.tokens && component.tokens.length > 0) {
    lines.push("");
    lines.push("### Tokens");
    for (const t of component.tokens) {
      lines.push(`- ${t.name}`);
    }
  }

  if (aspects.standards && component.standards.length > 0) {
    lines.push("");
    lines.push("### Standards");
    for (const s of component.standards) {
      lines.push(`- ${s.name} (${s.category})`);
    }
  }

  if (aspects.anatomy && component.anatomy) {
    lines.push("");
    lines.push("### Anatomy");
    lines.push(formatAnatomyTreeLlm(component.anatomy.root, 0));
  }

  return lines.join("\n");
}

/**
 * Format component detail as JSON.
 */
export function formatComponentGetJson(
  component: ComponentDetailed,
  detailed: boolean,
  aspects: AspectFlags,
): string {
  if (!detailed) {
    return JSON.stringify(
      {
        uri: component.uri,
        name: component.name,
        tier: component.tier,
        modifiers: component.modifiers,
        implementations: component.implementations,
        nodeCount: component.nodeCount,
        tokenCount: component.tokenCount,
      },
      null,
      2,
    );
  }

  const result: Record<string, unknown> = {
    uri: component.uri,
    name: component.name,
    tier: component.tier,
  };

  if (aspects.modifiers) result.modifierValues = component.modifierValues;
  if (aspects.implementations)
    result.implementationPaths = component.implementationPaths;
  if (aspects.tokens) result.tokens = component.tokens;
  if (aspects.standards) result.standards = component.standards;
  if (aspects.anatomy) result.anatomy = component.anatomy;

  return JSON.stringify(result, null, 2);
}

// =============================================================================
// Helpers
// =============================================================================

function formatAnatomyTree(node: AnatomyNode, depth: number): string {
  const indent = "  ".repeat(depth);
  const typeTag = node.type === "anonymous" ? chalk.dim(" (anon)") : "";
  const slotTag = node.slot ? chalk.dim(` slot=${node.slot}`) : "";
  let result = `${indent}${node.name}${typeTag}${slotTag}`;

  for (const child of node.children) {
    result += `\n${formatAnatomyTree(child, depth + 1)}`;
  }

  return result;
}

function formatAnatomyTreeLlm(node: AnatomyNode, depth: number): string {
  const indent = "  ".repeat(depth);
  const typeTag = node.type === "anonymous" ? " (anonymous)" : "";
  const slotTag = node.slot ? ` [slot: ${node.slot}]` : "";
  let result = `${indent}- ${node.name}${typeTag}${slotTag}`;

  for (const child of node.children) {
    result += `\n${formatAnatomyTreeLlm(child, depth + 1)}`;
  }

  return result;
}
