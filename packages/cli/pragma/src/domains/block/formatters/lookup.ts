import type { RenderLookupOptions } from "../../shared/contracts.js";
import type { Formatters } from "../../shared/formatters.js";
import { renderLookupLlm, renderLookupPlain } from "../../shared/renderers.js";
import type { BlockDetailed } from "../../shared/types/index.js";
import { blockConfig } from "../blockConfig.js";
import type { AspectFlags } from "../types.js";
import type { BlockLookupInput } from "./types.js";

/** Three-mode formatter for `pragma block lookup` output. */
const formatters: Formatters<BlockLookupInput> = {
  plain: ({ block, detailed, aspects }) =>
    renderLookupPlain(block, createLookupOptions(detailed, aspects)),

  llm: ({ block, detailed, aspects }) =>
    renderLookupLlm(block, createLookupOptions(detailed, aspects)),

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

function createLookupOptions(
  detailed: boolean,
  aspects: AspectFlags,
): RenderLookupOptions<BlockDetailed> {
  return {
    title: (block) => block.name,
    fields: [
      { label: "IRI", value: (block) => block.uri },
      { label: "Type", value: (block) => block.type },
      { label: "Tier", value: (block) => block.tier },
      ...(detailed
        ? []
        : ([
            {
              label: "Summary",
              value: (block: BlockDetailed) => block.summary,
            },
          ] as const)),
      { label: "Modifiers", value: (block) => block.modifiers },
      {
        label: "Implementations",
        value: (block) =>
          block.implementations
            .filter((implementation) => implementation.available)
            .map((implementation) => implementation.framework),
      },
      { label: "Anatomy nodes", value: (block) => block.nodeCount },
      { label: "Tokens", value: (block) => block.tokenCount },
    ],
    sections: selectLookupSections(detailed, aspects),
    sectionOverrides: {
      modifierFamilies: {
        plain: (block) =>
          block.modifierValues.length > 0
            ? block.modifierValues
                .map(
                  (modifier) =>
                    `  ${modifier.family}: ${modifier.values.join(", ")}`,
                )
                .join("\n")
            : null,
        llm: (block) =>
          block.modifierValues.length > 0
            ? block.modifierValues
                .map(
                  (modifier) =>
                    `- **${modifier.family}**: ${modifier.values.join(", ")}`,
                )
                .join("\n")
            : null,
      },
    },
    codeLanguage: (_section, value) =>
      typeof value === "string" && value.includes("@prefix") ? "ttl" : "yaml",
  };
}

function selectLookupSections(
  detailed: boolean,
  aspects: AspectFlags,
): typeof blockConfig.lookupSections {
  const sections = detailed
    ? blockConfig.lookupSections
    : blockConfig.lookupSections.filter(
        (section) => section.key === "subcomponents",
      );

  return sections.filter((section) => {
    if (
      !aspects.anatomy &&
      ["anatomy", "anatomyDsl", "anatomyClassic"].includes(section.key)
    ) {
      return false;
    }

    if (!aspects.modifiers && section.key === "modifierFamilies") {
      return false;
    }

    if (!aspects.implementations && section.key === "implementationPaths") {
      return false;
    }

    if (!aspects.tokens && section.key === "tokens") {
      return false;
    }

    return true;
  });
}
