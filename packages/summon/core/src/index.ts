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
// Generator Types
// =============================================================================

export type {
  AnyGenerator,
  GeneratorDefinition,
  GeneratorMeta,
  PromptDefinition,
} from "./types.js";

// =============================================================================
// Stamps (generated file stamp comments)
// =============================================================================

export type { RunTaskWithStampOptions, StampConfig } from "./stamp.js";
export { applyStamp, runTaskWithStamp } from "./stamp.js";

// =============================================================================
// Templates
// =============================================================================

export type {
  StampOptions,
  TemplateDirOptions,
  TemplateOptions,
  TemplatingEngine,
} from "./template.js";
export {
  ejsEngine,
  generateStamp,
  generatorComment,
  generatorHtmlComment,
  prependStamp,
  renderFile,
  renderString,
  renderStringAsync,
  template,
  templateDir,
  templateHelpers,
  withHelpers,
} from "./template.js";

// =============================================================================
// CLI Types (for generator authors)
// =============================================================================

export type { ForbidReserved, ReservedOption } from "./cli-types.js";

// =============================================================================
// Discovery (generator tree algorithm + types)
// =============================================================================

export { default as discoverGeneratorTree } from "./discovery/discoverGeneratorTree.js";
export { generatorCache } from "./discovery/generatorCache.js";
export type { GeneratorNode, GeneratorOrigin } from "./discovery/types.js";
