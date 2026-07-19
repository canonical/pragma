/**
 * Summon - A Monadic Task-Centric Code Generator Framework
 *
 * The effect framework (Task, Effect, combinators, primitives, interpreter,
 * dry-run) lives in @canonical/task. This package provides the generation
 * layer on top: generator definitions, templates, stamps, and CLI types.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export type {
  AnyGenerator,
  ForbidReserved,
  GeneratorDefinition,
  GeneratorMeta,
  PromptDefinition,
  ReservedOption,
  StampConfig,
} from "./types/index.js";

// =============================================================================
// Stamps (generated file stamp comments)
// =============================================================================

export type { RunTaskWithStampOptions } from "./stamp/index.js";
export {
  applyStamp,
  createGeneratorStamp,
  createStampOnEffectStart,
  runTaskWithStamp,
} from "./stamp/index.js";

// =============================================================================
// The summon↔pragma seam: execute() + answer collection/validation
// =============================================================================

export type {
  AnswerablePrompt,
  ExecuteContext,
  GeneratorResult,
} from "./execute/index.js";
export {
  CONFIRM_ANSWER_KEY,
  collectAnswers,
  execute,
  GENERATOR_CANCELLED,
  GENERATOR_INVALID_ANSWER,
  validateAnswers,
} from "./execute/index.js";

// =============================================================================
// Prompt strategies (the injected UI seam). NOTE: `inkPrompt` reaches its React
// UI ONLY via a dynamic import — importing this barrel loads no ink/react.
// =============================================================================

export type {
  ConfirmPrompt,
  InkPromptOptions,
  InkSession,
  MultiselectPrompt,
  PromptEffect,
  PromptHandler,
  PromptQuestion,
  SelectPrompt,
  TextPrompt,
} from "./prompt/index.js";
export {
  answerPromptWithDefaults,
  autoPrompt,
  inkPrompt,
  MISSING_REQUIRED_ANSWER,
  mcpPrompt,
  missingRequiredError,
} from "./prompt/index.js";

// =============================================================================
// The UI-free execution core + effect formatting
// =============================================================================

export {
  buildReplayCommand,
  formatContentPreview,
  formatEffectLine,
  formatEffectWithContent,
  formatLlmHelp,
  formatLlmJson,
  formatLlmMarkdown,
  getActionColor,
  getActionLabel,
  getEffectPayload,
  getLanguageHint,
  getLlmActionLabel,
  getLlmEffectPath,
  isVisibleEffect,
} from "./format/index.js";
export type { RunGeneratorTaskOptions } from "./run/index.js";
export { runGeneratorTask } from "./run/index.js";

// =============================================================================
// Templates
// =============================================================================

export type {
  TemplateDirOptions,
  TemplateOptions,
  TemplatingEngine,
} from "./template/index.js";
export {
  ejsEngine,
  generateStamp,
  generatorComment,
  getCommentStyle,
  prependStamp,
  renderFile,
  renderString,
  renderStringAsync,
  template,
  templateDir,
  templateHelpers,
  withHelpers,
} from "./template/index.js";

// =============================================================================
// Discovery (generator tree algorithm + types)
// =============================================================================

export { default as discoverGeneratorTree } from "./discovery/discoverGeneratorTree.js";
export { generatorCache } from "./discovery/generatorCache.js";
export type { GeneratorNode, GeneratorOrigin } from "./discovery/types.js";
