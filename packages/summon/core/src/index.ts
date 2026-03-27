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
  runTaskWithStamp,
} from "./stamp/index.js";

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
