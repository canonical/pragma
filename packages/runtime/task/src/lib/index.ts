/**
 * The node-free half of the task framework: the algebra, and nothing that runs it.
 *
 * Every module gathered here describes work rather than performing it — the
 * Task monad and its builders, the effect descriptors they are made of, the
 * primitives and combinators that compose them, and the mock interpreters that
 * walk a task tree without a host. That shared property is what makes them one
 * surface: none of them reaches for a filesystem, a shell, or a terminal, so
 * this barrel bundles for any target, and `@canonical/task`'s base entry
 * re-exports it wholesale.
 *
 * The node-touching interpreters live beside these files but deliberately
 * outside this barrel. Routing them through it would pull `node:fs` and
 * `node:child_process` into the import closure of every consumer of the base
 * entry — the property `src/index.node-free.test.ts` exists to defend. They
 * are published from `src/node.ts` (`@canonical/task/node`) instead.
 */

// =============================================================================
// Core Types
// =============================================================================

export type {
  BaseErrorCode,
  ConfirmPrompt,
  DryRunResult,
  Effect,
  ExecResult,
  LogLevel,
  MultiselectPrompt,
  PromptQuestion,
  PromptQuestionBase,
  SelectPrompt,
  Task,
  TaskError,
  TaskEvent,
  TextPrompt,
  TraceResult,
  TraceSpan,
  UndoTask,
} from "./types.js";

// =============================================================================
// Task Monad
// =============================================================================

export type { TaskGen } from "./task.js";
export {
  $,
  ap,
  effect,
  fail,
  failWith,
  flatMap,
  gen,
  hasEffects,
  isFailed,
  isPure,
  map,
  mapError,
  of,
  pure,
  recover,
  TaskBuilder,
  task,
} from "./task.js";

// =============================================================================
// Effects
// =============================================================================

export {
  appendFileEffect,
  copyDirectoryEffect,
  copyFileEffect,
  deleteDirectoryEffect,
  deleteFileEffect,
  describeEffect,
  execEffect,
  existsEffect,
  getAffectedPaths,
  globEffect,
  isWriteEffect,
  logEffect,
  makeDirEffect,
  parallelEffect,
  promptEffect,
  raceEffect,
  readContextEffect,
  readFileEffect,
  symlinkEffect,
  transformFileEffect,
  writeContextEffect,
  writeFileEffect,
} from "./effect.js";

// =============================================================================
// Primitives
// =============================================================================

export type { SortFileLinesOptions } from "./primitives.js";
export {
  appendFile,
  copyDirectory,
  copyFile,
  debug,
  deleteDirectory,
  deleteFile,
  error,
  exec,
  execSimple,
  exists,
  getContext,
  glob,
  info,
  log,
  mkdir,
  noop,
  prompt,
  promptConfirm,
  promptMultiselect,
  promptSelect,
  promptText,
  readFile,
  setContext,
  sortFileLines,
  succeed,
  symlink,
  transformFile,
  warn,
  withContext,
  writeFile,
} from "./primitives.js";

// =============================================================================
// Combinators
// =============================================================================

export {
  attempt,
  bracket,
  delay,
  ensure,
  fold,
  ifElse,
  ifElseM,
  optional,
  orElse,
  parallel,
  parallelN,
  race,
  retry,
  retryWithBackoff,
  sequence,
  sequence_,
  switchMap,
  tap,
  tapError,
  timeout,
  traverse,
  traverse_,
  unless,
  when,
  whenM,
  zip,
  zip3,
} from "./combinators.js";

// =============================================================================
// Dry-Run (node-free testing interpreters)
// =============================================================================

export {
  assertEffects,
  assertFileWrites,
  collectEffects,
  countEffects,
  dryRun,
  dryRunWith,
  expectTask,
  filterEffects,
  getAffectedFiles,
  getFileWrites,
  mockEffect,
} from "./dry-run.js";

// =============================================================================
// Undo collection (node-free — walks the tree with mocked effects; executing
// the collected undos is `runUndo`'s job, in `@canonical/task/node`)
// =============================================================================

export type { CollectUndosOptions } from "./undo.js";
export { collectUndos } from "./undo.js";

// =============================================================================
// Execution error (thrown by the interpreters; node-free, so it lives here in
// the base — catch it whether you run tasks or dry-run them)
// =============================================================================

export { TaskExecutionError } from "./errors.js";

// =============================================================================
// Undo Options (re-exported from effect for convenience)
// =============================================================================

export type { UndoOptions } from "./effect.js";
