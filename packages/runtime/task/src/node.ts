/**
 * @canonical/task/node — the node-touching interpreters.
 *
 * The production interpreter executes effects against the real filesystem,
 * shell, and prompts, so it imports `node:fs/promises`, `node:path`, and
 * `node:child_process`; the undo interpreter drives it, and the preview
 * interpreter reads through it. They are split out of the base entry
 * (`@canonical/task`) so that constructing, composing, and mock-dry-running
 * tasks stays node-free and bundles for any target — only running a task
 * against the host, or previewing it against the host's real files, reaches
 * for Node.
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
// Preview Interpreter (honest dry-run: reads real, writes recorded — the
// production preview behind `--dry-run`/plan-first; `dryRun` in the base entry
// stays the node-free MOCK for tests)
// =============================================================================

export type { PreviewOptions } from "./lib/preview-interpreter.js";
export { runPreview } from "./lib/preview-interpreter.js";

// =============================================================================
// Undo Interpreter (collection is node-free and lives in the base entry —
// `collectUndos` ships from `@canonical/task`; only execution lives here)
// =============================================================================

export type { UndoResult } from "./lib/undo-interpreter.js";
export { runUndo } from "./lib/undo-interpreter.js";
