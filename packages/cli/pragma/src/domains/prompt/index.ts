/** @module Prompt domain — registry, hydration, and protocol projections. */

import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { promptListCommand, promptLookupCommand } from "./commands/index.js";

/**
 * Return all prompt command definitions (`prompt list`, `prompt lookup`).
 *
 * @param ctx - Pragma context providing store, config, and flags.
 * @returns The command definitions for the prompt noun.
 */
export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [promptListCommand(ctx), promptLookupCommand(ctx)];
}

export { BUNDLED_PROMPTS } from "./bundled/index.js";
export { default as collectPrompts } from "./collectPrompts.js";
export type { HydrateOptions } from "./operations/index.js";
export { hydratePrompt, projectSkillStubs } from "./operations/index.js";
export { default as projectPromptList } from "./projectPromptList.js";
export type {
  HydratedPrompt,
  HydratedPromptMessage,
  PromptArgumentDef,
  PromptCompleteFrom,
  PromptDefinition,
  PromptEmbed,
  PromptListArgument,
  PromptListEntry,
  PromptRegistryEntry,
  PromptResourceEmbed,
  PromptToolEmbed,
} from "./types.js";
export { default as validatePromptDefinition } from "./validatePromptDefinition.js";
