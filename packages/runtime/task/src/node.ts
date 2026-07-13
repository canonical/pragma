/**
 * @canonical/task/node — the node-touching interpreters.
 *
 * The production interpreter executes effects against the real filesystem,
 * shell, and prompts, so it imports `node:fs/promises`, `node:path`, and
 * `node:child_process`; the undo interpreter drives it. They are split out of
 * the base entry (`@canonical/task`) so that constructing, composing, and
 * dry-running tasks stays node-free and bundles for any target — only actually
 * *running* a task against the host reaches for Node.
 *
 * @module node
 */

// =============================================================================
// Production Interpreter
// =============================================================================

export type { RunTaskOptions } from "./lib/interpreter.js";
export {
  executeEffect,
  run,
  runTask,
  TaskExecutionError,
} from "./lib/interpreter.js";

// =============================================================================
// Undo Interpreter (collection is node-free and lives in the base entry —
// `collectUndos` ships from `@canonical/task`; only execution lives here)
// =============================================================================

export type { UndoResult } from "./lib/undo-interpreter.js";
export { runUndo } from "./lib/undo-interpreter.js";
