/** @module Prompt domain — registry, hydration, and protocol projections. */
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
