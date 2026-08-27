/**
 * Project a live {@link GeneratorDefinition} onto its serializable command
 * surface — the one image both the summon bin (at run time) and a host's
 * codegen (at build time) derive the SAME grammar from.
 *
 * What survives the projection is exactly what the CLI surface reads: name,
 * type, message, default, choices, positional, group. A `when` condition
 * collapses to `conditional: true` (only a live wizard evaluates the
 * predicate); `validate` is dropped entirely (enforced at execute time by
 * `validateAnswers`, identically for every front-end).
 */

import type GeneratorDefinition from "../types/GeneratorDefinition.js";
import type PromptDefinition from "../types/PromptDefinition.js";
import type { ProjectedPrompt, SurfaceCommand } from "./types.js";

/** Project one prompt, keeping only its serializable, surface-bearing fields. */
function projectPrompt(prompt: PromptDefinition): ProjectedPrompt {
  return {
    name: prompt.name,
    type: prompt.type,
    message: prompt.message,
    ...(prompt.default !== undefined ? { default: prompt.default } : {}),
    ...(prompt.choices !== undefined
      ? {
          choices: prompt.choices.map((choice) => ({
            label: choice.label,
            value: choice.value,
          })),
        }
      : {}),
    ...(prompt.positional === true ? { positional: true } : {}),
    ...(prompt.group !== undefined ? { group: prompt.group } : {}),
    ...(prompt.when !== undefined ? { conditional: true } : {}),
  };
}

/**
 * Project a generator onto its serializable {@link SurfaceCommand}.
 *
 * @param path - The command path the generator is mounted at.
 * @param generator - The live generator definition.
 * @returns The serializable command surface.
 */
export default function projectGenerator(
  path: readonly string[],
  generator: GeneratorDefinition,
): SurfaceCommand {
  return {
    path: [...path],
    description: generator.meta.description,
    prompts: generator.prompts.map(projectPrompt),
  };
}
