/**
 * Project the prompt registry onto the `prompts/list` result shape.
 *
 * THE MIRROR INVARIANT: this must serialize byte-identically to what the
 * MCP SDK serves for the registered prompts — `{ name, description,
 * arguments?: [{ name, description, required }] }`, in registration
 * order. The CLI `prompt list --format json` and the `capabilities`
 * aggregator both render this exact object; the parity suite referees.
 */

import type {
  PromptListArgument,
  PromptListEntry,
  PromptRegistryEntry,
} from "./types.js";

/**
 * Build the `prompts/list` result from registry entries.
 *
 * @param entries - The registry, in registration order.
 * @returns The `{ prompts: [...] }` protocol payload.
 */
export default function projectPromptList(
  entries: readonly PromptRegistryEntry[],
): { prompts: PromptListEntry[] } {
  return {
    prompts: entries.map(({ definition }) => {
      const args: PromptListArgument[] = Object.entries(
        definition.arguments ?? {},
      ).map(([name, def]) => ({
        name,
        description: def.description,
        required: def.required === true,
      }));
      return {
        name: definition.name,
        description: definition.description,
        ...(args.length > 0 ? { arguments: args } : {}),
      };
    }),
  };
}
