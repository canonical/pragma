/**
 * Three-mode formatter for `pragma block lookup` output.
 *
 * - **plain** — styled terminal output with chalk; shows summary or
 *   detailed view depending on the `detailed` / aspect flags.
 * - **llm** — condensed Markdown consumed by LLM agents and reused
 *   by the MCP adapter when `condensed: true`.
 * - **json** — structured JSON for programmatic consumption.
 *
 * Supports aspect filtering (anatomy, modifiers, tokens, implementations)
 * via the `aspects` field on {@link BlockLookupInput}.
 */

import chalk from "chalk";
import {
  formatField,
  formatHeading,
  formatList,
  formatSection,
} from "#pipeline";
import type { Formatters } from "../../shared/formatters.js";
import type { AnatomyNode, BlockDetailed } from "../../shared/types.js";
import type { AspectFlags } from "../types.js";
import type { BlockLookupInput } from "./types.js";

const formatters: Formatters<BlockLookupInput> = {
  plain({ block: component, detailed, aspects }) {
    if (!detailed) return formatSummary(component);
    return formatDetailed(component, aspects);
  },

  llm({ block: component, detailed, aspects }) {
    const lines: string[] = [];

    lines.push(`## ${component.name}`);
    lines.push("");
    lines.push(`- URI: ${component.uri}`);
    lines.push(`- Tier: ${component.tier}`);

    if (component.summary) {
      lines.push(`- Summary: ${component.summary}`);
    }

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

    if (component.whenToUse) {
      lines.push("");
      lines.push("### When to use");
      lines.push(component.whenToUse);
    }

    if (component.whenNotToUse) {
      lines.push("");
      lines.push("### When not to use");
      lines.push(component.whenNotToUse);
    }

    if (component.guidelines) {
      lines.push("");
      lines.push("### Guidelines");
      lines.push(component.guidelines);
    }

    if (aspects.modifiers && component.modifierValues.length > 0) {
      lines.push("");
      lines.push("### Modifiers");
      for (const m of component.modifierValues) {
        lines.push(`- **${m.family}**: ${m.values.join(", ")}`);
      }
    }

    if (component.properties.length > 0) {
      lines.push("");
      lines.push("### Properties");
      for (const property of component.properties) {
        const bits = [property.propertyType || "unknown"];
        bits.push(property.optional ? "optional" : "required");
        if (property.defaultValue) {
          bits.push(`default=${property.defaultValue}`);
        }
        if (property.constraints) {
          bits.push(property.constraints);
        }
        lines.push(`- **${property.name}**: ${bits.join("; ")}`);
      }
    }

    if (component.subcomponents.length > 0) {
      lines.push("");
      lines.push("### Subcomponents");
      for (const subcomponent of component.subcomponents) {
        lines.push(`- ${subcomponent.name} (${subcomponent.uri})`);
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

    if (aspects.anatomy && component.anatomy) {
      lines.push("");
      lines.push("### Anatomy");
      lines.push(formatAnatomyTreeLlm(component.anatomy.root, 0));
    } else if (aspects.anatomy && component.anatomyDsl) {
      lines.push("");
      lines.push("### Anatomy DSL");
      lines.push(component.anatomyDsl);
    }

    return lines.join("\n");
  },

  json({ block: component, detailed, aspects }) {
    if (!detailed) {
      return JSON.stringify(
        {
          uri: component.uri,
          name: component.name,
          summary: component.summary,
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

    const result: Record<string, unknown> = { ...component };

    if (!aspects.modifiers) {
      delete result.modifierValues;
      delete result.modifierFamilies;
    }
    if (!aspects.implementations) {
      delete result.implementationPaths;
    }
    if (!aspects.tokens) {
      delete result.tokens;
    }
    if (!aspects.anatomy) {
      delete result.anatomy;
      delete result.anatomyDsl;
      delete result.anatomyClassic;
    }

    return JSON.stringify(result, null, 2);
  },
};

export default formatters;

// =============================================================================
// Helpers
// =============================================================================

function formatSummary(component: BlockDetailed): string {
  const lines: string[] = [];

  lines.push(formatHeading(component.name));
  lines.push("");
  lines.push(formatField("URI:", component.uri));
  lines.push(formatField("Tier:", component.tier));

  if (component.summary) {
    lines.push(formatField("Summary:", component.summary));
  }

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

function formatDetailed(
  component: BlockDetailed,
  aspects: AspectFlags,
): string {
  const lines: string[] = [];

  lines.push(formatHeading(component.name));
  lines.push("");
  lines.push(formatField("URI:", component.uri));
  lines.push(formatField("Tier:", component.tier));
  if (component.summary) {
    lines.push(formatField("Summary:", component.summary));
  }
  lines.push(formatField("Anatomy nodes:", String(component.nodeCount)));
  lines.push(formatField("Tokens:", String(component.tokenCount)));

  if (component.whenToUse) {
    lines.push("");
    lines.push(formatSection("When to use", component.whenToUse));
  }

  if (component.whenNotToUse) {
    lines.push("");
    lines.push(formatSection("When not to use", component.whenNotToUse));
  }

  if (component.guidelines) {
    lines.push("");
    lines.push(formatSection("Guidelines", component.guidelines));
  }

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

  if (component.properties.length > 0) {
    lines.push("");
    lines.push(
      formatSection(
        "Properties",
        formatList(
          component.properties.map((property) => {
            const parts = [
              chalk.bold(property.name),
              property.propertyType || "unknown",
              property.optional ? "optional" : "required",
            ];
            if (property.defaultValue) {
              parts.push(`default=${property.defaultValue}`);
            }
            if (property.constraints) {
              parts.push(property.constraints);
            }
            return parts.join(" — ");
          }),
        ),
      ),
    );
  }

  if (component.subcomponents.length > 0) {
    lines.push("");
    lines.push(
      formatSection(
        "Subcomponents",
        formatList(
          component.subcomponents.map(
            (subcomponent) => `${subcomponent.name}: ${subcomponent.uri}`,
          ),
        ),
      ),
    );
  }

  if (aspects.anatomy && component.anatomy) {
    lines.push("");
    lines.push(
      formatSection("Anatomy", formatAnatomyTree(component.anatomy.root, 0)),
    );
  } else if (aspects.anatomy && component.anatomyDsl) {
    lines.push("");
    lines.push(formatSection("Anatomy (DSL)", component.anatomyDsl));
  }

  return lines.join("\n");
}

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
