/**
 * Generator-to-CLI bridge: converts GeneratorDefinition into CommandDefinition.
 *
 * This module maps summon-core's generator prompts into cli-framework's
 * parameter definitions and wires the execute closure to executeGenerator.
 */

import type {
  GeneratorDefinition,
  PromptDefinition,
} from "@canonical/summon-core";
import executeGenerator from "./executeGenerator.js";
import type {
  CommandContext,
  CommandDefinition,
  CommandResult,
  ParameterDefinition,
} from "./types.js";

/**
 * Map a PromptDefinition to a ParameterDefinition.
 *
 * Type mapping:
 * - text → string
 * - confirm → boolean
 * - select → select
 * - multiselect → multiselect
 */
export const promptToParameter = (
  prompt: PromptDefinition,
): ParameterDefinition => {
  const typeMap: Record<PromptDefinition["type"], ParameterDefinition["type"]> =
    {
      text: "string",
      confirm: "boolean",
      select: "select",
      multiselect: "multiselect",
    };

  return {
    name: prompt.name,
    description: prompt.message,
    type: typeMap[prompt.type],
    ...(prompt.choices && { choices: prompt.choices }),
    ...(prompt.default !== undefined && { default: prompt.default }),
    ...(prompt.positional && { positional: true }),
    // Required if no default AND no when condition
    required: prompt.default === undefined && !prompt.when,
  };
};

/**
 * Convert a GeneratorDefinition into a CommandDefinition.
 *
 * @param path - Command path segments (e.g., ["component", "react"])
 * @param gen - The generator to convert
 */
export const generatorToCommand = (
  path: string[],
  gen: GeneratorDefinition,
): CommandDefinition => {
  // Map prompts to parameters
  const promptParams = gen.prompts.map(promptToParameter);

  // Append execution-mode parameters
  const execParams: ParameterDefinition[] = [
    {
      name: "dryRun",
      description: "Preview without writing files",
      type: "boolean",
    },
    {
      name: "yes",
      description: "Skip confirmation prompts",
      type: "boolean",
    },
    {
      name: "showFiles",
      description: "Show file contents in dry-run",
      type: "boolean",
    },
    {
      name: "preview",
      description: "Show file preview before writing",
      type: "boolean",
      default: true,
    },
    {
      name: "generatedStamp",
      description: "Add generated file stamps",
      type: "boolean",
      default: true,
    },
  ];

  const parameters = [...promptParams, ...execParams];

  // Build parameterGroups from prompt group fields
  const parameterGroups: Record<string, string[]> = {};
  for (const prompt of gen.prompts) {
    if (prompt.group) {
      const existing = parameterGroups[prompt.group];
      if (existing) {
        existing.push(prompt.name);
      } else {
        parameterGroups[prompt.group] = [prompt.name];
      }
    }
  }

  return {
    path,
    description: gen.meta.description,
    parameters,
    execute: (
      params: Record<string, unknown>,
      ctx: CommandContext,
    ): Promise<CommandResult> => executeGenerator(gen, params, ctx),
    meta: {
      version: gen.meta.version,
      examples: gen.meta.examples,
      extendedHelp: gen.meta.help,
      origin: gen.meta.author,
    },
    ...(Object.keys(parameterGroups).length > 0 && { parameterGroups }),
  };
};
