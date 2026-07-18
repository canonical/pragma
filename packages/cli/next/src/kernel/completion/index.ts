/**
 * Completion kernel barrel — the static script emitter and the dynamic
 * `__complete` resolver, both driven off the grammar so the two tiers agree.
 */

export type { CompletionModel, EntityReader } from "./complete.js";
export {
  buildCompletionModel,
  COMPLETION_GLOBAL_FLAGS,
  complete,
  runComplete,
} from "./complete.js";
export type { Shell } from "./emitScripts.js";
export { emitScripts } from "./emitScripts.js";
export { createIndexEntityReader } from "./entitySource.js";
export { bashScript, fishScript, zshScript } from "./templates.js";
