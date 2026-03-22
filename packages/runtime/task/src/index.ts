/**
 * @canonical/task — A monadic effect framework for composable, testable,
 * dry-runnable CLI operations.
 *
 * @packageDocumentation
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
} from "./lib/types.js";

// =============================================================================
// Task Monad
// =============================================================================

export type { TaskGen } from "./lib/task.js";
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
} from "./lib/task.js";

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
  writeContextEffect,
  writeFileEffect,
} from "./lib/effect.js";

// =============================================================================
// Primitives
// =============================================================================

export type { SortFileLinesOptions } from "./lib/primitives.js";
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
  warn,
  withContext,
  writeFile,
} from "./lib/primitives.js";

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
} from "./lib/combinators.js";

// =============================================================================
// Interpreter
// =============================================================================

export type { RunTaskOptions } from "./lib/interpreter.js";
export {
  executeEffect,
  run,
  runTask,
  TaskExecutionError,
} from "./lib/interpreter.js";

// =============================================================================
// Dry-Run
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
} from "./lib/dry-run.js";

// =============================================================================
// Undo Interpreter
// =============================================================================

export type { UndoResult } from "./lib/undo-interpreter.js";
export { collectUndos, runUndo } from "./lib/undo-interpreter.js";

// =============================================================================
// Undo Options (re-exported from effect for convenience)
// =============================================================================

export type { UndoOptions } from "./lib/effect.js";
