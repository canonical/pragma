/**
 * @module cli-framework
 *
 * Shared CLI machinery for pragma and summon binaries.
 * Provides CommandDefinition as the universal command unit, Commander.js
 * registration, output adapters, completion infrastructure, and help
 * text formatting.
 */

// =============================================================================
// Core Types
// =============================================================================

export type {
  ArgCompleters,
  CommandContext,
  CommandDefinition,
  CommandExitResult,
  CommandInteractiveResult,
  CommandMeta,
  CommandOutputResult,
  CommandResult,
  Completer,
  CompletionResult,
  CompletionTree,
  GlobalFlags,
  InteractiveGenerator,
  InteractiveOptions,
  InteractiveSpec,
  OutputAdapter,
  ParameterDefinition,
  RenderMode,
  RenderPair,
  VerbCompletions,
} from "./lib/types.js";

// =============================================================================
// Result Constructors
// =============================================================================

export { default as createExitResult } from "./lib/createExitResult.js";
export { default as createInteractiveResult } from "./lib/createInteractiveResult.js";
export { default as createOutputResult } from "./lib/createOutputResult.js";

// =============================================================================
// Commander Registration
// =============================================================================

export {
  convertParameterToFlag,
  default as registerAll,
  extractParams,
} from "./lib/registerAll.js";

// =============================================================================
// Output Adapter
// =============================================================================

export {
  default as createOutputAdapter,
  detectRenderMode,
} from "./lib/createOutputAdapter.js";

// =============================================================================
// Completions
// =============================================================================

export { buildCompleters, resolveCompletion } from "./lib/completions.js";

// =============================================================================
// Help Formatting
// =============================================================================

export {
  formatHelp,
  formatLlmHelp,
  formatNounHelp,
  formatVerbHelp,
} from "./lib/help.js";
