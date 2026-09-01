/**
 * `@canonical/summon-core/projection` — the UI-free command-surface DATA seam.
 *
 * Everything a CLI derives from `GeneratorDefinition.prompts` lives here:
 * flag shapes, answer extraction, defaults/completeness arithmetic, the
 * usage-error structures and their parity rendering, and grouped help. Both
 * binaries consume it — the summon bin at its root, pragma mounted under
 * `create` — so the two surfaces cannot drift. The Commander ADAPTER — the
 * registration path, the outcome sink, `emitToProcess` — lives beside it at
 * `@canonical/summon-core/projection/commander`.
 *
 * IMPORT DISCIPLINE (pinned by `lazyGraph.test.ts`): this subpath is pure and
 * parser-agnostic — its runtime graph reaches ZERO bare dependencies (Node
 * built-ins only), never commander (not even as types), never react/ink/ejs/
 * chalk/@canonical/task, and never the summon-core main barrel — so a host
 * may import it statically on its `--help`/`__complete` fast path.
 */

export {
  applyDefaults,
  explicitAnswersComplete,
  hasAllRequiredAnswers,
  pendingPrompts,
} from "./answers.js";
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
export { buildOptionGroups, renderGroupedHelp } from "./groupedHelp.js";
export { default as toKebabCase } from "./kebab.js";
export { default as projectGenerator } from "./projectGenerator.js";
export type {
  CommandEntry,
  HostFlags,
  OptionInfo,
  ProjectedPrompt,
  PromptLike,
  SurfaceCommand,
  SurfaceGenerator,
} from "./types.js";
export type { UsageError, UsageKind } from "./usage.js";
export {
  excessPositionalError,
  renderUsageError,
  unknownSegmentError,
} from "./usage.js";
