/**
 * `@canonical/summon-core/projection` — the UI-free command-surface projection.
 *
 * Everything a CLI derives from `GeneratorDefinition.prompts` lives here:
 * flag shapes, answer extraction, defaults/completeness arithmetic, grouped
 * help, barrel building, and Commander registration. Both binaries consume it
 * — the summon bin at its root, pragma mounted under `create` — so the two
 * surfaces cannot drift.
 *
 * IMPORT DISCIPLINE (pinned by `lazyGraph.test.ts`): this subpath's runtime
 * graph reaches only `commander` and Node built-ins — never react/ink/ejs/
 * chalk/@canonical/task, and never the summon-core main barrel — so a host may
 * import it statically on its `--help`/`__complete` fast path.
 */

export {
  applyDefaults,
  explicitAnswersComplete,
  hasAllRequiredAnswers,
  pendingPrompts,
} from "./answers.js";
export type { BuildCommandBarrelOptions } from "./buildCommandBarrel.js";
export { default as buildCommandBarrel } from "./buildCommandBarrel.js";
export { default as buildOptionInfo } from "./buildOptionInfo.js";
export type {
  InteractionDecision,
  InteractionInput,
  InteractionMode,
} from "./decideInteraction.js";
export {
  decideInteraction,
  missingExplicitFlags,
  refusalMessage,
} from "./decideInteraction.js";
export { default as extractAnswers } from "./extractAnswers.js";
export {
  buildOptionGroups,
  configureGroupedHelp,
  formatGroupedHelp,
} from "./groupedHelp.js";
export { default as toKebabCase } from "./kebab.js";
export { default as projectGenerator } from "./projectGenerator.js";
export type {
  GeneratorCliHost,
  UsageErrorDetail,
  UsageErrorKind,
} from "./registerGeneratorCommand.js";
export {
  default as registerGeneratorCommands,
  excessArgumentMessage,
  splitGeneratorActionArgs,
} from "./registerGeneratorCommand.js";
export type {
  CommandEntry,
  HostFlags,
  OptionInfo,
  ProjectedPrompt,
  PromptLike,
  SurfaceCommand,
  SurfaceGenerator,
} from "./types.js";
